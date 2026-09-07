/**
 * Netlify Background Function (`config.background: true` makes Netlify answer
 * 202 immediately and run the handler async, with automatic invocation
 * retries): email Chris about a lead. Three callers:
 *
 *   - submit-lead, right after a Supabase insert (kind "new") or after folding a
 *     website resubmission into an existing lead (kind "merged").
 *   - portal-ops correspondence-append, when a text or voicemail lands on a lead
 *     he already has (kind "update", with the new inbound entries).
 *
 * This is also where the suggested reply is drafted (one OpenRouter call, off
 * the visitor's request path) and stored in raw.draft_reply, only if Chris has
 * not already saved one. The draft goes into the email's reply buttons, never
 * its body (see lead-notify.ts).
 *
 * raw.notified_at is written at the START of every send. correspondence-append
 * uses it to skip entries that this email already covers, so a brand-new
 * voicemail lead produces one email, not a "new lead" and an "update".
 *
 * Internal-only: the caller must present the Supabase secret in
 * x-internal-auth. Both sites read the same env var and it never reaches the
 * browser, so a random visitor can't use this endpoint to send Chris
 * fabricated lead emails. Always answers 200 once past auth: a non-200 makes
 * Netlify retry a background function, which would double-send.
 */

import { draftReply, type DraftResult } from "../lib/draft-reply";
import { mergeRaw, patchLead, readLead, rawStr, type CorrespondenceEntry } from "../lib/lead-db";
import { emailChris, fallbackTopic, type LeadPayload, type NotifyKind } from "../lib/lead-notify";

export const config = { background: true };

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

type Body = {
  payload?: LeadPayload;
  id?: string;
  merged?: boolean;
  update?: boolean;
  entries?: CorrespondenceEntry[];
};

export default async (request: Request): Promise<Response> => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret || request.headers.get("x-internal-auth") !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const now = new Date();
  const id = body.id;
  const kind: NotifyKind = body.update ? "update" : body.merged ? "merged" : "new";

  try {
    const lead = id ? await readLead(secret, id) : null;
    if (kind === "update" && (!lead || !Array.isArray(body.entries) || !body.entries.length)) {
      console.log("notify-lead: update with nothing to send", JSON.stringify({ id }));
      return ok({ ok: true, skipped: "no entries" });
    }

    // The payload for an update is the lead itself; submit-lead sends the
    // submission for new/merged.
    const payload: LeadPayload = body.payload ?? {
      name: lead?.name || undefined,
      email: lead?.email || undefined,
      phone: lead?.phone || undefined,
      address: lead?.address || undefined,
      message: lead?.message || undefined,
      channel: lead?.channel,
    };

    // Stamp first so correspondence-append can tell what this email covers.
    if (id) await mergeRaw(secret, id, { notified_at: now.toISOString() });

    // Draft: reuse a stored one; generate only while the lead is unanswered.
    let draft: DraftResult | null = null;
    const stored = rawStr(lead?.raw, "draft_reply");
    if (stored) {
      draft = { draft: stored, topic: rawStr(lead?.raw, "draft_topic"), caller_name: null };
    } else if (!lead || lead.stage === "new") {
      draft = await draftReply(
        {
          name: lead?.name || payload.name,
          address: lead?.address || payload.address,
          project_type: payload.project_type || rawStr(lead?.raw, "project_type"),
          timeline: payload.timeline || rawStr(lead?.raw, "timeline"),
          message: kind === "update" ? body.entries!.map((e) => e.body).join("\n\n") : payload.message || lead?.message,
          channel: lead?.channel || payload.channel,
          gemini_notes: lead?.gemini_notes,
          prior_messages: lead?.correspondence?.length || 0,
        },
        { timeoutMs: 15000 }
      );
      if (draft && id) {
        const patch: Record<string, unknown> = { draft_reply: draft.draft, draft_at: now.toISOString() };
        if (draft.topic) patch.draft_topic = draft.topic;
        await mergeRaw(secret, id, patch, true);
        if (draft.caller_name && lead && !(lead.name || "").trim()) {
          await patchLead(secret, id, { name: draft.caller_name });
          lead.name = draft.caller_name;
        }
      }
    }

    // One topic per lead, so every email about it shares a subject and threads.
    const topic = rawStr(lead?.raw, "draft_topic") || draft?.topic || fallbackTopic(payload, lead);
    if (id && !rawStr(lead?.raw, "draft_topic")) await mergeRaw(secret, id, { draft_topic: topic }, true);

    const emailed = await emailChris(payload, id, { lead, draft, kind, entries: body.entries, origin, topic, now });
    // A background function's response body is discarded, so the function log is
    // the only place to see whether the email went out.
    console.log("notify-lead result:", JSON.stringify({ id, kind, emailed, drafted: Boolean(draft) }));
    return ok({ ok: true, emailed });
  } catch (err) {
    console.error("notify-lead threw:", err);
    return ok({ ok: false });
  }
};
