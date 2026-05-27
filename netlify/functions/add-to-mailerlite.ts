/**
 * Netlify Function: add a contact-form submission to MailerLite as a subscriber
 * in the "Portal Leads" group, which triggers the 5-email nurture automation.
 *
 * Wiring: Contact.tsx calls this AFTER a successful Web3Forms submission.
 * Web3Forms remains the source of truth for Chris's notification email + GA4
 * attribution; this function is purely the MailerLite-add side of the lead flow.
 *
 * Server-side because the MailerLite API key (process.env.MAILERLITE_API_KEY)
 * stays out of the browser bundle. The key authorizes "add subscriber + tag"
 * calls; if it leaked client-side, anyone could spam the Portal MailerLite
 * account.
 *
 * Failure mode: if MailerLite rejects the call for any reason (rate limit,
 * downtime, invalid email), we log + return a non-2xx, but the caller in
 * Contact.tsx does not surface the error to the user — they've already seen
 * the Web3Forms success state and Chris's notification email is already in
 * flight. Missing MailerLite adds are recoverable from Web3Forms logs.
 */

// Static config — group ID for "Portal Leads" in MailerLite.
// Not sensitive (it's just an identifier). Lives in code so the function
// doesn't need a second env var.
const PORTAL_LEADS_GROUP_ID = "188571502406272165";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (request: Request): Promise<Response> => {
  // CORS preflight (browsers send this before cross-origin POSTs).
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    console.error("MAILERLITE_API_KEY env var is missing");
    return new Response(
      JSON.stringify({ error: "Server config missing" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  let payload: {
    name?: string;
    email?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const email = (payload.email || "").trim();
  if (!email || !email.includes("@")) {
    return new Response(
      JSON.stringify({ error: "Email required" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Build MailerLite payload. Stick to standard fields (name) + groups for v1.
  // UTM attribution stays in Web3Forms email + GA4 events — adding UTM custom
  // fields to MailerLite would require pre-creating them via the dashboard;
  // not worth the operational overhead until we have a segmentation use case.
  const mlBody = {
    email,
    fields: {
      name: (payload.name || "").trim(),
    },
    groups: [PORTAL_LEADS_GROUP_ID],
    // Resubscribe = true: if the email already exists in MailerLite (e.g., a
    // returning lead), MailerLite will re-add them to the group + re-fire the
    // automation. That matches what we want — every form submit re-engages.
    resubscribe: true,
  };

  try {
    const mlResponse = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(mlBody),
    });

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      console.error("MailerLite API error:", mlResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "MailerLite call failed",
          status: mlResponse.status,
        }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const data = await mlResponse.json();
    return new Response(
      JSON.stringify({ ok: true, subscriber_id: data?.data?.id }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("MailerLite fetch threw:", err);
    return new Response(
      JSON.stringify({ error: "Network error reaching MailerLite" }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
};
