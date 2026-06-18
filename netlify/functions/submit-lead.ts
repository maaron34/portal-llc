/**
 * Netlify Function: write a website lead to the Supabase `leads` table — the
 * canonical system-of-record for Portal's lead-to-cash flow.
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
};

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

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
    return json({ ok: true, id: Array.isArray(data) ? data[0]?.id : data?.id }, 200);
  } catch (err) {
    console.error("Supabase fetch threw:", err);
    return json({ error: "Network error reaching Supabase" }, 502);
  }
};
