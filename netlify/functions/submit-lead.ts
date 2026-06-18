/**
 * Netlify Function: capture a website lead to the Supabase `leads` table — the
 * canonical system-of-record — then best-effort draft a paste-ready reply (via
 * OpenRouter) and email it to Chris, separate from the site's existing
 * lead-notification email. A failed draft/email never blocks capture.
 *
 * Wiring: Contact.tsx and LandingPage.tsx call this fire-and-forget on submit,
 * in parallel with the existing Web3Forms email. Web3Forms still sends Chris's
 * notification; this makes the lead durable + queryable, and feeds the
 * forthcoming ops dashboard + Make orchestration (notify / vCard / photo scan).
 *
 * Server-side because the Supabase SECRET key (process.env.SUPABASE_SECRET_KEY)
 * must never reach the browser bundle — it bypasses row-level security and can
 * read/write every row. The public project URL is safe to hardcode.
 *
 * Failure mode: the client calls this fire-and-forget, so a failure here never
 * blocks the user's success state or Chris's email. Lost inserts are
 * recoverable from Web3Forms logs.
 */

const SUPABASE_URL = "https://tldsueyauxlctrywnfed.supabase.co";
const WEB3FORMS_KEY = "97c81447-a5dc-43a2-8880-542d83c80609";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";

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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
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
    clearTimeout(timeout);

    if (!res.ok) {
      console.error("OpenRouter draft error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch (err) {
    console.error("OpenRouter draft threw:", err);
    return null;
  }
}

/**
 * Email Chris a ready-to-paste reply for a new lead, via the same Web3Forms key
 * the site uses (delivers to Chris's configured inbox). Best-effort and
 * deliberately separate from the site's existing lead-notification email.
 */
async function emailDraftToChris(payload: LeadPayload, draft: string): Promise<void> {
  const who = payload.name || payload.email || "a new lead";
  const message = [
    `Ready-to-send reply for ${who}:`,
    "",
    draft,
    "",
    "----",
    payload.email ? `Email: ${payload.email}` : "",
    payload.phone ? `Phone: ${payload.phone}` : "",
    payload.address ? `Address: ${payload.address}` : "",
    payload.project_type ? `Project: ${payload.project_type}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: `Ready reply for ${who}`,
        from_name: "Portal Lead Assistant",
        message,
      }),
    });
  } catch (err) {
    console.error("Draft email send threw:", err);
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
  // Require at least a name or email so direct hits from bots don't store
  // empty rows.
  if (!email && !name) {
    return json({ error: "Lead needs at least a name or email" }, 400);
  }

  // Preview mode: generate the reply draft only — no insert, no email. Lets us
  // QA draft quality without creating a row or emailing Chris.
  if (payload.preview) {
    return json({ preview: true, draft: await draftReply(payload) }, 200);
  }

  // Map only known columns; stash the full payload in `raw` for anything we
  // didn't model yet. stage, created_at, and channel-default use table defaults.
  const row = {
    name: name || null,
    email: email || null,
    phone: (payload.phone || "").trim() || null,
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
    dedupe_key: email ? email.toLowerCase() : null,
    raw: payload,
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

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Supabase insert error:", res.status, errorText);
      return json({ error: "Supabase insert failed", status: res.status }, 502);
    }

    const data = await res.json();
    const id = Array.isArray(data) ? data[0]?.id : data?.id;

    // Best-effort: draft a paste-ready reply and email it to Chris, separate
    // from the site's existing lead-notification email. Never fails capture.
    const draft = await draftReply(payload);
    if (draft) await emailDraftToChris(payload, draft);

    return json({ ok: true, id, drafted: Boolean(draft) }, 200);
  } catch (err) {
    console.error("Supabase fetch threw:", err);
    return json({ error: "Network error reaching Supabase" }, 502);
  }
};
