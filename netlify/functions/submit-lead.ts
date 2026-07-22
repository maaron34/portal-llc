/**
 * Netlify Function: capture a website lead to the Supabase `leads` table — the
 * canonical system-of-record — then hand off to notify-lead, which
 * emails Chris a lead notification with a vCard link. A failed email never
 * blocks capture.
 *
 * Wiring: Contact.tsx, LandingPage.tsx, and Refer.tsx AWAIT this call and gate
 * their success UI on the response — if capture fails, the lead went nowhere
 * (there is no other relay anymore), so the form must show its error state
 * instead of a false thank-you. The email is queued to a background function
 * so the visitor only waits for classify + insert (~2s). If queueing fails, we
 * fall back to sending the email inline — slower for that one visitor, but
 * Chris never silently misses a lead.
 *
 * Server-side because the Supabase SECRET key (process.env.SUPABASE_SECRET_KEY)
 * must never reach the browser bundle — it bypasses row-level security and can
 * read/write every row. The public project URL is safe to hardcode.
 */

import { emailChris, type LeadPayload } from "../lib/lead-notify";

const SUPABASE_URL = "https://tldsueyauxlctrywnfed.supabase.co";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

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

/**
 * Hand the notification email (Resend) to the background function on this
 * same deploy. Netlify answers 202 before the handler runs,
 * so this await costs one local round-trip, not the whole notification.
 * Returns false on any failure so the caller can fall back to inline.
 */
async function queueNotify(origin: string, payload: LeadPayload, id?: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${origin}/.netlify/functions/notify-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-auth": process.env.SUPABASE_SECRET_KEY || "",
      },
      body: JSON.stringify({ payload, id }),
      signal: controller.signal,
    });
    if (!res.ok) console.error("notify-lead queue rejected:", res.status);
    return res.ok;
  } catch (err) {
    console.error("notify-lead queue failed:", err);
    return false;
  } finally {
    clearTimeout(timeout);
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

    // Vendor spam is recorded (raw.junk) but stays out of the inbox — no email
    // to Chris.
    if (junk) return json({ ok: true, id, junk: true }, 200);

    // Queue the email to the background function so the visitor gets their
    // success state now. Inline fallback if queueing fails (e.g. the plan tier
    // rejects background functions): slower, but Chris still gets the email.
    const origin = new URL(request.url).origin;
    if (await queueNotify(origin, payload, id)) {
      return json({ ok: true, id, notify: "queued" }, 200);
    }
    const emailed = await emailChris(payload, id);

    return json({ ok: true, id, emailed }, 200);
  } catch (err) {
    console.error("Supabase fetch threw:", err);
    return json({ error: "Network error reaching Supabase" }, 502);
  }
};
