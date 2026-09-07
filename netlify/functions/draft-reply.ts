/**
 * POST /.netlify/functions/draft-reply - a suggested reply for a lead, on demand.
 * Passcode-gated (the ops dashboard's "Generate draft" button calls this).
 *
 * Body is either lead fields { name?, email?, phone?, address?, project_type?,
 * timeline?, message?, channel? } or { lead_id, save?: true }, which reads the
 * lead and, with save, stores the draft in raw.draft_reply (only if none is
 * stored yet). Returns { draft, topic, caller_name }.
 *
 * This endpoint NEVER creates a lead. The dashboard used to post {preview:true}
 * to submit-lead for a draft; that branch was removed in PR #44, so every click
 * inserted a phantom lead and emailed Chris about it.
 */

import { draftReply } from "../lib/draft-reply";
import { UUID, mergeRaw, readLead, rawStr } from "../lib/lead-db";

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function authorized(request: Request): boolean {
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const expected = process.env.OPS_PASSCODE;
  return Boolean(expected) && provided === expected;
}

type Body = {
  lead_id?: string;
  save?: boolean;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  project_type?: string;
  timeline?: string;
  message?: string;
  channel?: string;
};

export default async (request: Request): Promise<Response> => {
  if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (body.lead_id) {
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!secret) return json({ error: "Server config missing" }, 500);
    if (!UUID.test(body.lead_id)) return json({ error: "Invalid lead_id" }, 400);
    const lead = await readLead(secret, body.lead_id);
    if (!lead) return json({ error: "Lead not found" }, 404);
    const draft = await draftReply(
      {
        name: lead.name,
        address: lead.address,
        project_type: rawStr(lead.raw, "project_type"),
        timeline: rawStr(lead.raw, "timeline"),
        message: lead.message,
        channel: lead.channel,
        gemini_notes: lead.gemini_notes,
        prior_messages: lead.correspondence.length,
      },
      { timeoutMs: 20000 }
    );
    if (!draft) return json({ error: "Draft service failed" }, 502);
    if (body.save) {
      const patch: Record<string, unknown> = { draft_reply: draft.draft, draft_at: new Date().toISOString() };
      if (draft.topic) patch.draft_topic = draft.topic;
      await mergeRaw(secret, lead.id, patch, true);
    }
    return json(draft, 200);
  }

  const draft = await draftReply(
    {
      name: body.name,
      email: body.email,
      phone: body.phone,
      address: body.address,
      project_type: body.project_type,
      timeline: body.timeline,
      message: body.message,
      channel: body.channel,
    },
    { timeoutMs: 20000 }
  );
  if (!draft) return json({ error: "Draft service failed" }, 502);
  return json(draft, 200);
};
