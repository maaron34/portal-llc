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

import { draftReply, isPhoneChannel, type DraftResult } from "../lib/draft-reply";
import { mergeRaw, patchLead, readLead, rawStr, type CorrespondenceEntry } from "../lib/lead-db";
import { extractIdentity, findMatch, identityPatch, inboundText, loadCandidates, type Match } from "../lib/lead-identity";
import { checkScam, locate, outOfAreaReply, type Area, type ScamCheck } from "../lib/lead-triage";
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

    // A text-shaped draft for Reply by text, when the main draft is an email
    // (a website or email lead that left a phone number). Best effort.
    let textDraft = rawStr(lead?.raw, "draft_reply_text");
    const phoneLead = isPhoneChannel(lead?.channel || payload.channel);
    if (!textDraft && !phoneLead && (lead?.phone || payload.phone) && (!lead || lead.stage === "new")) {
      const t = await draftReply(
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
        { timeoutMs: 15000, style: "text" }
      );
      textDraft = t?.draft || "";
    }

    // One record per person (lib/lead-identity.ts). First fill blanks from the
    // sender's own words, then look for the same person already on file. A
    // "sure" match is merged into the OLDER lead right here; the email that
    // follows is then about the survivor. A "maybe" gets the Merge button.
    // Best effort throughout: a failure here must never cost the lead email.
    let duplicate: Match["other"] | null = null;
    if (lead && id && kind !== "merged") {
      const found = await extractIdentity(inboundText(lead)).catch(() => null);
      if (found) {
        const fill = identityPatch(lead, found);
        if (Object.keys(fill).length && (await patchLead(secret, id, fill))) {
          Object.assign(lead, fill);
          await mergeRaw(secret, id, { identity_filled: { ...fill, at: now.toISOString() } });
          console.log("notify-lead identity filled:", JSON.stringify({ id, fields: Object.keys(fill) }));
        }
      }
      const match = findMatch({ ...lead, raw: lead.raw as { junk?: unknown } }, await loadCandidates(secret, id));
      if (match?.verdict === "sure") {
        const survivor = await autoMerge(secret, id, match);
        if (survivor) {
          console.log("notify-lead auto-merged:", JSON.stringify({ from: id, into: survivor, reason: match.reason }));
          // Re-read the survivor and continue as an update to it, so Chris gets
          // one email about the lead he already has, not a second "new lead".
          const merged = await readLead(secret, survivor);
          if (merged) {
            return finishAsUpdate(secret, merged, origin, now, entries.length ? entries : inboundEntriesOf(lead));
          }
        }
      } else if (match?.verdict === "maybe" && kind === "new") {
        duplicate = match.other;
        console.log("notify-lead duplicate candidate:", JSON.stringify({ id, candidate: duplicate.id, reason: match.reason }));
      }
    }

    // One topic and one subject per lead: every email about it reuses them.
    // Service area and scam flags (lib/lead-triage.ts). Flags only: nothing is
    // deleted or sent. Run while the lead is unanswered; each result is stored
    // so a follow-up message does not re-run it.
    let area: Area | null = null;
    let scam: ScamCheck | null = null;
    let areaOverride = false;
    if (lead && id && lead.stage === "new") {
      const raw = (lead.raw || {}) as Record<string, unknown>;
      area = (raw.area as Area | undefined) || null;
      if (!area && (lead.address || "").trim()) {
        area = await locate(lead.address).catch(() => null);
        if (area) await mergeRaw(secret, id, { area });
      }
      if (raw.scam_cleared !== true) {
        scam = (raw.scam_check as ScamCheck | undefined) || null;
        if (!scam || kind === "update") {
          const street = /\d+\s+\S+/.test(lead.address || "");
          scam = await checkScam(inboundText(lead), lead.phone, street).catch(() => null);
          if (scam) await mergeRaw(secret, id, { scam_check: { ...scam, at: now.toISOString() } });
        }
      }
      // Well outside the area: the suggested reply becomes the polite decline.
      if (area?.verdict === "out" && !raw.area_decline_drafted) {
        const first = (lead.name || "").trim().split(/\s+/)[0] || "";
        draft = { draft: outOfAreaReply(first, area.place, false), topic: draft?.topic || "", caller_name: null };
        textDraft = outOfAreaReply(first, area.place, true);
        areaOverride = true;
      }
    }
    const triage = { area, scam };

    const topic = rawStr(lead?.raw, "draft_topic") || draft?.topic || fallbackTopic(payload, lead);
    const rendered = renderLeadEmail(payload, id, { lead, draft, textDraft, triage, kind, entries, origin, topic, duplicate, now });
    if (id) {
      const keep: Record<string, unknown> = { draft_topic: topic, notify_subject: rendered.baseSubject };
      if (draft && !stored) {
        keep.draft_reply = draft.draft;
        keep.draft_at = now.toISOString();
      }
      if (textDraft && !rawStr(lead?.raw, "draft_reply_text")) keep.draft_reply_text = textDraft;

      await mergeRaw(secret, id, keep, true);
      // keep is only-if-absent; the decline must replace the earlier draft.
      if (areaOverride && draft) await mergeRaw(secret, id, { draft_reply: draft.draft, draft_reply_text: textDraft, area_decline_drafted: true });
    }

    const emailed = await emailChris(payload, id, { lead, draft, textDraft, triage, kind, entries, origin, topic, duplicate, now });
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

const OPS = "https://portal-ops-dashboard.netlify.app/.netlify/functions";

/**
 * Fold `fromId` into the match (the older lead) through portal-ops' merge-leads,
 * which keeps the richer value on every field and unions photos and messages.
 * Returns the survivor's id, or null when the merge did not happen.
 */
async function autoMerge(secret: string, fromId: string, match: Match): Promise<string | null> {
  const passcode = process.env.OPS_PASSCODE;
  if (!passcode) return null;
  const into = match.other.id;
  try {
    const res = await fetch(`${OPS}/merge-leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${passcode}` },
      body: JSON.stringify({ from: fromId, into }),
    });
    if (!res.ok) {
      console.error("notify-lead auto-merge failed:", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    await mergeRaw(secret, into, { auto_merged_from: fromId, auto_merged_reason: match.reason, auto_merged_at: new Date().toISOString() });
    return into;
  } catch (err) {
    console.error("notify-lead auto-merge threw:", err);
    return null;
  }
}

/** The inbound messages of a lead, for the "update" email after an auto-merge. */
function inboundEntriesOf(lead: { correspondence?: CorrespondenceEntry[] | null; message?: string | null; channel?: string | null; created_at?: string }): CorrespondenceEntry[] {
  const inbound = (lead.correspondence || []).filter((e) => e.direction === "in");
  if (inbound.length) return inbound.slice(-3);
  if ((lead.message || "").trim()) {
    return [{ id: "msg", type: lead.channel === "email" ? "email" : "text", direction: "in", at: lead.created_at || new Date().toISOString(), body: lead.message!.trim(), source: lead.channel || null } as CorrespondenceEntry];
  }
  return [];
}

/** After an auto-merge: email Chris about the survivor as an update, with the merged-in messages. */
async function finishAsUpdate(secret: string, lead: NonNullable<Awaited<ReturnType<typeof readLead>>>, origin: string, now: Date, entries: CorrespondenceEntry[]): Promise<Response> {
  const payload: LeadPayload = {
    name: lead.name || undefined,
    email: lead.email || undefined,
    phone: lead.phone || undefined,
    address: lead.address || undefined,
    message: lead.message || undefined,
    channel: lead.channel,
  };
  const topic = rawStr(lead.raw, "draft_topic") || fallbackTopic(payload, lead);
  const stored = rawStr(lead.raw, "draft_reply");
  const draft: DraftResult | null = stored ? { draft: stored, topic, caller_name: null } : null;
  const emailed = await emailChris(payload, lead.id, { lead, draft, kind: "update", entries, origin, topic, now });
  if (emailed) await mergeRaw(secret, lead.id, { notified_at: now.toISOString() });
  console.log("notify-lead result:", JSON.stringify({ id: lead.id, kind: "update-after-merge", emailed }));
  return reply({ ok: true, merged_into: lead.id, emailed });
}
