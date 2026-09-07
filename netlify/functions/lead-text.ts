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
 * Guardrails: signed per-lead token, one send per lead per five minutes, body
 * capped at 1,000 characters. The page reports the OpenPhone error plainly if a
 * send fails, and then writes nothing.
 */

import { button, esc, htmlResponse, nl2br, page } from "../lib/html";
import { UUID, appendCorrespondence, readLead, rawStr } from "../lib/lead-db";
import { PORTAL_PHONE_DISPLAY, PORTAL_PHONE_E164, e164, formatPhone, handledUrl, verifyLink } from "../lib/lead-links";
import { fmtWhen } from "../lib/lead-notify";

const OPENPHONE_MESSAGES = "https://api.openphone.com/v1/messages";
const MAX_BODY = 1000;
const RATE_LIMIT_MS = 5 * 60 * 1000;

const BUTTON_STYLE =
  "display:inline-block;padding:12px 18px;background:#1d4ed8;color:#fff;border:0;border-radius:6px;font-size:16px;font-weight:600;";
const TEXTAREA_STYLE =
  "width:100%;box-sizing:border-box;min-height:160px;padding:12px;font-size:16px;line-height:1.4;border:1px solid #d1d5db;border-radius:6px;";

function invalid(): Response {
  return htmlResponse(page("Portal", "<h2>This link is not valid.</h2><p>Open the lead email again and tap the button there.</p>"), 403);
}

export default async (request: Request): Promise<Response> => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return htmlResponse(page("Portal", "<p>Server config missing.</p>"), 500);

  let id = "";
  let t = "";
  let body = "";
  if (request.method === "POST") {
    const form = await request.formData();
    id = String(form.get("id") || "");
    t = String(form.get("t") || "");
    body = String(form.get("body") || "");
  } else if (request.method === "GET") {
    const url = new URL(request.url);
    id = url.searchParams.get("id") || "";
    t = url.searchParams.get("t") || "";
  } else {
    return htmlResponse(page("Portal", "<p>Method not allowed.</p>"), 405);
  }
  if (!UUID.test(id) || !verifyLink("text", id, t)) return invalid();

  const lead = await readLead(secret, id);
  if (!lead) return htmlResponse(page("Portal", "<h2>Lead not found.</h2>"), 404);
  const name = (lead.name || "").trim() || formatPhone(lead.phone) || "this lead";
  const to = e164(lead.phone);
  const origin = new URL(request.url).origin;
  if (!to) {
    return htmlResponse(page("Portal", `<h2>${esc(name)} has no phone number on file.</h2><p>Reply by email from the lead email instead.</p>`));
  }

  const inbound = lead.correspondence.filter((e) => e.direction === "in").slice(-3);
  const context = inbound.length
    ? `<div style="font-size:13px;color:#6b7280;margin-bottom:4px;">What they said</div>` +
      inbound
        .map(
          (e) =>
            `<div style="margin-bottom:8px;padding:10px 12px;background:#f3f4f6;border-radius:6px;font-size:15px;">` +
            `<span style="color:#6b7280;font-size:12px;">${esc(fmtWhen(e.at))}${e.type === "voicemail" ? ", voicemail" : ""}</span><br>${nl2br(e.body)}</div>`
        )
        .join("")
    : lead.message
      ? `<div style="font-size:13px;color:#6b7280;margin-bottom:4px;">What they said</div><div style="margin-bottom:8px;padding:10px 12px;background:#f3f4f6;border-radius:6px;font-size:15px;">${nl2br(lead.message)}</div>`
      : "";

  const form = (prefill: string, note = "") =>
    page(
      `Text ${name}`,
      `<h2 style="margin-top:0;">Text ${esc(name)} back</h2>` +
        `<p style="margin-top:0;color:#6b7280;">To ${esc(formatPhone(lead.phone))}, sent from Portal's number ${esc(PORTAL_PHONE_DISPLAY)}.</p>` +
        context +
        (note ? `<p style="color:#b91c1c;">${esc(note)}</p>` : "") +
        `<form method="post"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="t" value="${esc(t)}">` +
        `<textarea name="body" maxlength="${MAX_BODY}" style="${TEXTAREA_STYLE}" placeholder="Type your text">${esc(prefill)}</textarea>` +
        `<p><button type="submit" style="${BUTTON_STYLE}">Send text</button></p></form>` +
        `<p style="font-size:13px;color:#6b7280;">Nothing is sent until you tap Send.</p>`
    );

  if (request.method === "GET") {
    const draft = lead.stage === "new" ? rawStr(lead.raw, "draft_reply") : "";
    return htmlResponse(form(draft));
  }

  // POST: send it.
  const content = body.replace(/\r/g, "").trim().slice(0, MAX_BODY);
  if (!content) return htmlResponse(form("", "Type a message first."), 400);

  const recent = lead.correspondence.find(
    (e) => e.direction === "out" && e.source === "quo-send" && Date.now() - new Date(e.at).getTime() < RATE_LIMIT_MS
  );
  if (recent) {
    return htmlResponse(form(content, `A text already went to ${name} in the last five minutes. Wait a few minutes before sending another.`), 429);
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
        form(content, `QUO did not accept the text (error ${res.status}). Nothing was sent. Try again, or call ${formatPhone(lead.phone)}.`),
        502
      );
    }
    const data = (await res.json()) as { data?: { id?: string } };
    messageId = data?.data?.id || "";
  } catch (err) {
    console.error("lead-text OpenPhone threw:", err);
    return htmlResponse(form(content, "Could not reach QUO. Nothing was sent. Try again in a minute."), 502);
  }

  const now = new Date().toISOString();
  await appendCorrespondence(id, [
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

  return htmlResponse(
    page(
      "Sent",
      `<h2 style="margin-top:0;">Sent to ${esc(name)} from ${esc(PORTAL_PHONE_DISPLAY)}.</h2>` +
        `<div style="padding:10px 12px;background:#eff6ff;border-radius:6px;font-size:15px;">${nl2br(content)}</div>` +
        `<p style="color:#6b7280;font-size:13px;margin-top:12px;">Their reply comes to you as an email. This lead is now marked as contacted.</p>` +
        `<p>${button(handledUrl(origin, id), "Mark as handled anyway")}</p>`
    )
  );
};
