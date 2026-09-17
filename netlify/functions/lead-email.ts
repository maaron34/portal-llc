/**
 * GET/POST /.netlify/functions/lead-email?id=<uuid>&t=<token> - "Email back
 * from Portal". Chris works out of his inbox, and answering a lead with Gmail's
 * own Reply reaches the customer while recording nothing: the lead sits at
 * "new" and his side of the conversation never reaches the CRM. Measured on
 * 2026-09-17: twelve customer replies in ten days, zero outbound from a chris@
 * address, every one on a thread he had answered.
 *
 * Mirrors lead-text: a page with the suggested reply in an editable box and one
 * Send button. Send goes through Resend from chris@buildwithportal.com with
 * Reply-To chris@, so the customer's answer lands in his inbox as it always
 * has. The sent email is appended to the lead's timeline in the same request
 * (source "portal-send", id = Resend's message id), which moves the lead out
 * of "new" the moment he taps Send rather than when a cron next runs.
 *
 * Guardrails: signed per-lead token; the address must pass validEmail (junk
 * leads carry garbage there); the Send button disables itself on tap so a
 * double-tap cannot send twice; one send per lead per five minutes after that;
 * body capped at 5,000 characters. A Resend error is reported plainly, and
 * then nothing is written.
 *
 * Deliberately no copy to Chris or to the ingest inbox: the timeline is the
 * record. A copy to chris@ would be forwarded into the ingest inbox and logged
 * a second time under a different id.
 */

import { FONT, button, esc, htmlResponse, nl2br, page, submitButton } from "../lib/html";
import { appendCorrespondence, rawStr } from "../lib/lead-db";
import { CHRIS_EMAIL, handledUrl, validEmail } from "../lib/lead-links";
import { CUSTOMER_FROM, fallbackTopic, sendResendMessage } from "../lib/lead-notify";
import { loadSignedPage, saidBlock } from "../lib/signed-page";

const MAX_BODY = 5000;
const RATE_LIMIT_MS = 5 * 60 * 1000;
const SOURCE = "portal-send";

const TEXTAREA_STYLE =
  "width:100%;box-sizing:border-box;min-height:220px;padding:12px;font-size:16px;line-height:1.4;border:1px solid #d1d5db;border-radius:6px;";

export default async (request: Request): Promise<Response> => {
  const signed = await loadSignedPage(request, "email");
  if (signed instanceof Response) return signed;
  const { id, token, lead, name, origin, form: posted } = signed;

  const to = validEmail(lead.email);
  if (!to) {
    return htmlResponse(
      page(
        "Portal",
        `<h2 style="margin-top:0;">${esc(name)} has no email address we can send to.</h2>` +
          `<p>The address on file is "${esc((lead.email || "").trim() || "blank")}". Call or text back from the lead email instead.</p>`
      )
    );
  }

  const topic = rawStr(lead.raw, "draft_topic") || fallbackTopic({}, lead);
  const subject = `About your ${topic} - Portal Seattle Concrete`;
  const context = saidBlock(lead);

  // The onsubmit handler disables the button as soon as it is tapped, so a
  // second tap while the send is in flight submits nothing.
  const formPage = (prefill: string, note = "") =>
    page(
      `Email ${name}`,
      `<h2 style="margin-top:0;">Email ${esc(name)} back</h2>` +
        `<p style="margin-top:0;color:#6b7280;">To ${esc(to)}, sent from ${esc(CHRIS_EMAIL)}.<br>Subject: ${esc(subject)}</p>` +
        context +
        (note ? `<p style="color:#b91c1c;">${esc(note)}</p>` : "") +
        `<form method="post" onsubmit="var b=this.querySelector('button');if(b.disabled)return false;b.disabled=true;b.textContent='Sending';">` +
        `<input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="t" value="${esc(token)}">` +
        `<textarea name="body" maxlength="${MAX_BODY}" style="${TEXTAREA_STYLE}" placeholder="Type your email">${esc(prefill)}</textarea>` +
        `<p>${submitButton("Send email")}</p></form>` +
        `<p style="font-size:13px;color:#6b7280;">Nothing is sent until you tap Send. Their reply comes to your inbox as usual.</p>`
    );

  if (request.method === "GET") {
    const draft = lead.stage === "new" ? rawStr(lead.raw, "draft_reply") : "";
    return htmlResponse(formPage(draft));
  }

  // POST: send it.
  const content = String(posted?.get("body") || "").replace(/\r/g, "").trim().slice(0, MAX_BODY);
  if (!content) return htmlResponse(formPage("", "Type a message first."), 400);

  const recent = lead.correspondence.find(
    (e) => e.direction === "out" && e.source === SOURCE && Date.now() - new Date(e.at).getTime() < RATE_LIMIT_MS
  );
  if (recent) {
    return htmlResponse(formPage(content, `An email already went to ${name} in the last five minutes. Wait a few minutes before sending another.`), 429);
  }

  const sent = await sendResendMessage({
    from: CUSTOMER_FROM,
    to,
    replyTo: CHRIS_EMAIL,
    subject,
    text: content,
    html: `<div style="${FONT}font-size:15px;line-height:1.5;color:#111827;white-space:pre-wrap;">${esc(content)}</div>`,
    headers: { "X-Portal-Lead": id },
  });
  if (!sent.ok) {
    const note = sent.configured
      ? `The email could not be sent (error ${sent.status || "unknown"}). Nothing went out. Try again, or use Reply in Gmail from the lead email.`
      : "Email sending is not configured on this site. Nothing went out.";
    return htmlResponse(formPage(content, note), sent.configured ? 502 : 500);
  }

  const now = new Date().toISOString();
  const recorded = await appendCorrespondence(id, [
    {
      id: sent.id ? `resend:${sent.id}` : `sent:${id}:${Date.now()}`,
      type: "email",
      direction: "out",
      at: now,
      from: CHRIS_EMAIL,
      to,
      body: content,
      source: SOURCE,
    },
  ]);

  const status = recorded.ok
    ? `Their reply comes to your inbox. This lead is now marked as contacted.`
    : `The email went out, but recording it on the lead did not work. Tap Mark as handled below so it leaves the waiting list.`;
  return htmlResponse(
    page(
      "Sent",
      `<h2 style="margin-top:0;">Sent to ${esc(name)} at ${esc(to)}.</h2>` +
        `<p style="margin-top:0;color:#6b7280;">Subject: ${esc(subject)}</p>` +
        `<div style="padding:10px 12px;background:#eff6ff;border-radius:6px;font-size:15px;">${nl2br(content)}</div>` +
        `<p style="color:#6b7280;font-size:13px;margin-top:12px;">${esc(status)}</p>` +
        `<p>${button(handledUrl(origin, id), recorded.ok ? "Mark as handled anyway" : "Mark as handled")}</p>`
    )
  );
};
