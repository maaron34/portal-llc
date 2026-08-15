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
 *
 * `channel: "website"` matters: the classifier's default prompt is tuned for
 * cold SMS to the business line, where a contentless text really is spam. A form
 * on our own site is the opposite — the submitter typed a name, email and phone
 * to reach us, so a thin message ("Google", an address paste) is a customer who
 * didn't feel like writing, not a spammer. Judging those two the same way junked
 * four real Google Ads leads in July/August 2026.
 */
async function isVendorSpam(origin: string, text: string, from?: string): Promise<boolean> {
  try {
    // Same deploy, not the hardcoded production host. Pointing at production
    // meant a deploy preview screened its submissions with whatever prompt was
    // already live, so a change to the classifier could not be tested before
    // merging it — and every form submission took a round-trip out to the
    // public internet and back to reach a function sitting beside this one.
    const r = await fetch(`${origin}/.netlify/functions/classify-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, from, channel: "website" }),
    });
    if (!r.ok) return false;
    const v = (await r.json()) as { lead?: boolean; confidence?: number };
    return v.lead === false && (v.confidence ?? 0) >= 0.7;
  } catch {
    return false;
  }
}

/**
 * Last 10 digits of a phone number, or "" if it isn't a usable US number.
 * Collapses every format we actually receive — "+12067181940", "2067181940",
 * "(206) 718-1940", "206-718-1940" — onto one comparable key.
 */
function digits10(phone: string): string {
  const d = (phone || "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
}

type ExistingLead = {
  id: string;
  name: string | null;
  email: string | null;
  address: string | null;
  message: string | null;
  phone: string | null;
  raw: { junk?: unknown } | null;
};

/**
 * Find a lead already on file for this phone number, matching on the last 10
 * digits rather than the stored string.
 *
 * Why this exists: website leads are keyed by email and texted leads by phone,
 * so the same person reaching us both ways used to land as two records — the
 * form submission with their name and project, and a second, nameless one
 * holding the photos they texted. Chris then had a lead with no name and no
 * context sitting next to a lead with no photos, and no way to tell they were
 * the same job. QUO is our missed-call text-back service, so the same-person-
 * two-ways case is the normal path, not an edge case.
 *
 * Junk-flagged leads are skipped so a real inquiry never gets merged into a
 * dismissed one. Best effort: any failure returns null and we create a new lead
 * as before, which is the old behavior rather than a lost lead.
 */
async function findLeadByPhone(secret: string, phone: string): Promise<ExistingLead | null> {
  const key = digits10(phone);
  if (!key) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?phone=not.is.null&select=id,name,email,address,message,phone,raw` +
        `&order=created_at.desc&limit=500`,
      { headers: { apikey: secret, Authorization: `Bearer ${secret}` } }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as ExistingLead[];
    const matches = rows.filter((r) => digits10(r.phone || "") === key && !r.raw?.junk);
    // Prefer a record that already has a name over a bare one, then the most
    // recent (the query is ordered newest first). Where a form submission and a
    // texted-photo record both exist for one person, the named record is the
    // one carrying the project description, so it is the one to keep building
    // on — otherwise every later text would pile onto the anonymous record and
    // Chris would still be looking at a lead with no name.
    return matches.find((r) => (r.name || "").trim()) ?? matches[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Fold a new submission into the lead already on file for that phone.
 *
 * Only fills blanks — an existing name, email or address is never overwritten,
 * because the earlier record is usually the richer one (a form submission) and
 * the new arrival is usually a bare text. A genuinely new message is appended
 * with its date and channel instead of replacing what's there, so the lead page
 * reads as the history of the conversation: what they submitted, then what they
 * texted. Best effort — a failed patch still returns the matched id, so the
 * caller attaches photos and correspondence to the right lead either way.
 */
async function mergeIntoLead(secret: string, existing: ExistingLead, payload: LeadPayload): Promise<void> {
  const patch: Record<string, string> = {};
  const fill = (field: "name" | "email" | "address", value: string) => {
    if (value && !(existing[field] || "").trim()) patch[field] = value;
  };
  fill("name", (payload.name || "").trim());
  fill("email", (payload.email || "").trim());
  fill("address", (payload.address || "").trim());

  const incoming = (payload.message || "").trim();
  const current = (existing.message || "").trim();
  if (incoming && !current) {
    patch.message = incoming;
  } else if (incoming && !current.includes(incoming)) {
    const when = new Date().toISOString().slice(0, 10);
    const via = payload.channel && payload.channel !== "website" ? `via ${payload.channel}` : "via the website";
    patch.message = `${current}\n\n--- ${when}, ${via} ---\n${incoming}`;
  }

  if (!Object.keys(patch).length) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    });
  } catch {
    /* best effort — the id we return is what matters */
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
  // A click we paid for is never auto-junked. Vendors pitching us arrive direct
  // or via a scraped list; they don't come through a Google/Meta ad we're billed
  // for. Suppressing one of these costs us the click AND the job, so the bar for
  // a paid lead is a human deciding, not a classifier. (Four real Google Ads
  // leads were silently junked before this rule: two were address-only pastes,
  // two were one-word messages.)
  const paidClick = Boolean(payload.gclid || payload.fbclid || payload.utm_source);
  const screenText = [payload.project_type, payload.timeline, payload.message, name].filter(Boolean).join("\n");
  const origin = new URL(request.url).origin;
  const junk = isWebsite && screenText && !paidClick ? await isVendorSpam(origin, screenText, email || phone) : false;

  // Same person, second channel? Fold it into the lead already on file instead
  // of opening a nameless second one. Junk submissions skip this: they should
  // never touch a real lead's record.
  const existing = !junk && phone ? await findLeadByPhone(secret, phone) : null;
  if (existing) {
    await mergeIntoLead(secret, existing, payload);
    // A form submission still emails Chris even though no new lead was created:
    // someone filling in the form is asking for a reply, and the whole point of
    // merging is that he sees it against the context he already has. A texted
    // photo (no message) doesn't email — QUO already put that on his phone.
    if (isWebsite) {
      if (!(await queueNotify(origin, payload, existing.id))) await emailChris(payload, existing.id);
    }
    return json({ ok: true, id: existing.id, merged: true }, 200);
  }

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
