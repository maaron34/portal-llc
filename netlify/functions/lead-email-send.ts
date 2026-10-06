/**
 * POST /.netlify/functions/lead-email-send - send the real lead email for one
 * lead to any address, for QA. Passcode-gated (Bearer OPS_PASSCODE). Body:
 * { lead_id, to }. Renders exactly what Chris would receive and sends it
 * through Resend, the same path as a real lead email, so a test shows what his
 * mail app shows. Links point at this deploy's origin. Nothing is written to
 * the lead.
 */

import { authorized, json } from "../lib/http";
import { readLead, rawStr } from "../lib/lead-db";
import { validEmail } from "../lib/lead-links";
import { renderLeadEmail, sendResendMessage } from "../lib/lead-notify";

export default async (request: Request): Promise<Response> => {
  if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret || !process.env.RESEND_API_KEY) return json({ error: "Server config missing" }, 500);
  const body = (await request.json().catch(() => ({}))) as { lead_id?: string; to?: string };
  const to = validEmail(body.to);
  if (!to || !body.lead_id) return json({ error: "lead_id and a valid to are required" }, 400);
  const lead = await readLead(secret, body.lead_id);
  if (!lead) return json({ error: "Lead not found" }, 404);
  const draft = rawStr(lead.raw, "draft_reply");
  const rendered = renderLeadEmail({ channel: lead.channel } as never, lead.id, {
    lead,
    draft: draft ? { draft, topic: rawStr(lead.raw, "draft_topic"), caller_name: null } : null,
    kind: "new",
    origin: new URL(request.url).origin,
  });
  const sent = await sendResendMessage({ ...rendered, to, subject: `QA: ${rendered.subject}` });
  return json({ ok: sent.ok }, sent.ok ? 200 : 502);
};
