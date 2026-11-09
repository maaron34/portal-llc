/**
 * POST /.netlify/functions/lead-next { lead_id } - work out the next step on a
 * lead (lib/lead-next.ts) and save it as raw.next, which the CRM shows on the
 * lead and sorts the list by. portal-ops' correspondence-append calls this for
 * every new message; submit-lead calls it for a new web lead; a backfill calls
 * it per lead.
 *
 * Internal-only, like quote-extract: the caller presents the Supabase secret in
 * x-internal-auth. A background function, so callers get 202 at once.
 *
 * Stale-write guard: the lead is re-read just before saving, and the result is
 * dropped if a newer message arrived while the model was answering. The run
 * that message triggers will save the current answer instead.
 */

import { mergeRaw, patchLead, readLead } from "../lib/lead-db";
import { ownPhone } from "../lib/lead-identity";
import { digits10 } from "../lib/lead-links";
import { FAILED, readNext, realEntries, requestPrint } from "../lib/lead-next";

export const config = { background: true };

const reply = (body: unknown, status: number): Response => {
  console.log("lead-next:", JSON.stringify(body));
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

  // A phone number the customer typed in a later message (an email signature)
  // was only read when the lead was created, so 29 leads had none saved and a
  // later call or text from them would start a second record (daily check,
  // 2026-11-09). This runs on every new message, so fill the blank here.
  // Blanks only, and only when the customer wrote exactly one number.
  if (!digits10(lead.phone)) {
    const typed = ownPhone(lead);
    if (typed && (await patchLead(secret, lead.id, { phone: "+1" + typed }))) {
      await mergeRaw(secret, lead.id, { identity_filled: { phone: "+1" + typed, at: new Date().toISOString(), by: "lead-next" } });
      console.log("lead-next phone filled:", JSON.stringify({ id: lead.id }));
    }
  }

  const next = await readNext(lead);
  if (next === FAILED) return reply({ ok: false, lead_id: leadId, error: "model call failed; next step left as it was" }, 502);

  const fresh = await readLead(secret, lead.id);
  const newest = realEntries(fresh?.correspondence ?? []).at(-1);
  if ((newest?.id ?? null) !== next.based_on.id || requestPrint(fresh?.message) !== next.based_on.request) return reply({ ok: true, lead_id: leadId, stale: true }, 200);

  const saved = await mergeRaw(secret, lead.id, { next });
  return reply({ ok: saved, lead_id: leadId, action: next.action, next_step: next.next_step }, saved ? 200 : 502);
};
