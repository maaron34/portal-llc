/**
 * Netlify Background Function (`config.background: true` makes Netlify answer
 * 202 immediately and run the handler async, with automatic invocation
 * retries on a non-2xx): email Chris about a lead. Three callers:
 *
 *   - submit-lead, right after a Supabase insert (kind "new") or after folding a
 *     website resubmission into an existing lead (kind "merged").
 *   - portal-ops correspondence-append, when a text or voicemail arrives on a
 *     lead he already has (kind "update", with the new inbound entries).
 *
 * This is also where the suggested reply is drafted (one OpenRouter call, off
 * the visitor's request path) and stored in raw.draft_reply, only if Chris has
 * not already saved one. The draft goes into the email's reply buttons, never
 * its body (see lead-notify.ts).
 *
 * Writes, in order: one only-if-absent merge of {draft, topic, subject} before
 * the send (those are needed by every later email about the lead, and keeping
 * them stable is what threads the emails together), then raw.notified_at only
 * AFTER Resend accepted the email. A failed send leaves no stamp, so nothing
 * downstream ever treats an unsent email as sent.
 *
 * Internal-only: the caller must present the Supabase secret in
 * x-internal-auth. Both sites read the same env var and it never reaches the
 * browser, so a random visitor can't use this endpoint to send Chris
 * fabricated lead emails. Answers 200 after any send attempt (a retry would
 * double-send); answers 503 only when nothing was attempted because the lead
 * could not be read, which is exactly when a retry is safe and wanted.
 */

import { draftReply, type DraftResult } from "../lib/draft-reply";
import { mergeRaw, patchLead, readLead, rawStr, type CorrespondenceEntry } from "../lib/lead-db";
import { emailChris, fallbackTopic, renderLeadEmail, type LeadPayload, type NotifyKind } from "../lib/lead-notify";

export const config = { background: true };

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

type Body = {
  payload?: LeadPayload;
  id?: string;
  merged?: boolean;
  update?: boolean;
  entries?: CorrespondenceEntry[];
};

export default async (request: Request): Promise<Response> => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret || request.headers.get("x-internal-auth") !== secret) return reply({ error: "Unauthorized" }, 401);
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return reply({ error: "Invalid JSON" }, 400);
  }

  const origin = new URL(request.url).origin;
  const now = new Date();
  const id = body.id;
  const entries = Array.isArray(body.entries) ? body.entries : [];
  // Entries mean an update even if a caller forgot the flag; a missing flag
  // must never turn a follow-up text into a "NEW LEAD" email.
  const kind: NotifyKind = body.update || entries.length ? "update" : body.merged ? "merged" : "new";
  if (kind !== "update" && !body.payload) return reply({ error: "Missing payload" }, 400);

  try {
    const lead = id ? await readLead(secret, id) : null;
    if (kind === "update") {
      if (!entries.length) return reply({ ok: true, skipped: "no entries" });
      // readLead returns null for "row missing" and for "Supabase unavailable"
      // alike. Nothing has been sent yet, so let Netlify retry rather than drop
      // the customer's message on a transient error.
      if (!lead) {
        console.error("notify-lead: lead unreadable for update", JSON.stringify({ id }));
        return reply({ error: "Lead unreadable" }, 503);
      }
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
          message: kind === "update" ? entries.map((e) => e.body).join("\n\n") : payload.message || lead?.message,
          channel: lead?.channel || payload.channel,
          gemini_notes: lead?.gemini_notes,
          prior_messages: lead?.correspondence?.length || 0,
        },
        { timeoutMs: 15000 }
      );
      if (draft?.caller_name && lead && id && !(lead.name || "").trim()) {
        await patchLead(secret, id, { name: draft.caller_name });
        lead.name = draft.caller_name;
      }
    }

    // One topic and one subject per lead: every email about it reuses them.
    const topic = rawStr(lead?.raw, "draft_topic") || draft?.topic || fallbackTopic(payload, lead);
    const rendered = renderLeadEmail(payload, id, { lead, draft, kind, entries, origin, topic, now });
    if (id) {
      const keep: Record<string, unknown> = { draft_topic: topic, notify_subject: rendered.baseSubject };
      if (draft && !stored) {
        keep.draft_reply = draft.draft;
        keep.draft_at = now.toISOString();
      }
      await mergeRaw(secret, id, keep, true);
    }

    const emailed = await emailChris(payload, id, { lead, draft, kind, entries, origin, topic, now });
    if (emailed && id) await mergeRaw(secret, id, { notified_at: now.toISOString() });
    // A background function's response body is discarded, so the function log is
    // the only place to see whether the email went out.
    console.log("notify-lead result:", JSON.stringify({ id, kind, emailed, drafted: Boolean(draft) }));
    return reply({ ok: true, emailed });
  } catch (err) {
    console.error("notify-lead threw:", err);
    return reply({ ok: false });
  }
};
