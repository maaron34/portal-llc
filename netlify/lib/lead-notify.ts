/**
 * Shared lead-notification pipeline: email Chris through Resend. Imported by
 * submit-lead (inline fallback) and notify-lead (the normal async path, which
 * also drafts the reply and is where follow-up messages arrive from).
 *
 * chris@buildwithportal.com is Chris's one place for managing leads, whatever
 * channel they came in on (website form, QUO text, QUO voicemail, forwarded
 * email). So every email here:
 *
 *   - is sent as `Portal Leads <chris@buildwithportal.com>` (Michael, 2026-09-07:
 *     the From is always his own address; Resend may send as any address on the
 *     verified domain, and its DKIM is aligned on buildwithportal.com).
 *   - opens with one status line saying what arrived, when, on which channel,
 *     whether it is a new lead or an update to one he already has, and the
 *     lead's stage. Some arrivals reach his inbox twice (QUO's own voicemail
 *     notification plus ours; a customer email he forwarded coming back as
 *     ours), so the line makes clear where the process stands.
 *   - threads under the first email for that lead (Re: + In-Reply-To), so the
 *     whole history of one lead is one Gmail conversation.
 *   - puts the suggested reply behind buttons, NOT in the body. PR #44 (July
 *     2026) removed the draft from the body at Chris's request because Gmail
 *     quoted the whole notification, draft included, back at the customer when
 *     he hit Reply. Since 2026-10-05 every reply button only OPENS a draft
 *     and never sends (Chris asked at the Oct 4 meeting to always see and edit
 *     first). "Reply by email" is a fresh compose to the customer only, with
 *     the draft filled in, BCC'ing the ingest inbox: that BCC is the only way a
 *     Gmail-sent reply reaches the system, since Reply-To is the customer and
 *     Gmail's own Reply records nothing (measured 2026-09-17: twelve customer
 *     replies in ten days, zero outbound from a chris@ address). "Reply by
 *     text" opens Messages from Chris's own cell, never the Portal line, with
 *     a text-shaped draft (raw.draft_reply_text when the main draft is email).
 *
 * Email goes through Resend (RESEND_API_KEY), NOT Web3Forms: Web3Forms rejects
 * server-side API calls on the free tier and flags accounts that try, which
 * silently killed all lead emails in July 2026 while Supabase capture kept
 * working. If RESEND_API_KEY is unset, the email is skipped.
 *
 * Everything here is best-effort: a failed send is logged, never thrown,
 * because notification must never cost us the captured lead.
 */

import { FONT, button, emailShell, esc, nl2br, section, smallNote } from "./html";
import { OPS_SITE, readLead, rawStr, type CorrespondenceEntry, type DuplicateCandidate, type LeadRow } from "./lead-db";
import {
  CHRIS_EMAIL,
  INGEST_BCC,
  deleteUrl,
  notScamUrl,
  PORTAL_PHONE_DISPLAY,
  PROD_ORIGIN,
  QUO_INBOX_URL,
  formatPhone,
  mergeUrl,
  handledUrl,
  mailtoUrl,
  smsUrl,
  telUrl,
  textReplyBody,
  validEmail,
  vcardUrl,
} from "./lead-links";
import type { DraftResult } from "./draft-reply";

// Where lead notifications go. Env override so QA can redirect without a code change.
const NOTIFY_TO = process.env.LEAD_NOTIFY_TO || CHRIS_EMAIL;
export const FROM = `Portal Leads <${CHRIS_EMAIL}>`;
/** From for mail that goes to a customer (lead-email). The DBA, matching the reply subject and the Google listing. */
export const CUSTOMER_FROM = `Portal Seattle Concrete <${CHRIS_EMAIL}>`;
const TZ = "America/Los_Angeles";
const DAY_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const TIME_FMT = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const DAY_FMT = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" });

export type LeadPayload = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  message?: string;
  lead_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  http_referrer?: string;
  landing_page?: string;
  channel?: string;
  // Landing-page extras (stored in `raw`).
  project_type?: string;
  timeline?: string;
  owner_status?: string;
  source?: string;
  // Voicemail extras from the ingest cron (stored in `raw`).
  voicemail_url?: string;
  quo_conversation_url?: string;
};

/** new = a lead was created; merged = a submission folded into an existing lead; update = new messages on an existing lead. */
export type NotifyKind = "new" | "merged" | "update";

export type NotifyExtras = {
  lead?: LeadRow | null;
  draft?: DraftResult | null;
  kind?: NotifyKind;
  /** For kind "update": the inbound entries that are new since the last email. */
  entries?: CorrespondenceEntry[];
  /** Where links point. Defaults to production; a deploy preview passes its own origin. */
  origin?: string;
  /** Subject topic; the same string on every email for a lead keeps the thread together. */
  topic?: string;
  /** An older lead that looks like the same person, surfaced with a one-tap merge. */
  duplicate?: DuplicateCandidate | null;
  /** A text-shaped draft for Reply by text when the main draft is an email. */
  textDraft?: string | null;
  /** Service-area and scam flags (lib/lead-triage.ts). */
  triage?: { area?: { miles: number; verdict: string; place: string } | null; scam?: { scam: boolean; reasons: string[] } | null } | null;
  now?: Date;
};

/** "How did you hear about us?" answer as a phrase (values from src/lib/lead-fields.ts). */
const HEARD_ABOUT: Record<string, string> = {
  "google-search": "Google search",
  "ai-tool": "an AI tool like ChatGPT",
  "google-ad": "a Google ad",
  nextdoor: "Nextdoor",
  "instagram-facebook": "Instagram or Facebook",
  "friend-past-customer": "a friend or past customer",
  other: "other",
};
const heardAboutText = (v: string): string => HEARD_ABOUT[(v || "").trim()] || "";

/** The word for a channel as it appears in the subject and status line. */
export function channelWord(ch?: string | null): string {
  switch ((ch || "").toLowerCase()) {
    case "quo":
    case "quo-sms":
    case "text":
      return "text";
    case "voicemail":
      return "voicemail";
    case "email":
      return "email";
    case "":
    case "website":
    case "referral":
      return "website";
    default:
      return (ch || "").toLowerCase();
  }
}

export const STAGE_LABEL: Record<string, string> = {
  new: "not yet answered",
  contacted: "contacted",
  quoted: "quoted",
  signed: "signed",
  deposit_paid: "deposit paid",
  booked: "booked",
  completed: "completed",
  lost: "lost",
};

/** "today at 3:51 PM" / "yesterday at 9:02 AM" / "Sep 3 at 3:51 PM", Pacific time. */
export function fmtWhen(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = TIME_FMT.format(d);
  const k = DAY_KEY.format(d);
  if (k === DAY_KEY.format(now)) return `today at ${time}`;
  if (k === DAY_KEY.format(new Date(now.getTime() - 86_400_000))) return `yesterday at ${time}`;
  return `${DAY_FMT.format(d)} at ${time}`;
}

export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return DAY_FMT.format(d);
}

/** Who this email is about, for the subject: name, else a formatted phone, else the email. */
export function leadWho(lead: LeadRow | null | undefined, payload: LeadPayload): string {
  const name = (lead?.name || payload.name || "").replace(/[\r\n]/g, " ").trim();
  if (name) return name;
  const phone = lead?.phone || payload.phone || "";
  if (phone) return formatPhone(phone);
  return (lead?.email || payload.email || "a new lead").trim();
}

/** Default topic when the draft did not produce one. */
export function fallbackTopic(payload: LeadPayload, lead?: LeadRow | null): string {
  // Goes into a mail subject, so control characters and stray whitespace are
  // stripped the way leadWho strips them from the name.
  const pt = (payload.project_type || rawStr(lead?.raw, "project_type"))
    .split("")
    .map((c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? " " : c))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return pt ? pt.toLowerCase() : "concrete project";
}

/**
 * The one-line status at the top of every email. Says what arrived, when, on
 * which channel, new lead or an update to one he already has, and the stage.
 */
export function statusLine(kind: NotifyKind, payload: LeadPayload, lead: LeadRow | null | undefined, entries: CorrespondenceEntry[], now: Date): string {
  const ch = channelWord(lead?.channel && kind !== "merged" ? lead.channel : payload.channel || lead?.channel);
  const who = leadWho(lead, payload);
  const since = lead?.created_at ? fmtDay(lead.created_at) : "";
  const answered = lead?.first_response_at ? `you answered it ${fmtWhen(lead.first_response_at, now)}` : "it has not been answered yet";
  const stage = lead?.stage ? STAGE_LABEL[lead.stage] || lead.stage : "not yet answered";

  if (kind === "new") {
    const when = fmtWhen(lead?.created_at || now.toISOString(), now);
    let head: string;
    switch (ch) {
      case "voicemail":
        head = `A voicemail was left ${when} on ${PORTAL_PHONE_DISPLAY}. If QUO also emailed you this voicemail, this is the same call.`;
        break;
      case "text":
        head = `A text came in to ${PORTAL_PHONE_DISPLAY} ${when}.`;
        break;
      case "email":
        head = `An email came in from ${who} ${when}. You have the original in your inbox; this adds it to Portal's records.`;
        break;
      default:
        head = `A website form came in ${when}.`;
    }
    return `${head} This is a new lead and it has not been answered yet.`;
  }

  if (kind === "merged") {
    return `${who} filled in the website form again ${fmtWhen(now.toISOString(), now)}. The lead has been open since ${since} and ${answered}. Stage: ${stage}.`;
  }

  // update: new messages on a lead he already has
  const inbound = entries.filter((e) => e.direction === "in");
  const latest = inbound.map((e) => e.at).sort().pop();
  const kinds = new Set(inbound.map((e) => (e.type === "voicemail" ? "voicemail" : "text")));
  const noun = kinds.size === 1 ? [...kinds][0] : "message";
  const n = inbound.length || 1;
  const what = n === 1 ? `a new ${noun}` : `${n} new ${noun}s`;
  const same = noun === "voicemail" ? " If QUO also emailed you this voicemail, this is the same call." : "";
  return `${who} sent ${what} ${fmtWhen(latest || now.toISOString(), now)}.${same} The lead has been open since ${since} and ${answered}. Stage: ${stage}.`;
}

/** Strip the "--- date, via channel ---" separators mergeIntoLead adds, for a clean quote. */
function cleanMessage(m: string | null | undefined): string {
  return (m || "").replace(/\n\n--- \d{4}-\d{2}-\d{2}, via [^\n]+ ---\n/g, "\n\n").trim();
}

export type RenderedEmail = {
  subject: string;
  /** The subject without "Re: ", stored on the lead so every later email reuses it and threads. */
  baseSubject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers: Record<string, string>;
};

/**
 * Build the email. Pure: no I/O, so it can be unit-tested and reused by the
 * digest's dry-run.
 */
export function renderLeadEmail(payload: LeadPayload, leadId: string | undefined, extras: NotifyExtras = {}): RenderedEmail {
  const now = extras.now ?? new Date();
  const lead = extras.lead ?? null;
  const kind: NotifyKind = extras.kind ?? "new";
  const entries = extras.entries ?? [];
  const origin = extras.origin || PROD_ORIGIN;
  const draft = extras.draft?.draft?.trim() || "";
  const textDraft = (extras.textDraft || rawStr(lead?.raw, "draft_reply_text") || "").trim() || draft;
  const who = leadWho(lead, payload);
  const ch = channelWord(kind === "merged" ? payload.channel : lead?.channel || payload.channel);
  const topic = (extras.topic || extras.draft?.topic || fallbackTopic(payload, lead)).trim();

  const email = validEmail(lead?.email || payload.email);
  const phone = lead?.phone || payload.phone || "";
  const tel = telUrl(phone);
  const address = (lead?.address || payload.address || "").trim();
  const photos = (lead?.photos || []).filter((p) => typeof p === "string" && /^https?:\/\//.test(p)).slice(0, 6);
  const gemini = (lead?.gemini_notes || "").trim();
  const voicemailUrl = payload.voicemail_url || rawStr(lead?.raw, "voicemail_url");
  const quoUrl = payload.quo_conversation_url || rawStr(lead?.raw, "quo_conversation_url") || QUO_INBOX_URL;
  const status = statusLine(kind, payload, lead, entries, now);

  // The first email's subject is kept on the lead (raw.notify_subject) and
  // reused verbatim: after a merge fills in a name, or a website form joins a
  // texted lead, a rebuilt subject would differ and Gmail's subject threading
  // (the fallback if Resend ignores the custom Message-ID) would split the
  // conversation.
  const baseSubject = rawStr(lead?.raw, "notify_subject") || `NEW LEAD (${ch}): ${who} - ${topic}`;
  const subject = kind === "new" ? baseSubject : `Re: ${baseSubject}`;

  // ---- what they said -------------------------------------------------------
  let saidTitle: string;
  let saidHtml: string;
  let saidText: string;
  if (kind === "update" && entries.length) {
    saidTitle = "New messages";
    saidHtml = entries
      .map((e) => `<div style="margin-bottom:10px;"><span style="color:#6b7280;font-size:13px;">${esc(fmtWhen(e.at, now))}${e.type === "voicemail" ? ", voicemail" : ""}</span><br>${nl2br(e.body)}</div>`)
      .join("");
    saidText = entries.map((e) => `[${fmtWhen(e.at, now)}${e.type === "voicemail" ? ", voicemail" : ""}] ${e.body}`).join("\n\n");
  } else {
    const msg = kind === "merged" ? (payload.message || "").trim() : cleanMessage(payload.message || lead?.message);
    saidTitle = ch === "voicemail" ? "Voicemail transcript" : "What they wrote";
    saidHtml = msg ? nl2br(msg) : `<span style="color:#6b7280;">(no message)</span>`;
    saidText = msg || "(no message)";
  }
  // The listen link belongs to the voicemail being reported, not to an older
  // one that happens to sit on the lead: show it for a voicemail lead, or for an
  // update whose new messages include a voicemail.
  const voicemailInPlay = kind === "update" ? entries.some((e) => e.type === "voicemail") : ch === "voicemail";
  if (voicemailInPlay && voicemailUrl && /^https:\/\//.test(voicemailUrl)) {
    saidHtml += `<div style="margin-top:8px;"><a href="${esc(voicemailUrl)}" style="color:#1d4ed8;">Listen to the voicemail</a></div>`;
    saidText += `\nListen: ${voicemailUrl}`;
  }

  // ---- contact block --------------------------------------------------------
  const contactRows: string[] = [];
  const contactText: string[] = [];
  const name = (lead?.name || payload.name || "").trim();
  if (name) {
    contactRows.push(`<div><strong>${esc(name)}</strong></div>`);
    contactText.push(name);
  }
  if (phone) {
    contactRows.push(`<div>${tel ? `<a href="${esc(tel)}" style="color:#1d4ed8;">${esc(formatPhone(phone))}</a>` : esc(phone)}</div>`);
    contactText.push(formatPhone(phone));
  }
  if (email) {
    contactRows.push(`<div><a href="mailto:${esc(email)}" style="color:#1d4ed8;">${esc(email)}</a></div>`);
    contactText.push(email);
  }
  if (address) {
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    contactRows.push(`<div><a href="${esc(maps)}" style="color:#1d4ed8;">${esc(address)}</a></div>`);
    contactText.push(address);
  }
  const extrasRows: string[] = [];
  const pt = (payload.project_type || rawStr(lead?.raw, "project_type")).trim();
  const tl = (payload.timeline || rawStr(lead?.raw, "timeline")).trim();
  const src = (payload.lead_source || "").trim();
  const heard = heardAboutText(rawStr(lead?.raw, "heard_about") || String((payload as { heard_about?: unknown }).heard_about || ""));
  const heardOther = (rawStr(lead?.raw, "heard_about_other") || String((payload as { heard_about_other?: unknown }).heard_about_other || "")).trim();
  if (heard) extrasRows.push(`Heard about us: ${heard === "other" && heardOther ? heardOther : heard}`);
  if (pt) extrasRows.push(`Project: ${pt}`);
  if (tl) extrasRows.push(`Timeline: ${tl}`);
  // The source line earns its place for website leads (which ad, which page);
  // for a text or voicemail it would just repeat the channel word.
  if (src && kind !== "update" && src.toLowerCase() !== ch && !["quo", "quo-sms", "voicemail"].includes(src.toLowerCase())) {
    extrasRows.push(`Source: ${src}`);
  }
  if (extrasRows.length) {
    contactRows.push(smallNote(extrasRows.map(esc).join(" &middot; ")));
    contactText.push(...extrasRows);
  }

  // ---- actions ----------------------------------------------------------------
  const replySubject = `About your ${topic} - Portal Seattle Concrete`;
  const actionsHtml: string[] = [];
  const actionsText: string[] = [];
  const phoneFirst = ch === "text" || ch === "voicemail";

  // Every reply button opens a draft Chris edits and sends himself; nothing
  // here ever sends for him (Chris, 2026-10-04). Email opens a fresh compose to
  // the customer only, so none of this notification or its history goes along,
  // and blind-copies the ingest inbox so the reply is recorded. Text opens
  // Messages from his own cell, never the Portal line.
  const emailButtons = () => {
    if (!email) return;
    const m = mailtoUrl(email, replySubject, draft, INGEST_BCC);
    actionsHtml.push(
      `<div>${button(m, "Reply by email", { primary: !phoneFirst })}</div>` +
        smallNote(
          `Reply by email opens a new email to ${esc(name || email)} only${draft ? ", with the suggested reply filled in for you to edit" : ""}, with none of this history. It blind-copies Portal's records so the lead shows as answered.`
        )
    );
    actionsText.push(`Reply by email: ${m}`);
  };
  const phoneButtons = () => {
    if (!phone) return;
    // Both need a US/Canadian number: telUrl and smsUrl return "" for anything else.
    const body = textReplyBody(textDraft);
    const s = smsUrl(phone, body);
    const parts: string[] = [];
    if (s) parts.push(button(s, "Reply by text", { primary: phoneFirst }));
    if (tel) parts.push(button(tel, `Call ${formatPhone(phone)}`));
    if (!parts.length) return;
    actionsHtml.push(
      `<div>${parts.join("")}</div>` +
        (s ? smallNote(`Reply by text opens a group text from your own number to ${esc(name || "them")} and the Portal line${textDraft ? ", with the suggested reply filled in" : ""}. The Portal line copy is how the reply gets recorded. Nothing sends until you tap send.`) : "")
    );
    if (s) actionsText.push(`Reply by text: ${s}`);
    if (tel) actionsText.push(`Call: ${tel}`);
  };
  if (phoneFirst) {
    phoneButtons();
    emailButtons();
  } else {
    emailButtons();
    phoneButtons();
  }
  if (leadId) {
    actionsHtml.push(`<div>${button(handledUrl(origin, leadId), "Mark as handled")}${button(vcardUrl(origin, leadId), "Add to contacts")}</div>`);
    actionsText.push(`Mark as handled: ${handledUrl(origin, leadId)}`, `Add to contacts: ${vcardUrl(origin, leadId)}`);
  }

  // ---- photos ----------------------------------------------------------------
  let photosHtml = "";
  let photosText = "";
  if (photos.length) {
    photosHtml =
      `<div>` +
      photos.map((p) => `<a href="${esc(p)}"><img src="${esc(p)}" width="120" alt="photo" style="width:120px;height:auto;border-radius:4px;margin:0 6px 6px 0;"></a>`).join("") +
      `</div>`;
    photosText = photos.join("\n");
  }
  if (gemini) {
    photosHtml += smallNote(`Read of the photos: ${esc(gemini)}`);
    photosText += `${photosText ? "\n" : ""}Read of the photos: ${gemini}`;
  }

  // ---- footer -----------------------------------------------------------------
  const footerBits: string[] = [];
  if (phone) footerBits.push(`<a href="${esc(quoUrl)}" style="color:#6b7280;">Also in QUO</a>`);
  if (leadId) footerBits.push(`<a href="${esc(`${OPS_SITE}/leads/${leadId}`)}" style="color:#6b7280;">Open in the CRM</a>`);
  // Reply-To is the customer, so Gmail's own Reply reaches them and works. It
  // carries no BCC, so the answer is never recorded and the lead sits at "new"
  // forever. Measured 2026-09-17: 12 inbound customer replies over 10 days and
  // zero outbound from a chris@ address, every one of them on a thread he had
  // answered. This note therefore names what plain Reply costs instead of
  // advertising it. With no customer email there is no Reply-To at all and
  // Gmail's Reply goes to Chris himself, so say that instead.
  const steer = "Use Reply by email above instead.";
  const replyNote = email
    ? `Hitting Reply also reaches ${esc(name || email)}, but Portal never sees it and this lead stays marked unanswered. ${steer}`
    : phone
      ? `No email is on file for this lead, so replying to this message only reaches you. Use Reply by text or Call above.`
      : "";
  const footerHtml = smallNote([...footerBits, replyNote].filter(Boolean).join(" &middot; "));
  const replyNoteText = email
    ? `Hitting Reply also reaches ${name || email}, but Portal never sees it and this lead stays marked unanswered. ${steer}`
    : phone
      ? "No email is on file for this lead, so replying to this message only reaches you. Use Reply by text or Call."
      : "";

  // ---- assemble ---------------------------------------------------------------
  // ---- possible duplicate -------------------------------------------------
  // Chris works out of his inbox, so the merge has to be offered where he
  // notices the duplicate, which is this email. It is a suggestion: the lead was
  // still created, and nothing changes unless he taps.
  const dup = extras.duplicate ?? null;
  let dupHtml = "";
  const dupText: string[] = [];
  if (dup && leadId && dup.id !== leadId) {
    const who = (dup.name || "").trim() || "an earlier lead";
    const via = channelWord(dup.channel);
    const when = fmtDay(dup.created_at);
    const url = mergeUrl(origin, leadId, dup.id);
    dupHtml =
      `<div>This looks like the same person as ${esc(who)}, who came in by ${esc(via)} on ${esc(when)}.</div>` +
      `<div>${button(url, "Merge into one lead")}</div>` +
      smallNote("Merging keeps everything from both: the photos, the messages and the whole history. Nothing happens until you tap, and you can leave them separate.");
    dupText.push(`Possible duplicate: looks like ${who}, who came in by ${via} on ${when}.`, `Merge into one lead: ${url}`);
  }

  const rows: string[] = [];
  rows.push(`<tr><td style="${FONT}font-size:15px;line-height:1.5;color:#111827;padding-bottom:6px;"><strong>${esc(status)}</strong></td></tr>`);
  // ---- check this lead (scam / service area) ---------------------------------
  const tri = extras.triage || null;
  const checkParts: string[] = [];
  const checkText: string[] = [];
  if (tri?.scam?.scam && leadId) {
    const reasons = tri.scam.reasons.length ? tri.scam.reasons : ["Several common scam signs"];
    checkParts.push(
      `<div><strong>Looks like a scam.</strong></div>` +
        `<ul style="margin:4px 0 8px 18px;padding:0;">${reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` +
        `<div>${button(deleteUrl(origin, leadId), "Delete this lead")}${button(notScamUrl(origin, leadId), "Not a scam")}</div>` +
        smallNote("Nothing is deleted until you confirm on the next page.")
    );
    checkText.push(`Looks like a scam: ${reasons.join("; ")}`, `Delete this lead: ${deleteUrl(origin, leadId)}`, `Not a scam: ${notScamUrl(origin, leadId)}`);
  }
  if (tri?.area && tri.area.verdict !== "in") {
    const where = tri.area.place.split(",")[0];
    const line =
      tri.area.verdict === "out"
        ? `About ${Math.round(tri.area.miles)} miles from West Seattle (${where}), outside the service area. The suggested reply is the polite "outside our area" message.`
        : `About ${Math.round(tri.area.miles)} miles from West Seattle (${where}), on the edge of the service area. Your call.`;
    checkParts.push(`<div>${esc(line)}</div>`);
    checkText.push(line);
  }
  if (checkParts.length) rows.push(section("Check this lead", checkParts.join("<div style=\"height:10px\"></div>")));
  if (dupHtml) rows.push(section("Possible duplicate", dupHtml));
  if (contactRows.length) rows.push(section("Contact", contactRows.join("")));
  rows.push(section(saidTitle, saidHtml));
  if (photosHtml) rows.push(section("Photos", photosHtml));
  rows.push(section("What you can do", actionsHtml.join("")));
  rows.push(`<tr><td style="padding-top:14px;">${footerHtml}</td></tr>`);
  const html = emailShell(rows.join(""), { preheader: status });

  const text = [
    status,
    "",
    ...checkText,
    checkText.length ? "" : "",
    ...dupText,
    dupText.length ? "" : "",
    ...contactText,
    "",
    `${saidTitle}:`,
    saidText,
    photosText ? `\nPhotos:\n${photosText}` : "",
    "",
    ...actionsText,
    "",
    replyNoteText,
    phone ? `Also in QUO: ${quoUrl}` : "",
    leadId ? `Open in the CRM: ${OPS_SITE}/leads/${leadId}` : "",
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n")
    .trim();

  // Threading: the first email for a lead carries a deterministic Message-ID and
  // every later one points at it. If Resend does not honor a custom Message-ID,
  // Gmail still groups by the "Re:" subject between the same two addresses.
  const headers: Record<string, string> = { "X-Portal-System": "lead-email" };
  if (leadId) {
    const threadId = `<lead-${leadId}@buildwithportal.com>`;
    if (kind === "new") headers["Message-ID"] = threadId;
    else {
      headers["In-Reply-To"] = threadId;
      headers["References"] = threadId;
    }
  }

  return { subject, baseSubject, html, text, replyTo: email, headers };
}

export type ResendResult = {
  ok: boolean;
  /** False when RESEND_API_KEY is unset, so a page can say "not configured" rather than "failed". */
  configured: boolean;
  /** Resend's message id on success; "" otherwise. */
  id: string;
  status?: number;
};

/**
 * Send one email through Resend and report how it went. Defaults to Chris as
 * the recipient and `Portal Leads` as the sender; lead-email overrides both to
 * write to a customer. Never throws: a failure is logged and returned.
 */
export async function sendResendMessage(msg: {
  from?: string;
  to?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
}): Promise<ResendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, configured: false, id: "" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: msg.from || FROM,
        to: [msg.to || NOTIFY_TO],
        reply_to: msg.replyTo || undefined,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        headers: msg.headers,
      }),
    });
    if (!res.ok) {
      console.error("Resend send failed:", res.status, (await res.text()).slice(0, 300));
      return { ok: false, configured: true, id: "", status: res.status };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, configured: true, id: typeof data.id === "string" ? data.id : "" };
  } catch (err) {
    console.error("Resend send threw:", err);
    return { ok: false, configured: true, id: "" };
  }
}

/**
 * Send one email to Chris through Resend. Best-effort: skipped when
 * RESEND_API_KEY is unset, and a send failure is logged, never thrown.
 */
export async function sendResend(msg: {
  to?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
}): Promise<boolean> {
  return (await sendResendMessage(msg)).ok;
}

/**
 * Email Chris about a lead. `extras` carries the lead row, the draft and the
 * kind of email; the inline fallback in submit-lead passes none of that, and
 * then the lead is read here so the buttons still work (just without a draft).
 */
export async function emailChris(payload: LeadPayload, leadId?: string, extras: NotifyExtras = {}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  let lead = extras.lead ?? null;
  if (!lead && leadId && process.env.SUPABASE_SECRET_KEY) {
    lead = await readLead(process.env.SUPABASE_SECRET_KEY, leadId);
  }
  const rendered = renderLeadEmail(payload, leadId, { ...extras, lead });
  return sendResend(rendered);
}
