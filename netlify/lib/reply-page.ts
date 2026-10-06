/**
 * The one page behind every reply link that does not open a draft directly:
 * the weekly summary's "Reply", and the old "Text back" / "Email back" links
 * still sitting in Chris's inbox from before 2026-10-05. It shows what the
 * customer said and the suggested reply, then offers the same buttons the lead
 * email does. Nothing on it sends anything (Chris, 2026-10-04): Reply by text
 * opens Messages from his own cell, Reply by email opens a fresh compose to the
 * customer only that blind-copies Portal's records.
 */

import { button, esc, nl2br, page } from "./html";
import { rawStr, type LeadRow } from "./lead-db";
import {
  INGEST_BCC,
  formatPhone,
  gmailComposeUrl,
  handledUrl,
  mailtoUrl,
  smsUrl,
  telUrl,
  textReplyBody,
  validEmail,
  vcardUrl,
} from "./lead-links";
import { channelWord, fallbackTopic, fmtWhen } from "./lead-notify";
import { saidBlock } from "./signed-page";

const BOX = "padding:10px 12px;background:#eff6ff;border-radius:6px;font-size:15px;margin-bottom:12px;";
const LABEL = "font-size:13px;color:#6b7280;margin-bottom:4px;";

export function replyPage(lead: LeadRow, id: string, name: string, origin: string, prefer?: "text" | "email"): string {
  const email = validEmail(lead.email);
  const tel = telUrl(lead.phone);
  const unanswered = lead.stage === "new";
  const draft = unanswered ? rawStr(lead.raw, "draft_reply") : "";
  const textDraft = unanswered ? rawStr(lead.raw, "draft_reply_text") || draft : "";
  const topic = rawStr(lead.raw, "draft_topic") || fallbackTopic({}, lead);
  const subject = `About your ${topic} - Portal Seattle Concrete`;
  const sms = smsUrl(lead.phone, textReplyBody(textDraft));

  const parts: string[] = [];
  parts.push(`<h2 style="margin-top:0;">Reply to ${esc(name)}</h2>`);
  parts.push(
    `<p style="margin-top:0;color:#6b7280;">Came in by ${esc(channelWord(lead.channel))} ${esc(fmtWhen(lead.created_at))}` +
      (lead.first_response_at ? `, you answered ${esc(fmtWhen(lead.first_response_at))}.` : ", not yet answered.") +
      `</p>`
  );
  parts.push(saidBlock(lead));

  const textFirst = prefer ? prefer === "text" : !email;
  const actions: string[] = [];
  const textBtn = sms ? button(sms, "Reply by text", { primary: textFirst }) : "";
  const emailBtns = email
    ? button(mailtoUrl(email, subject, draft, INGEST_BCC), "Reply by email", { primary: !textFirst }) +
      button(gmailComposeUrl(email, subject, draft, INGEST_BCC), "Reply by email on a computer")
    : "";
  if (textFirst) actions.push(textBtn, emailBtns);
  else actions.push(emailBtns, textBtn);
  if (tel) actions.push(button(tel, `Call ${formatPhone(lead.phone)}`));

  const shown = textFirst ? textReplyBody(textDraft) : draft;
  if (shown) {
    parts.push(`<div style="${LABEL}">Suggested reply</div>`);
    parts.push(`<div style="${BOX}">${nl2br(shown)}</div>`);
  }
  parts.push(`<div>${actions.filter(Boolean).join("")}</div>`);
  parts.push(
    `<p style="font-size:13px;color:#6b7280;">Each button opens a draft for you to edit. Nothing sends until you tap send yourself. ` +
      (sms ? "Reply by text opens a group text from your own number with the Portal line copied, which is how the reply gets recorded. " : "") +
      (email ? "Reply by email goes to the customer only and blind-copies Portal's records so the lead shows as answered." : "") +
      `</p>`
  );
  if (!sms && lead.phone) {
    parts.push(`<p style="font-size:13px;color:#6b7280;">The number on file, ${esc(lead.phone)}, is not a US number, so Reply by text is unavailable.</p>`);
  }
  parts.push(`<div>${button(handledUrl(origin, id), "Mark as handled")}${button(vcardUrl(origin, id), "Add to contacts")}</div>`);
  return page(`Reply to ${name}`, parts.join(""));
}
