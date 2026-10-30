/**
 * The next step on a lead, in Chris's terms: what he has to do now, or what he
 * is waiting on, read from the conversation by a small model. The CRM shows it
 * as one line on the lead and sorts leads by it (Your move, Visits, Waiting),
 * replacing statuses that only said who sent the last message (Michael,
 * 2026-10-30: "less important how many messages sent vs. what the next action
 * is").
 *
 * The model only labels; it never changes a lead's stage. It may suggest one
 * ("signed", "booked", "lost"), which the CRM offers Chris as a one-tap button.
 * Each result is tied to the newest message it read (based_on), so the CRM can
 * tell a current answer from one a newer message has overtaken.
 */

import type { CorrespondenceEntry, LeadRow } from "./lead-db";
import { ownWords, seattleOffsetMinutes } from "./quote-extract";

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";

export const ACTIONS = ["call_back", "reply", "schedule", "estimate", "visit_booked", "waiting", "closed"] as const;
export type NextAction = (typeof ACTIONS)[number];
export const STAGE_HINTS = ["signed", "booked", "lost"] as const;

export type LeadNext = {
  action: NextAction;
  next_step: string;
  /** ISO time of a booked site visit, only with action visit_booked. */
  visit_at: string | null;
  /** The customer's or Chris's words the label rests on, copied from the thread. */
  evidence: string | null;
  suggest_stage: (typeof STAGE_HINTS)[number] | null;
  /** id and time of the newest message read; the CRM ignores a result a newer message has overtaken. */
  based_on: { id: string | null; at: string | null };
  at: string;
  model: string;
};

/** Messages a person wrote or a call that happened; Quo's automatic texts left out. */
export function realEntries(entries: CorrespondenceEntry[]): CorrespondenceEntry[] {
  return entries
    .filter((e) => !(e.direction === "out" && e.source === "quo-auto"))
    .filter((e) => Number.isFinite(new Date(e.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export const MAX_MESSAGES = 8;

const seattle = (iso: string): string =>
  new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** The thread as the model reads it: oldest first, newest words only, dated in Seattle time. */
export function transcript(lead: Pick<LeadRow, "created_at" | "message" | "stage" | "name" | "raw">, entries: CorrespondenceEntry[], now = new Date()): string {
  const lines: string[] = [];
  lines.push(`Today: ${seattle(now.toISOString())} (Seattle time)`);
  lines.push(`Lead: ${lead.name || "unknown"}, came in ${seattle(lead.created_at)}, CRM stage "${lead.stage}"`);
  const quoted = (lead.raw?.quoted_estimate as { summary?: unknown } | undefined)?.summary;
  if (typeof quoted === "string") lines.push(`Price Chris quoted: ${quoted}`);
  if (lead.message) lines.push(`Original request: ${lead.message.replace(/\s+/g, " ").slice(0, 500)}`);
  lines.push("");
  const recent = realEntries(entries).slice(-MAX_MESSAGES);
  if (!recent.length) lines.push("(No messages yet.)");
  for (const e of recent) {
    const who = e.direction === "out" ? "Chris" : "Customer";
    const kind = e.type === "call" ? "call" : e.type === "voicemail" ? "voicemail" : e.type === "note" ? "note" : e.type;
    const words = e.type === "call" ? e.body : ownWords(e.body || "").replace(/\s+/g, " ").slice(0, 700);
    lines.push(`[${seattle(e.at)}] ${who} (${kind}): ${words || "(no text)"}`);
  }
  return lines.join("\n");
}

const SYSTEM = `You help Chris, owner of a small concrete contractor in Seattle (one crew), see the next step on each customer lead. You read the lead and its recent messages and say what happens next.

Reply with JSON only:
{"action": "...", "next_step": "...", "visit_at": "YYYY-MM-DDTHH:MM" | null, "evidence": "..." | null, "suggest_stage": "signed" | "booked" | "lost" | null}

action, exactly one:
- "call_back": the customer asked Chris to call them (voicemail or message says call me back, give me a call) and he has not called since.
- "reply": the customer asked a question or sent something and is waiting on Chris's written answer; also a new request Chris has not answered yet.
- "schedule": a site visit is being arranged but no time is settled (the customer offered times, or asked when he can come).
- "estimate": Chris has what he needs (visited, or has photos/plans) and owes a price or a revised price.
- "visit_booked": a specific day and time for Chris to visit is agreed by both sides and has not happened yet.
- "waiting": Chris is waiting on the customer: photos, dimensions, drawings, an address, or their decision on a quote.
- "closed": nothing left to do: Chris declined the job, the customer said no or went elsewhere, or the job is finished and paid.

next_step: one plain sentence, under 90 characters, what Chris should know or do, with the specific detail. Examples: "Can meet Mon or Tue before 3pm. Book the site visit." "Asked you to call back about a retaining wall." "Waiting on photos of the stairs." "Deciding on the $14,000 shed pad quote." "Visit Fri Oct 30 at 4:30pm." Use the customer's details, not generic words. No em dashes.
visit_at: only with "visit_booked": the agreed time in Seattle local time, resolved to a full date using the message dates and today's date. Otherwise null.
evidence: the few words from one message your answer rests on, copied exactly (under 120 characters), or null.
suggest_stage: "signed" or "booked" when the messages show the job is agreed or underway (deposit, start date, pour, invoice) but the CRM stage is still new/contacted/quoted; "lost" when Chris declined or the customer said no; else null.

Read the newest messages most carefully: a later message overrides an earlier one. If the last word is the customer's and asks for something, the action is Chris's. Never invent a date, time or price that is not in the messages.`;

export const FAILED = "failed" as const;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Validate the model's answer against the thread it read. Null when unusable. */
export function parseNext(p: Record<string, unknown>, text: string, now = new Date()): Omit<LeadNext, "based_on" | "at" | "model"> | null {
  const action = ACTIONS.find((a) => a === p.action);
  if (!action) return null;
  const step = typeof p.next_step === "string" ? p.next_step.replace(/\s*—\s*/g, " - ").replace(/\s+/g, " ").trim() : "";
  if (!step) return null;
  let visit: string | null = null;
  if (action === "visit_booked" && typeof p.visit_at === "string") {
    const m = p.visit_at.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
      const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
      const t = asUtc - seattleOffsetMinutes(new Date(asUtc)) * 60_000;
      // A visit more than a month back or three months out is a misread.
      if (t > now.getTime() - 30 * 86_400_000 && t < now.getTime() + 90 * 86_400_000) visit = new Date(t).toISOString();
    }
  }
  // "Booked" without a date it can show is only a visit being arranged.
  const finalAction: NextAction = action === "visit_booked" && !visit ? "schedule" : action;
  const ev = typeof p.evidence === "string" && p.evidence.trim() && norm(text).includes(norm(p.evidence)) ? p.evidence.trim().slice(0, 160) : null;
  const stage = STAGE_HINTS.find((s) => s === p.suggest_stage) ?? null;
  return { action: finalAction, next_step: step.slice(0, 120), visit_at: visit, evidence: ev, suggest_stage: stage };
}

export async function readNext(
  lead: Pick<LeadRow, "created_at" | "message" | "stage" | "name" | "raw" | "correspondence">,
  opts: { timeoutMs?: number; now?: Date } = {}
): Promise<LeadNext | typeof FAILED> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return FAILED;
  const now = opts.now ?? new Date();
  const entries = Array.isArray(lead.correspondence) ? lead.correspondence : [];
  const text = transcript(lead, entries, now);
  const newest = realEntries(entries).at(-1);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 300,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("lead-next OpenRouter error:", res.status, (await res.text()).slice(0, 200));
      return FAILED;
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    const match = typeof raw === "string" ? raw.match(/\{[\s\S]*\}/) : null;
    if (!match) return FAILED;
    const parsed = parseNext(JSON.parse(match[0]) as Record<string, unknown>, text, now);
    if (!parsed) return FAILED;
    return { ...parsed, based_on: { id: newest?.id ?? null, at: newest?.at ?? null }, at: now.toISOString(), model: OPENROUTER_MODEL };
  } catch (err) {
    console.error("lead-next threw:", err);
    return FAILED;
  } finally {
    clearTimeout(timeout);
  }
}
