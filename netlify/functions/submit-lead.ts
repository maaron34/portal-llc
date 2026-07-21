/**
 * Netlify Function: capture a website lead to the Supabase `leads` table — the
 * canonical system-of-record — then best-effort email Chris a lead notification
 * with a paste-ready reply draft (via OpenRouter) and vCard link. A failed
 * draft/email never blocks capture.
 *
 * Wiring: Contact.tsx and LandingPage.tsx call this fire-and-forget on submit.
 *
 * Email goes through Resend (RESEND_API_KEY), NOT Web3Forms: Web3Forms rejects
 * server-side API calls on the free tier ("Pro plan is required") and flags
 * accounts that try — which silently killed all lead emails in July 2026 while
 * Supabase capture kept working. If RESEND_API_KEY is unset, capture still
 * works and the email is skipped.
 *
 * Server-side because the Supabase SECRET key (process.env.SUPABASE_SECRET_KEY)
 * must never reach the browser bundle — it bypasses row-level security and can
 * read/write every row. The public project URL is safe to hardcode.
 *
 * Failure mode: the client calls this fire-and-forget, so a failure here never
 * blocks the user's success state.
 */

const SUPABASE_URL = "https://tldsueyauxlctrywnfed.supabase.co";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";
// Where lead notifications go. Env override so QA can redirect without a code change.
const NOTIFY_TO = process.env.LEAD_NOTIFY_TO || "chris@buildwithportal.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type LeadPayload = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  message?: string;
  lead_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  http_referrer?: string;
  landing_page?: string;
  channel?: string;
  // Landing-page extras (stored in `raw`, used to personalize the draft).
  project_type?: string;
  timeline?: string;
  owner_status?: string;
  source?: string;
  // When true, generate the reply draft only — no insert, no email (QA hook).
  preview?: boolean;
};

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

/**
 * Draft a short, paste-ready reply for Chris to send a new lead — in his voice,
 * asking for what he needs to estimate (photos, rough dimensions, site access).
 * Never prices. Returns null if OpenRouter is unconfigured or errors, since a
 * failed draft must never block lead capture.
 */
async function draftReply(payload: LeadPayload): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const lead = [
    payload.name ? `Name: ${payload.name}` : "",
    payload.address ? `Address: ${payload.address}` : "",
    payload.project_type ? `Project type: ${payload.project_type}` : "",
    payload.timeline ? `Timeline: ${payload.timeline}` : "",
    payload.message ? `What they wrote: ${payload.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const system =
    "You draft a short reply that Chris, owner of Portal (a Seattle concrete " +
    "contractor), will send to a brand-new lead. Goal: thank them, reference " +
    "their specific project, and ask for exactly what Chris needs to give an " +
    "accurate estimate — clear photos of the area, rough dimensions (length x " +
    "width, plus thickness or height if they know it), and site access details " +
    "(driveway/gate width, slope, anything blocking a pour). Warm but direct, " +
    "first person as Chris, 3-5 sentences. Never quote a price or invent " +
    "details. Output ONLY the reply body — no subject line, no bracketed " +
    "placeholders — and sign off as Chris.";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 400,
        temperature: 0.6,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `New lead:\n${lead || "(no details provided)"}` },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error("OpenRouter draft error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      console.error("OpenRouter returned no draft text:", JSON.stringify(data).slice(0, 500));
      return null;
    }
    return text.trim();
  } catch (err) {
    console.error("OpenRouter draft threw:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Email Chris the lead notification: lead details, a ready-to-paste reply draft
 * (when the LLM produced one), and a tap-to-save vCard link. One email per
 * lead. Sent via Resend from our own domain so delivery doesn't depend on a
 * third-party form relay. Reply-To is the lead so Chris can just hit reply and
 * paste the draft. Best-effort: skipped when RESEND_API_KEY is unset, and a
 * send failure is logged, never thrown.
 */
async function emailChris(payload: LeadPayload, draft: string | null, leadId?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const who = payload.name || payload.email || payload.phone || "a new lead";
  const vcardLink = leadId
    ? `https://buildwithportal.com/.netlify/functions/vcard?id=${leadId}`
    : "";
  const message = [
    payload.name ? `Name: ${payload.name}` : "",
    payload.email ? `Email: ${payload.email}` : "",
    payload.phone ? `Phone: ${payload.phone}` : "",
    payload.address ? `Address: ${payload.address}` : "",
    payload.project_type ? `Project: ${payload.project_type}` : "",
    payload.timeline ? `Timeline: ${payload.timeline}` : "",
    payload.message ? `Message: ${payload.message}` : "",
    payload.lead_source ? `Source: ${payload.lead_source}` : "",
    ...(draft ? ["", "Ready-to-send reply (hit reply and paste):", "", draft] : []),
    ...(vcardLink ? ["", `Add ${who} to your contacts (tap on your phone): ${vcardLink}`] : []),
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Portal Leads <leads@buildwithportal.com>",
        to: [NOTIFY_TO],
        reply_to: payload.email || undefined,
        subject: `New lead: ${who}${payload.lead_source ? ` (${payload.lead_source})` : ""}`,
        text: message,
      }),
    });
    if (!res.ok) {
      console.error("Resend send failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend send threw:", err);
    return false;
  }
}

/**
 * Screen a website-form submission: real customer lead, or a vendor pitch
 * (SEO/marketing/VA spam)? Reuses the classify-sms function. Fail-open: any error
 * or uncertainty returns false (treated as a lead) so a real one is never dropped.
 */
async function isVendorSpam(text: string, from?: string): Promise<boolean> {
  try {
    const r = await fetch("https://buildwithportal.com/.netlify/functions/classify-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, from }),
    });
    if (!r.ok) return false;
    const v = (await r.json()) as { lead?: boolean; confidence?: number };
    return v.lead === false && (v.confidence ?? 0) >= 0.7;
  } catch {
    return false;
  }
}

export default async (request: Request): Promise<Response> => {
  // CORS preflight (browsers send this before cross-origin POSTs).
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    console.error("SUPABASE_SECRET_KEY env var is missing");
    return json({ error: "Server config missing" }, 500);
  }

  // Cap payload size (a lead form is well under 50 KB) so the open endpoint
  // can't be used to exhaust function memory with a giant body.
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 50_000) {
    return json({ error: "Payload too large" }, 413);
  }

  let payload: LeadPayload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const email = (payload.email || "").trim();
  const name = (payload.name || "").trim();
  const phone = (payload.phone || "").trim();
  // Require at least a name, email, or phone so direct hits from bots don't
  // store empty rows. QUO/SMS leads often arrive with only a phone number.
  if (!email && !name && !phone) {
    return json({ error: "Lead needs a name, email, or phone" }, 400);
  }

  // Preview mode: generate the reply draft only — no insert, no email. Lets us
  // QA draft quality without creating a row or emailing Chris.
  if (payload.preview) {
    return json({ preview: true, draft: await draftReply(payload) }, 200);
  }

  // Website-form submissions aren't pre-screened, so filter out vendor pitches
  // (SEO/marketing/VA spam) before they clutter the inbox or email Chris. Cron
  // sources (quo/email/voicemail) are already classified upstream.
  const isWebsite = !payload.channel || payload.channel === "website";
  const screenText = [payload.project_type, payload.timeline, payload.message, name].filter(Boolean).join("\n");
  const junk = isWebsite && screenText ? await isVendorSpam(screenText, email || phone) : false;

  // Map only known columns; stash the full payload in `raw` for anything we
  // didn't model yet. stage, created_at, and channel-default use table defaults.
  const row = {
    name: name || null,
    email: email || null,
    phone: phone || null,
    address: (payload.address || "").trim() || null,
    message: (payload.message || "").trim() || null,
    lead_source: payload.lead_source || null,
    utm_source: payload.utm_source || null,
    utm_medium: payload.utm_medium || null,
    utm_campaign: payload.utm_campaign || null,
    utm_term: payload.utm_term || null,
    utm_content: payload.utm_content || null,
    gclid: payload.gclid || null,
    fbclid: payload.fbclid || null,
    http_referrer: payload.http_referrer || null,
    landing_page: payload.landing_page || null,
    channel: payload.channel || "website",
    dedupe_key: email ? email.toLowerCase() : phone || null,
    raw: junk ? { ...payload, junk: true } : payload,
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    });

    // Duplicate dedupe_key (same email/phone already a lead, e.g. a concurrent
    // cron create or a form resubmit): return the existing lead's id instead of
    // creating a second, and skip the draft/email so we don't re-notify Chris.
    // Preserves the existing lead (no overwrite of its draft/stage/photos).
    if (res.status === 409 && row.dedupe_key) {
      const ex = await fetch(
        `${SUPABASE_URL}/rest/v1/leads?dedupe_key=eq.${encodeURIComponent(row.dedupe_key)}&select=id&limit=1`,
        { headers: { apikey: secret, Authorization: `Bearer ${secret}` } }
      );
      if (ex.ok) {
        const rows = (await ex.json()) as { id?: string }[];
        if (rows[0]?.id) return json({ ok: true, id: rows[0].id, duplicate: true }, 200);
      }
      return json({ ok: true, duplicate: true }, 200);
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Supabase insert error:", res.status, errorText);
      return json({ error: "Supabase insert failed", status: res.status }, 502);
    }

    const data = await res.json();
    const id = Array.isArray(data) ? data[0]?.id : data?.id;

    // Vendor spam is recorded (raw.junk) but stays out of the inbox — no draft,
    // no email to Chris.
    if (junk) return json({ ok: true, id, junk: true }, 200);

    // Best-effort: draft a paste-ready reply, then email Chris the lead — with
    // the draft when one was produced, without it otherwise. A failed draft
    // must never cost Chris the notification. Never fails capture.
    const draft = await draftReply(payload);
    const emailed = await emailChris(payload, draft, id);

    return json({ ok: true, id, drafted: Boolean(draft), emailed }, 200);
  } catch (err) {
    console.error("Supabase fetch threw:", err);
    return json({ error: "Network error reaching Supabase" }, 502);
  }
};
