/**
 * GET /.netlify/functions/lead-reply?id=<uuid>&t=<token> - the "Reply" link in
 * the weekly summary. A small page holding the suggested reply and the right
 * buttons for that lead's channel (email: the two compose links; phone: Call
 * back and Text back), plus Mark as handled. The summary links here instead of
 * carrying compose URLs inline so thirty leads stay well under Gmail's message
 * size clip.
 */

import { button, esc, htmlResponse, nl2br, page } from "../lib/html";
import { UUID, readLead, rawStr } from "../lib/lead-db";
import {
  INGEST_BCC,
  formatPhone,
  gmailComposeUrl,
  handledUrl,
  mailtoUrl,
  telUrl,
  textUrl,
  validEmail,
  vcardUrl,
  verifyLink,
} from "../lib/lead-links";
import { channelWord, fallbackTopic, fmtWhen } from "../lib/lead-notify";

export default async (request: Request): Promise<Response> => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return htmlResponse(page("Portal", "<p>Server config missing.</p>"), 500);
  if (request.method !== "GET") return htmlResponse(page("Portal", "<p>Method not allowed.</p>"), 405);

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const t = url.searchParams.get("t") || "";
  if (!UUID.test(id) || !verifyLink("reply", id, t)) {
    return htmlResponse(page("Portal", "<h2>This link is not valid.</h2><p>Open the summary email again and tap the link there.</p>"), 403);
  }

  const lead = await readLead(secret, id);
  if (!lead) return htmlResponse(page("Portal", "<h2>Lead not found.</h2>"), 404);

  const origin = url.origin;
  const name = (lead.name || "").trim() || formatPhone(lead.phone) || lead.email || "this lead";
  const email = validEmail(lead.email);
  const tel = telUrl(lead.phone);
  const draft = lead.stage === "new" ? rawStr(lead.raw, "draft_reply") : "";
  const topic = rawStr(lead.raw, "draft_topic") || fallbackTopic({}, lead);
  const replySubject = `About your ${topic} - Portal Seattle Concrete`;
  const ch = channelWord(lead.channel);

  const parts: string[] = [];
  parts.push(`<h2 style="margin-top:0;">Reply to ${esc(name)}</h2>`);
  parts.push(
    `<p style="margin-top:0;color:#6b7280;">Came in by ${esc(ch)} ${esc(fmtWhen(lead.created_at))}` +
      (lead.first_response_at ? `, you answered ${esc(fmtWhen(lead.first_response_at))}.` : ", not yet answered.") +
      `</p>`
  );
  if (lead.message) {
    parts.push(`<div style="font-size:13px;color:#6b7280;margin-bottom:4px;">What they said</div>`);
    parts.push(`<div style="padding:10px 12px;background:#f3f4f6;border-radius:6px;font-size:15px;margin-bottom:12px;">${nl2br(lead.message)}</div>`);
  }
  if (draft) {
    parts.push(`<div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Suggested reply</div>`);
    parts.push(`<div style="padding:10px 12px;background:#eff6ff;border-radius:6px;font-size:15px;margin-bottom:12px;">${nl2br(draft)}</div>`);
  }

  const actions: string[] = [];
  if (email) {
    actions.push(button(mailtoUrl(email, replySubject, draft, INGEST_BCC), draft ? "Reply with this draft (phone)" : "Reply (phone)", { primary: !tel }));
    actions.push(button(gmailComposeUrl(email, replySubject, draft, INGEST_BCC), "Reply in Gmail (computer)"));
  }
  if (tel) actions.push(button(tel, `Call ${formatPhone(lead.phone)}`));
  if (lead.phone) actions.push(button(textUrl(origin, id), "Text back from Portal's number", { primary: Boolean(tel) && !email }));
  actions.push(button(handledUrl(origin, id), "Mark as handled"));
  actions.push(button(vcardUrl(origin, id), "Add to contacts"));
  parts.push(`<div>${actions.join("")}</div>`);
  if (email) {
    parts.push(
      `<p style="font-size:13px;color:#6b7280;">The reply buttons open a new email to ${esc(name)} with nothing quoted. A blind copy goes to Portal's records so this lead shows as answered.</p>`
    );
  }

  return htmlResponse(page(`Reply to ${name}`, parts.join("")));
};
