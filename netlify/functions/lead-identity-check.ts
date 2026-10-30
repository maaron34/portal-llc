/**
 * POST /.netlify/functions/lead-identity-check - what the identity step WOULD
 * fill and WOULD match for one lead, without writing anything. Passcode-gated
 * (Bearer OPS_PASSCODE). Body: { lead_id }. Exists because the OpenRouter key
 * lives only in Netlify, so the extractor cannot be dry-run from a laptop.
 */

import { authorized, json } from "../lib/http";
import { readLead, rawStr } from "../lib/lead-db";
import { extractIdentity, findMatch, identityPatch, inboundText, loadCandidates } from "../lib/lead-identity";
import { checkScam, locateChecked } from "../lib/lead-triage";

export default async (request: Request): Promise<Response> => {
  if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return json({ error: "Server config missing" }, 500);
  const body = (await request.json().catch(() => ({}))) as { lead_id?: string };
  const lead = body.lead_id ? await readLead(secret, body.lead_id) : null;
  if (!lead) return json({ error: "Lead not found" }, 404);
  const text = inboundText(lead);
  const found = await extractIdentity(text);
  const match = findMatch({ ...lead, raw: lead.raw as { junk?: unknown } }, await loadCandidates(secret, lead.id));
  const loc = await locateChecked((lead.address || "").trim() || rawStr(lead.raw, "city"));
  const area = loc.area;
  const street = /\d+\s+\S+/.test(lead.address || "");
  const scam = await checkScam(text, lead.phone, street, street && loc.checked ? Boolean(area) : null, { email: lead.email, files: Array.isArray(lead.raw?.files) ? lead.raw.files.length : 0 });
  return json({ text: text.slice(0, 300), found, area, scam, would_fill: found ? identityPatch(lead, found) : {}, match: match && { verdict: match.verdict, reason: match.reason, other: { id: match.other.id, name: match.other.name, channel: match.other.channel } } }, 200);
};
