/**
 * POST /.netlify/functions/quote-extract { lead_id } - read the price Chris
 * quoted out of his own emails and texts on this lead (lib/quote-extract.ts)
 * and save it as raw.quoted_estimate, which the CRM shows at the top of the
 * lead. portal-ops' correspondence-append calls this whenever one of Chris's
 * messages lands on a lead; a one-off backfill calls it per lead.
 *
 * Re-reads the lead every time and keys the result to the message it came
 * from, so a re-run is harmless. A lead whose messages carry no price keeps
 * whatever quote it already had: an older quote stays until a newer one
 * replaces it.
 *
 * Internal-only, like notify-lead: the caller presents the Supabase secret in
 * x-internal-auth. A background function, so the caller gets 202 at once and
 * the model call never slows down the message append; the outcome is in the
 * function log.
 */

import { mergeRaw, readLead } from "../lib/lead-db";
import { FAILED, latestQuote } from "../lib/quote-extract";

export const config = { background: true };

const reply = (body: unknown, status: number): Response => {
  console.log("quote-extract:", JSON.stringify(body));
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
};

export default async (request: Request): Promise<Response> => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret || request.headers.get("x-internal-auth") !== secret) return reply({ error: "Unauthorized" }, 401);
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  let leadId = "";
  try {
    leadId = String(((await request.json()) as { lead_id?: unknown }).lead_id || "");
  } catch {
    return reply({ error: "Invalid JSON" }, 400);
  }

  const lead = await readLead(secret, leadId);
  if (!lead) return reply({ error: "Lead not found" }, 404);

  const found = await latestQuote(Array.isArray(lead.correspondence) ? lead.correspondence : []);
  if (found === FAILED) return reply({ ok: false, error: "model call failed; quote left as it was" }, 502);
  if (!found) return reply({ ok: true, quoted: false }, 200);

  const cur = lead.raw?.quoted_estimate as { message_id?: string; at?: string } | undefined;
  if (cur?.message_id === found.message_id) return reply({ ok: true, quoted: true, unchanged: true }, 200);
  // A quote with no readable date only fills an empty box.
  if (!found.at && cur) return reply({ ok: true, quoted: true, kept_dated: true }, 200);
  // Never let an older message replace a newer quote already on file.
  if (cur?.at && found.at && cur.at > found.at) return reply({ ok: true, quoted: true, kept_newer: true }, 200);

  // Re-check just before the write: another run for this lead may have saved
  // a newer quote while the model was answering.
  const fresh = await readLead(secret, lead.id);
  const now = fresh?.raw?.quoted_estimate as { at?: string } | undefined;
  if (now && !found.at) return reply({ ok: true, quoted: true, kept_dated: true }, 200);
  if (now?.at && found.at && now.at > found.at) return reply({ ok: true, quoted: true, kept_newer: true }, 200);
  const saved = await mergeRaw(secret, lead.id, { quoted_estimate: found });
  return reply({ ok: saved, quoted: true, summary: found.summary }, saved ? 200 : 502);
};
