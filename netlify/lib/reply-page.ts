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
  handledUrl,
  mailtoUrl,
  smsUrl,
  telUrl,
  textReplyBody,
  validEmail,
  vcardUrl,
  requestCopyBody,
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
    ? button(
        mailtoUrl(
          email,
          subject,
          requestCopyBody({
            name: lead.name,
            phone: lead.phone,
            email,
            address: lead.address,
            project: rawStr(lead.raw, "project_type"),
            timeline: rawStr(lead.raw, "timeline"),
            message: lead.message,
            later: (lead.correspondence || []).filter((e) => e.direction === "in").map((e) => e.body),
          }),
          INGEST_BCC
        ),
        "Reply by email",
        { primary: !textFirst }
      )
    : "";
  if (textFirst) actions.push(textBtn, emailBtns);
  else actions.push(emailBtns, textBtn);
  if (tel) actions.push(button(tel, `Call ${formatPhone(lead.phone)}`));

  // Reply by email no longer carries a draft (Chris, 2026-10-20), so the
  // suggested reply is shown only when the text is the main action.
  const shown = textFirst ? textReplyBody(textDraft) : "";
  if (shown) {
    parts.push(`<div style="${LABEL}">Suggested reply</div>`);
    parts.push(`<div style="${BOX}">${nl2br(shown)}</div>`);
  }
  parts.push(`<div>${actions.filter(Boolean).join("")}</div>`);
  parts.push(
    `<p style="font-size:13px;color:#6b7280;">Each button opens a draft for you to edit. Nothing sends until you tap send yourself. ` +
      (sms ? "Reply by text opens a group text from your own number with the Portal line copied, which is how the reply gets recorded. " : "") +
      (email ? "Reply by email goes to the customer only, with a copy of their request below your writing space, and blind-copies Portal's records so the lead shows as answered." : "") +
      `</p>`
  );
  if (!sms && lead.phone) {
    parts.push(`<p style="font-size:13px;color:#6b7280;">The number on file, ${esc(lead.phone)}, is not a US number, so Reply by text is unavailable.</p>`);
  }
  parts.push(`<div>${button(handledUrl(origin, id), "Mark as handled")}${button(vcardUrl(origin, id), "Add to contacts")}</div>`);
  // Opened from the lead email's Reply by text (prefer "text"): launch Messages
  // straight away, so Chris goes from the email to an editable draft in one tap.
  // Gmail will not open an sms: link inside an email, but a page it opened can
  // (Chris, 2026-10-15). The button above stays as the fallback if the phone
  // blocks it. Nothing sends: Messages opens with the draft for him to edit.
  if (prefer === "text" && sms) {
    parts.unshift(
      `<p style="margin-top:0;font-size:15px;">Opening Messages with the suggested reply. If it does not open, tap Reply by text below.</p>`
    );
    const target = JSON.stringify(sms).replace(/</g, "\\u003c");
    parts.push(`<script>setTimeout(function(){window.location.href=${target};},150);</script>`);
  }
  return page(`Reply to ${name}`, parts.join(""));
}
