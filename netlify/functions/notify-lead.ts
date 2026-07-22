/**
 * Netlify Background Function (`config.background: true` makes Netlify answer
 * 202 immediately and run the handler async, with automatic invocation
 * retries): email Chris for a freshly captured lead. Invoked server-to-server
 * by submit-lead right after the Supabase insert, so the visitor's submit
 * response isn't held hostage by email latency.
 *
 * Internal-only: the caller must present the Supabase secret in
 * x-internal-auth. Both functions read the same env var and it never reaches
 * the browser, so a random visitor can't use this endpoint to send Chris
 * fabricated lead emails.
 */

import { emailChris, type LeadPayload } from "../lib/lead-notify";

export const config = { background: true };

export default async (request: Request): Promise<Response> => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret || request.headers.get("x-internal-auth") !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let body: { payload?: LeadPayload; id?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
  if (!body.payload) {
    return new Response(JSON.stringify({ error: "Missing payload" }), { status: 400 });
  }

  const emailed = await emailChris(body.payload, body.id);
  // Log the outcome — a background function's response body is discarded, so
  // the function log is the only place to see whether the email went out.
  console.log("notify-lead result:", JSON.stringify({ id: body.id, emailed }));

  return new Response(JSON.stringify({ ok: true, emailed }), { status: 200 });
};
