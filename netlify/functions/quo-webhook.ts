/**
 * POST /.netlify/functions/quo-webhook?token=... — receive QUO (OpenPhone) live
 * events. Handles `message.received`: captures the text AND any texted photos
 * (the MMS media the REST API and email notifications both strip out) onto the
 * lead in real time. Reuses classify-sms / submit-lead / correspondence-append /
 * ingest-photo, so all the matching, dedupe, and storage logic lives in one place.
 *
 * Gated by an unguessable URL token (QUO_WEBHOOK_TOKEN). Idempotent: text dedups
 * by OpenPhone message id, photos dedup by the source message id in ingest-photo.
 * The 15-min QUO cron stays as a backup reconciler (same ids => no duplicates).
 */

const SITE = "https://buildwithportal.com/.netlify/functions";
const OPS = "https://portal-ops-dashboard.netlify.app/.netlify/functions";

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type QuoMessage = {
  id?: string;
  from?: string;
  to?: string[] | string;
  text?: string;
  direction?: string;
  createdAt?: string;
  media?: Array<{ url?: string; type?: string } | string>;
};

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  const token = new URL(request.url).searchParams.get("token");
  if (!process.env.QUO_WEBHOOK_TOKEN || token !== process.env.QUO_WEBHOOK_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }

  let event: { type?: string; data?: { object?: QuoMessage } | QuoMessage };
  try {
    event = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Only act on inbound messages; ack everything else so QUO doesn't retry.
  if (event?.type !== "message.received") return json({ ok: true, ignored: event?.type ?? null }, 200);

  const data = (event.data ?? {}) as { object?: QuoMessage } & QuoMessage;
  const msg: QuoMessage = (data.object ?? data) as QuoMessage;
  if (msg.direction && msg.direction !== "incoming") return json({ ok: true, skipped: "outgoing" }, 200);

  const from = (msg.from || "").trim();
  const text = (msg.text || "").trim();
  const media = Array.isArray(msg.media) ? msg.media : [];
  if (!from) return json({ ok: true, skipped: "no-from" }, 200);

  const passcode = process.env.OPS_PASSCODE || "";

  // A photo means it's almost certainly a real customer; otherwise classify the
  // text so we don't create leads from spam.
  let isLead = media.length > 0;
  if (!isLead && text) {
    try {
      const r = await fetch(`${SITE}/classify-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from }),
      });
      isLead = ((await r.json()) as { lead?: boolean })?.lead !== false;
    } catch {
      isLead = true; // fail open — never drop a real lead
    }
  }
  if (!isLead) return json({ ok: true, spam: true }, 200);

  // Match or create the lead by phone (submit-lead dedupes on dedupe_key and
  // returns the existing id on a duplicate, so this is safe to call every time).
  let leadId: string | null = null;
  try {
    const r = await fetch(`${SITE}/submit-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "quo", phone: from, message: text, lead_source: "quo" }),
    });
    leadId = ((await r.json()) as { id?: string })?.id ?? null;
  } catch {
    /* fall through */
  }
  if (!leadId) return json({ error: "Could not resolve lead" }, 502);

  // Append the inbound text to the timeline (msg-id dedup with the cron).
  if (text) {
    try {
      await fetch(`${OPS}/correspondence-append`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${passcode}` },
        body: JSON.stringify({
          lead_id: leadId,
          entries: [{ id: msg.id, type: "text", direction: "in", at: msg.createdAt, from, body: text, source: "quo-webhook" }],
        }),
      });
    } catch {
      /* best effort */
    }
  }

  // Download each texted photo and attach it to the lead.
  let photos = 0;
  for (let i = 0; i < media.length; i++) {
    const m = media[i];
    const url = typeof m === "string" ? m : m?.url;
    if (!url) continue;
    try {
      const headers = process.env.QUO_API_KEY ? { Authorization: process.env.QUO_API_KEY } : undefined;
      const imgRes = await fetch(url, headers ? { headers } : {});
      if (!imgRes.ok) continue;
      const ct = imgRes.headers.get("content-type") || "image/jpeg";
      const b64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
      const resp = await fetch(`${OPS}/ingest-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${passcode}` },
        body: JSON.stringify({
          lead_id: leadId,
          filename: `quo-${msg.id}-${i}.jpg`,
          content_base64: b64,
          content_type: ct,
          source: { from, message_id: `${msg.id}-${i}` },
        }),
      });
      if (resp.ok) photos++;
    } catch {
      /* skip this photo, keep going */
    }
  }

  return json({ ok: true, lead_id: leadId, photos, text: Boolean(text) }, 200);
};
