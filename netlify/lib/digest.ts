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
import { LEAD_SELECT, SUPABASE_URL, type LeadRow } from "./lead-db";
import { formatPhone, handledUrl, replyUrl, telUrl } from "./lead-links";
import { channelWord, fmtDay, fmtWhen, sendResend } from "./lead-notify";

export const DIGEST_REPLY_TO = process.env.DIGEST_REPLY_TO || "michael@appliedgpt.ai";
const PROD_ORIGIN = "https://buildwithportal.com";
const DAY_MS = 86_400_000;

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

export async function fetchRecentLeads(secret: string, sinceIso: string): Promise<LeadRow[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/leads?created_at=gte.${encodeURIComponent(sinceIso)}&select=${LEAD_SELECT}&order=created_at.asc&limit=1000`,
    { headers: { apikey: secret, Authorization: `Bearer ${secret}` } }
  );
  if (!res.ok) throw new Error(`leads query failed: ${res.status}`);
  const rows = (await res.json()) as LeadRow[];
  return rows.map((r) => ({
    ...r,
    photos: Array.isArray(r.photos) ? r.photos : [],
    correspondence: Array.isArray(r.correspondence) ? r.correspondence : [],
    raw: r.raw && typeof r.raw === "object" ? r.raw : {},
  }));
}

/** Pure: builds the email from rows, so it can be tested and dry-run. */
export function buildDigestFromLeads(rows: LeadRow[], opts: DigestOptions = {}): BuiltDigest {
  const now = opts.now ?? new Date();
  const origin = opts.origin || PROD_ORIGIN;
  const days = opts.days ?? 30;
  const nowMs = now.getTime();
  const weekAgo = nowMs - 7 * DAY_MS;
  const twoWeeksAgo = nowMs - 14 * DAY_MS;

  const real = rows.filter(isReal);
  const ageDays = (l: LeadRow) => Math.floor((nowMs - new Date(l.created_at).getTime()) / DAY_MS);
  const waiting = real.filter((l) => l.stage === "new").sort((a, b) => a.created_at.localeCompare(b.created_at));
  // Leads cleared at the 2026-09-07 launch were moved out of "new" without a
  // reply being recorded; they are not "answered this week".
  const answered = real
    .filter((l) => l.stage !== "new" && !l.raw?.cleared_at_launch)
    .map((l) => ({ l, at: stageEnteredAt(l) }))
    .filter((x) => x.at !== null && x.at >= weekAgo)
    .sort((a, b) => (b.at as number) - (a.at as number));
  const newThisWeek = real.filter((l) => new Date(l.created_at).getTime() >= weekAgo).length;
  const newPrevWeek = real.filter((l) => {
    const t = new Date(l.created_at).getTime();
    return t >= twoWeeksAgo && t < weekAgo;
  }).length;
  const oldestDays = waiting.length ? ageDays(waiting[0]) : 0;

  const counts: DigestCounts = {
    total: real.length,
    waiting: waiting.length,
    oldestDays,
    answeredThisWeek: answered.length,
    newThisWeek,
    newPrevWeek,
  };

  const weekOf = fmtDay(now.toISOString());
  const subject = waiting.length
    ? `Portal leads: ${waiting.length} waiting (oldest ${ageLabel(oldestDays)}) - week of ${weekOf}`
    : `Portal leads: nothing waiting - week of ${weekOf}`;

  const countsLine =
    `${newThisWeek} new lead${newThisWeek === 1 ? "" : "s"} this week (${newPrevWeek} the week before). ` +
    `${waiting.length} waiting for a reply, ${answered.length} answered this week. Covers leads from the last ${days} days.`;

  // ---- waiting rows -----------------------------------------------------------
  const waitingHtml = waiting.length
    ? waiting
        .map((l) => {
          const named = Boolean((l.name || "").trim());
          const who = named ? (l.name as string).trim() : formatPhone(l.phone) || l.email || "Unknown";
          const tel = telUrl(l.phone);
          // A nameless phone lead is already headed by its number; don't print it twice.
          const phoneMeta = l.phone && named ? (tel ? `<a href="${esc(tel)}" style="color:#1d4ed8;">${esc(formatPhone(l.phone))}</a>` : esc(l.phone)) : "";
          const meta = [ageLabel(ageDays(l)), channelWord(l.channel), phoneMeta].filter(Boolean).join(" &middot; ");
          const s = snippet(l);
          return (
            `<div style="padding:10px 0;border-top:1px solid #e5e7eb;">` +
            `<div><strong>${esc(who)}</strong> <span style="color:#6b7280;font-size:13px;">${meta}</span></div>` +
            (s ? `<div style="font-size:14px;color:#374151;margin:2px 0 6px 0;">${esc(s)}</div>` : "") +
            `<div>${button(replyUrl(origin, l.id), "Reply", { primary: true })}${button(handledUrl(origin, l.id), "Mark as handled")}</div>` +
            `</div>`
          );
        })
        .join("")
    : `<div style="color:#374151;">Nothing waiting. Every lead from the last ${days} days has been answered.</div>`;

  const waitingText = waiting.length
    ? waiting
        .map((l) => {
          const named = Boolean((l.name || "").trim());
          const who = named ? (l.name as string).trim() : formatPhone(l.phone) || l.email || "Unknown";
          const s = snippet(l);
          return [
            `${who} - ${ageLabel(ageDays(l))} - ${channelWord(l.channel)}${l.phone && named ? ` - ${formatPhone(l.phone)}` : ""}`,
            s ? `  ${s}` : "",
            `  Reply: ${replyUrl(origin, l.id)}`,
            `  Mark as handled: ${handledUrl(origin, l.id)}`,
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n")
    : `Nothing waiting. Every lead from the last ${days} days has been answered.`;

  // ---- answered rows ----------------------------------------------------------
  const answeredHtml = answered.length
    ? answered
        .map(({ l, at }) => {
          const who = (l.name || "").trim() || formatPhone(l.phone) || l.email || "Unknown";
          return `<div style="padding:4px 0;">${esc(who)} <span style="color:#6b7280;font-size:13px;">${esc(fmtWhen(new Date(at as number).toISOString(), now))}, ${esc(l.stage.replace("_", " "))}</span></div>`;
        })
        .join("")
    : `<div style="color:#6b7280;">None recorded this week.</div>`;
  const answeredText = answered.length
    ? answered.map(({ l, at }) => `${(l.name || "").trim() || formatPhone(l.phone) || l.email || "Unknown"} - ${fmtWhen(new Date(at as number).toISOString(), now)}, ${l.stage.replace("_", " ")}`).join("\n")
    : "None recorded this week.";

  const rowsHtml = [
    `<tr><td style="${FONT}font-size:15px;line-height:1.5;color:#111827;padding-bottom:6px;"><strong>${esc(countsLine)}</strong></td></tr>`,
    section(`Not yet answered (${waiting.length})`, waitingHtml),
    section(`Answered this week (${answered.length})`, answeredHtml),
    `<tr><td style="padding-top:14px;">${smallNote(
      `Reply opens the suggested reply and the right buttons for that lead. Mark as handled takes a lead off this list. ` +
        `A lead you answered from your own Gmail Reply button, without the buttons in the lead email, still shows here until you mark it handled.`
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
