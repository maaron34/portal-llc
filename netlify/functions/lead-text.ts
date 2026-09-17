/**
 * GET/POST /.netlify/functions/lead-text?id=<uuid>&t=<token> - "Text back from
 * Portal's number". Chris does not open the QUO app, so this is how he answers a
 * text or voicemail lead without it: a page with the suggested reply in an
 * editable box and one Send button. Send goes through the OpenPhone (QUO) API
 * from (206) 829-6396, the number the customer already texted or called.
 *
 * He taps Send, so nothing goes out without him (the README rule). The sent
 * text is appended to the lead's timeline right away as an outbound entry
 * (source "quo-send", id = OpenPhone's message id so the 15-minute QUO cron's
 * rescan dedupes it), which moves the lead out of "new".
 *
 * Guardrails: signed per-lead token; only US/Canadian numbers are ever texted
 * (digits10 returns "" for anything else, so a foreign number can never be
 * rewritten into someone else's US number); the Send button disables itself on
 * tap so a double-tap cannot send twice; one send per lead per five minutes
 * after that; body capped at 1,000 characters. The page reports an OpenPhone
 * error plainly, and then writes nothing.
 */

import { button, esc, htmlResponse, nl2br, page, submitButton } from "../lib/html";
import { appendCorrespondence, rawStr } from "../lib/lead-db";
import { PORTAL_PHONE_DISPLAY, PORTAL_PHONE_E164, e164, formatPhone, handledUrl } from "../lib/lead-links";
import { loadSignedPage, saidBlock } from "../lib/signed-page";

const OPENPHONE_MESSAGES = "https://api.openphone.com/v1/messages";
const MAX_BODY = 1000;
const RATE_LIMIT_MS = 5 * 60 * 1000;

const TEXTAREA_STYLE =
  "width:100%;box-sizing:border-box;min-height:160px;padding:12px;font-size:16px;line-height:1.4;border:1px solid #d1d5db;border-radius:6px;";

export default async (request: Request): Promise<Response> => {
  const signed = await loadSignedPage(request, "text");
  if (signed instanceof Response) return signed;
  const { id, token, lead, name, origin, form: posted } = signed;

  const to = e164(lead.phone);
  if (!to) {
    return htmlResponse(
      page(
        "Portal",
        `<h2 style="margin-top:0;">${esc(name)} has no US phone number we can text.</h2>` +
          `<p>The number on file is "${esc((lead.phone || "").trim() || "blank")}". Reply by email from the lead email instead.</p>`
      )
    );
  }

  const context = saidBlock(lead);

  // The onsubmit handler disables the button as soon as it is tapped, so a
  // second tap while the send is in flight submits nothing.
  const formPage = (prefill: string, note = "") =>
    page(
      `Text ${name}`,
      `<h2 style="margin-top:0;">Text ${esc(name)} back</h2>` +
        `<p style="margin-top:0;color:#6b7280;">To ${esc(formatPhone(lead.phone))}, sent from Portal's number ${esc(PORTAL_PHONE_DISPLAY)}.</p>` +
        context +
        (note ? `<p style="color:#b91c1c;">${esc(note)}</p>` : "") +
        `<form method="post" onsubmit="var b=this.querySelector('button');if(b.disabled)return false;b.disabled=true;b.textContent='Sending';">` +
        `<input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="t" value="${esc(token)}">` +
        `<textarea name="body" maxlength="${MAX_BODY}" style="${TEXTAREA_STYLE}" placeholder="Type your text">${esc(prefill)}</textarea>` +
        `<p>${submitButton("Send text")}</p></form>` +
        `<p style="font-size:13px;color:#6b7280;">Nothing is sent until you tap Send.</p>`
    );

  if (request.method === "GET") {
    const draft = lead.stage === "new" ? rawStr(lead.raw, "draft_reply") : "";
    return htmlResponse(formPage(draft));
  }

  // POST: send it.
  const content = String(posted?.get("body") || "").replace(/\r/g, "").trim().slice(0, MAX_BODY);
  if (!content) return htmlResponse(formPage("", "Type a message first."), 400);

  const recent = lead.correspondence.find(
    (e) => e.direction === "out" && e.source === "quo-send" && Date.now() - new Date(e.at).getTime() < RATE_LIMIT_MS
  );
  if (recent) {
    return htmlResponse(formPage(content, `A text already went to ${name} in the last five minutes. Wait a few minutes before sending another.`), 429);
  }

  const apiKey = process.env.QUO_API_KEY;
  if (!apiKey) return htmlResponse(page("Portal", "<h2>Texting is not configured on this site.</h2>"), 500);

  let messageId = "";
  try {
    const res = await fetch(OPENPHONE_MESSAGES, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from: PORTAL_PHONE_E164, to: [to], content }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error("lead-text OpenPhone send failed:", res.status, detail);
      return htmlResponse(
        formPage(content, `QUO did not accept the text (error ${res.status}). Nothing was sent. Try again, or call ${formatPhone(lead.phone)}.`),
        502
      );
    }
    const data = (await res.json()) as { data?: { id?: string } };
    messageId = data?.data?.id || "";
  } catch (err) {
    console.error("lead-text OpenPhone threw:", err);
    return htmlResponse(formPage(content, "Could not reach QUO. Nothing was sent. Try again in a minute."), 502);
  }

  const now = new Date().toISOString();
  const recorded = await appendCorrespondence(id, [
    {
      id: messageId || `sent:${id}:${Date.now()}`,
      type: "text",
      direction: "out",
      at: now,
      from: PORTAL_PHONE_E164,
      to,
      body: content,
      source: "quo-send",
    },
  ]);

  const status = recorded.ok
    ? `Their reply comes to you as an email. This lead is now marked as contacted.`
    : `The text went out, but recording it on the lead did not work. Tap Mark as handled below so it leaves the waiting list.`;
  return htmlResponse(
    page(
      "Sent",
      `<h2 style="margin-top:0;">Sent to ${esc(name)} from ${esc(PORTAL_PHONE_DISPLAY)}.</h2>` +
        `<div style="padding:10px 12px;background:#eff6ff;border-radius:6px;font-size:15px;">${nl2br(content)}</div>` +
        `<p style="color:#6b7280;font-size:13px;margin-top:12px;">${esc(status)}</p>` +
        `<p>${button(handledUrl(origin, id), recorded.ok ? "Mark as handled anyway" : "Mark as handled")}</p>`
    )
  );
};
