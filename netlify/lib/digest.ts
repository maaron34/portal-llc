/**
 * The weekly lead summary for Chris: which leads from the last 30 days are still
 * waiting for a reply (oldest first, with their age), which got answered this
 * week, and one line of counts. Sent Monday mornings by digest-weekly (a Netlify
 * scheduled function) and on demand by digest-send.
 *
 * "Waiting" means stage === "new". Auto-texts no longer advance the stage (see
 * portal-ops correspondence-append), the reply buttons BCC the ingest inbox,
 * texts sent from the Text back page are recorded at once, and the Mark as
 * handled link covers everything else, so "new" is the honest list.
 *
 * Each row links to lead-reply and lead-handled (short signed links) rather
 * than carrying compose URLs inline, so thirty leads stay far under Gmail's
 * 102 KB clip. Reply-To is Michael, so "clear all of these" reaches him.
 */

import { FONT, button, emailShell, esc, section, smallNote } from "./html";
import { SUPABASE_URL, auth, leadName, normalizeLead, type LeadRow } from "./lead-db";
import { PROD_ORIGIN, formatPhone, handledUrl, replyUrl, telUrl } from "./lead-links";
import { channelWord, fmtDay, fmtWhen, sendResend } from "./lead-notify";

const DIGEST_REPLY_TO = process.env.DIGEST_REPLY_TO || "michael@appliedgpt.ai";
const DAY_MS = 86_400_000;
/** Only what the summary reads: no correspondence bodies, photos or notes. */
const DIGEST_SELECT = "id,created_at,name,email,phone,address,message,channel,stage,first_response_at,raw";

export type DigestOptions = { days?: number; to?: string; origin?: string; now?: Date };
export type DigestCounts = {
  total: number;
  waiting: number;
  oldestDays: number;
  answeredThisWeek: number;
  newThisWeek: number;
  newPrevWeek: number;
};
export type BuiltDigest = { subject: string; html: string; text: string; counts: DigestCounts };

const isReal = (l: LeadRow): boolean => !l.raw?.junk && !l.raw?.demo && !l.raw?.preview;

function stageEnteredAt(l: LeadRow): number | null {
  const sa = l.raw?.stage_at;
  const iso =
    sa && typeof sa === "object" ? (sa as Record<string, string>)[l.stage] || (sa as Record<string, string>).contacted : undefined;
  const t = iso ? new Date(iso).getTime() : l.first_response_at ? new Date(l.first_response_at).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
}

/** First line of what they wrote, trimmed for a summary row. */
function snippet(l: LeadRow, max = 90): string {
  const m = (l.message || "").replace(/\n\n--- \d{4}-\d{2}-\d{2}, via [^\n]+ ---\n/g, " ").replace(/\s+/g, " ").trim();
  if (!m) return "";
  return m.length > max ? `${m.slice(0, max - 1).trimEnd()}...` : m;
}

const ageLabel = (days: number): string => (days <= 0 ? "today" : days === 1 ? "1 day" : `${days} days`);

async function fetchRecentLeads(secret: string, sinceIso: string): Promise<LeadRow[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/leads?created_at=gte.${encodeURIComponent(sinceIso)}&select=${DIGEST_SELECT}&order=created_at.asc&limit=1000`,
    { headers: auth(secret) }
  );
  if (!res.ok) throw new Error(`leads query failed: ${res.status}`);
  return ((await res.json()) as LeadRow[]).map(normalizeLead);
}

/** One lead as the summary shows it; the HTML and the text rows both read from this. */
type WaitingRow = { who: string; age: string; channel: string; phone: string; tel: string; snippet: string; reply: string; handled: string };
type AnsweredRow = { who: string; when: string; stage: string };

/** Pure: builds the email from rows, so it can be rendered offline and dry-run. */
export function buildDigestFromLeads(rows: LeadRow[], opts: DigestOptions = {}): BuiltDigest {
  const now = opts.now ?? new Date();
  const origin = opts.origin || PROD_ORIGIN;
  const days = opts.days ?? 30;
  const nowMs = now.getTime();
  const weekAgo = nowMs - 7 * DAY_MS;
  const twoWeeksAgo = nowMs - 14 * DAY_MS;

  const real = rows.filter(isReal);
  const ageDays = (l: LeadRow) => Math.floor((nowMs - new Date(l.created_at).getTime()) / DAY_MS);
  const waitingLeads = real.filter((l) => l.stage === "new").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const waiting: WaitingRow[] = waitingLeads.map((l) => {
    const named = Boolean((l.name || "").trim());
    return {
      who: leadName(l, "Unknown"),
      age: ageLabel(ageDays(l)),
      channel: channelWord(l.channel),
      // A nameless phone lead is already headed by its number; don't print it twice.
      phone: l.phone && named ? formatPhone(l.phone) : "",
      tel: l.phone && named ? telUrl(l.phone) : "",
      snippet: snippet(l),
      reply: replyUrl(origin, l.id),
      handled: handledUrl(origin, l.id),
    };
  });
  // Leads cleared at the 2026-09-07 launch were moved out of "new" without a
  // reply being recorded; they are not "answered this week".
  const answered: AnsweredRow[] = real
    .filter((l) => l.stage !== "new" && !l.raw?.cleared_at_launch)
    .map((l) => ({ l, at: stageEnteredAt(l) }))
    .filter((x): x is { l: LeadRow; at: number } => x.at !== null && x.at >= weekAgo)
    .sort((a, b) => b.at - a.at)
    .map(({ l, at }) => ({ who: leadName(l, "Unknown"), when: fmtWhen(new Date(at).toISOString(), now), stage: l.stage.replace("_", " ") }));
  const newThisWeek = real.filter((l) => new Date(l.created_at).getTime() >= weekAgo).length;
  const newPrevWeek = real.filter((l) => {
    const t = new Date(l.created_at).getTime();
    return t >= twoWeeksAgo && t < weekAgo;
  }).length;
  const oldestDays = waitingLeads.length ? ageDays(waitingLeads[0]) : 0;

  const counts: DigestCounts = { total: real.length, waiting: waiting.length, oldestDays, answeredThisWeek: answered.length, newThisWeek, newPrevWeek };

  const weekOf = fmtDay(now.toISOString());
  const subject = waiting.length
    ? `Portal leads: ${waiting.length} waiting (oldest ${ageLabel(oldestDays)}) - week of ${weekOf}`
    : `Portal leads: nothing waiting - week of ${weekOf}`;

  const countsLine =
    `${newThisWeek} new lead${newThisWeek === 1 ? "" : "s"} came in this week (${newPrevWeek} the week before). ` +
    `${waiting.length} ${waiting.length === 1 ? "is" : "are"} waiting for a reply and ${answered.length} ${answered.length === 1 ? "was" : "were"} answered this week. ` +
    `This covers leads from the last ${days} days.`;
  const nothing = `Nothing is waiting. Every lead from the last ${days} days has been answered.`;

  const waitingHtml = waiting.length
    ? waiting
        .map((r) => {
          const phone = r.phone ? (r.tel ? `<a href="${esc(r.tel)}" style="color:#1d4ed8;">${esc(r.phone)}</a>` : esc(r.phone)) : "";
          const meta = [esc(r.age), esc(r.channel), phone].filter(Boolean).join(" &middot; ");
          return (
            `<div style="padding:10px 0;border-top:1px solid #e5e7eb;">` +
            `<div><strong>${esc(r.who)}</strong> <span style="color:#6b7280;font-size:13px;">${meta}</span></div>` +
            (r.snippet ? `<div style="font-size:14px;color:#374151;margin:2px 0 6px 0;">${esc(r.snippet)}</div>` : "") +
            `<div>${button(r.reply, "Reply", { primary: true })}${button(r.handled, "Mark as handled")}</div>` +
            `</div>`
          );
        })
        .join("")
    : `<div style="color:#374151;">${esc(nothing)}</div>`;
  const waitingText = waiting.length
    ? waiting
        .map((r) =>
          [`${r.who} - ${r.age} - ${r.channel}${r.phone ? ` - ${r.phone}` : ""}`, r.snippet ? `  ${r.snippet}` : "", `  Reply: ${r.reply}`, `  Mark as handled: ${r.handled}`]
            .filter(Boolean)
            .join("\n")
        )
        .join("\n\n")
    : nothing;

  const answeredHtml = answered.length
    ? answered.map((r) => `<div style="padding:4px 0;">${esc(r.who)} <span style="color:#6b7280;font-size:13px;">${esc(r.when)}, ${esc(r.stage)}</span></div>`).join("")
    : `<div style="color:#6b7280;">None were recorded this week.</div>`;
  const answeredText = answered.length ? answered.map((r) => `${r.who} - ${r.when}, ${r.stage}`).join("\n") : "None were recorded this week.";

  const rowsHtml = [
    `<tr><td style="${FONT}font-size:15px;line-height:1.5;color:#111827;padding-bottom:6px;"><strong>${esc(countsLine)}</strong></td></tr>`,
    section(`Not yet answered (${waiting.length})`, waitingHtml),
    section(`Answered this week (${answered.length})`, answeredHtml),
    `<tr><td style="padding-top:14px;">${smallNote(
      `Reply opens the suggested reply and the right buttons for that lead. Mark as handled takes a lead off this list. ` +
        `A lead you answered with Gmail's own Reply button, rather than the buttons in the lead email, stays here until you mark it handled.`
    )}</td></tr>`,
  ];

  const html = emailShell(rowsHtml.join(""), { preheader: countsLine });
  const text = [countsLine, "", `NOT YET ANSWERED (${waiting.length})`, waitingText, "", `ANSWERED THIS WEEK (${answered.length})`, answeredText].join("\n");

  return { subject, html, text, counts };
}

export async function buildDigest(secret: string, opts: DigestOptions = {}): Promise<BuiltDigest> {
  const now = opts.now ?? new Date();
  const days = opts.days ?? 30;
  const rows = await fetchRecentLeads(secret, new Date(now.getTime() - days * DAY_MS).toISOString());
  return buildDigestFromLeads(rows, { ...opts, now, days });
}

export async function sendDigest(opts: DigestOptions = {}): Promise<{ sent: boolean; counts?: DigestCounts; subject?: string }> {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return { sent: false };
  const built = await buildDigest(secret, opts);
  const sent = await sendResend({
    to: opts.to || process.env.DIGEST_TO || undefined,
    subject: built.subject,
    html: built.html,
    text: built.text,
    replyTo: DIGEST_REPLY_TO,
    headers: { "X-Portal-System": "digest" },
  });
  return { sent, counts: built.counts, subject: built.subject };
}
