/**
 * Links that go into Chris's lead emails: signed one-tap actions, the two
 * "reply with this draft" compose links, and phone helpers.
 *
 * Signed links carry an HMAC of the action + lead id, so a link only ever acts
 * on the one lead it was minted for and a guessed UUID does nothing. The secret
 * is LEAD_LINK_SECRET, falling back to the Supabase secret so nothing new has to
 * be configured for the links to work.
 *
 * The compose links exist because of PR #44: Chris asked for the suggested
 * reply to come OUT of the email body, since Gmail quoted the whole notification
 * (draft included) back at the customer when he hit Reply. A mailto:/Gmail
 * compose link opens a fresh message with the draft filled in and nothing
 * quoted. Both links BCC the Reggie ingest inbox, which is how the system learns
 * he replied and moves the lead out of "new".
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const CHRIS_EMAIL = "chris@buildwithportal.com";
export const INGEST_BCC = process.env.LEAD_INGEST_BCC || "reggie.ministation+portal@gmail.com";
export const PORTAL_PHONE_E164 = "+12068296396";
export const PORTAL_PHONE_DISPLAY = "(206) 829-6396";
export const QUO_INBOX_URL = "https://my.quo.com/inbox/PNDcIeIjZ3";
export const PROD_ORIGIN = "https://buildwithportal.com";

export type LinkAction = "handled" | "reply" | "text" | "email" | "merge";

function linkSecret(): string {
  return process.env.LEAD_LINK_SECRET || process.env.SUPABASE_SECRET_KEY || "";
}

export function signLink(action: LinkAction, id: string): string {
  return createHmac("sha256", linkSecret()).update(`${action}:${id}`).digest("hex").slice(0, 32);
}

export function verifyLink(action: LinkAction, id: string, token: string | null | undefined): boolean {
  if (!token || token.length !== 32 || !linkSecret()) return false;
  const expected = Buffer.from(signLink(action, id));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const handledUrl = (origin: string, id: string): string =>
  `${origin}/.netlify/functions/lead-handled?id=${id}&t=${signLink("handled", id)}`;
export const replyUrl = (origin: string, id: string): string =>
  `${origin}/.netlify/functions/lead-reply?id=${id}&t=${signLink("reply", id)}`;
export const textUrl = (origin: string, id: string): string =>
  `${origin}/.netlify/functions/lead-text?id=${id}&t=${signLink("text", id)}`;
export const emailUrl = (origin: string, id: string): string =>
  `${origin}/.netlify/functions/lead-email?id=${id}&t=${signLink("email", id)}`;
/**
 * The merge page folds `from` into `into` and deletes `from`. The signature
 * covers BOTH ids in one string, so neither can be swapped for another lead:
 * a token minted for this pair does nothing for any other pair.
 */
export const mergeUrl = (origin: string, into: string, from: string): string =>
  `${origin}/.netlify/functions/lead-merge?into=${into}&from=${from}&t=${mergeToken(into, from)}`;
export const mergeToken = (into: string, from: string): string => signLink("merge", `${into}:${from}`);
export const verifyMergeToken = (into: string, from: string, token: string | null | undefined): boolean =>
  verifyLink("merge", `${into}:${from}`, token);
export const vcardUrl = (origin: string, id: string): string => `${origin}/.netlify/functions/vcard?id=${id}`;

/**
 * The 10 digits of a US or Canadian number, or "" when the input is not one.
 * Accepts exactly 10 digits, or 11 starting with the country code 1. Anything
 * else (a UK or Mexican number, a number with an extension) returns "" rather
 * than the last ten digits: those used to be prefixed with +1 and would have
 * pointed a Text back send at an unrelated US number. submit-lead uses this
 * same function as the dedupe key, so the rule has one definition.
 */
export function digits10(phone: string | null | undefined): string {
  const d = (phone || "").replace(/\D/g, "");
  if (d.length === 10) return d;
  if (d.length === 11 && d.startsWith("1")) return d.slice(1);
  return "";
}

export const e164 = (phone: string | null | undefined): string => {
  const d = digits10(phone);
  return d ? `+1${d}` : "";
};

export function formatPhone(phone: string | null | undefined): string {
  const d = digits10(phone);
  return d ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (phone || "").trim();
}

export const telUrl = (phone: string | null | undefined): string => {
  const n = e164(phone);
  return n ? `tel:${n}` : "";
};

/**
 * sms: link that opens Messages on Chris's phone, from his own number, with the
 * body filled in. Nothing is sent: he edits and taps send himself (Chris,
 * 2026-10-04: never send for him, and never from the Portal line). `?&body=`
 * is the form both iOS and Android accept. "" for a non-US number.
 */
export const smsUrl = (phone: string | null | undefined, body = ""): string => {
  const n = e164(phone);
  if (!n) return "";
  return body ? `sms:${n}?&body=${encodeURIComponent(body.slice(0, 1200))}` : `sms:${n}`;
};

/**
 * The text Chris sends from his cell. When the customer first reached the
 * Portal line (a text or a voicemail there), the reply now arrives from a
 * different number, so one closing line says whose number it is.
 */
/**
 * True when the customer first reached the Portal (QUO) line: the lead came in
 * as a text or voicemail there, or a text or voicemail from them is on its
 * timeline. A reply from Chris's cell then comes from a number they have not
 * seen, which is what CELL_NOTE explains.
 */
export function cameViaPortalLine(lead: {
  channel?: string | null;
  correspondence?: { direction?: string; type?: string }[] | null;
} | null | undefined): boolean {
  if (!lead) return false;
  if (["quo", "quo-sms", "text", "voicemail"].includes((lead.channel || "").toLowerCase())) return true;
  return (lead.correspondence || []).some((e) => e.direction === "in" && (e.type === "text" || e.type === "voicemail"));
}

export const CELL_NOTE = "This is my cell, so text me here anytime.";
export function textReplyBody(draft: string, cameViaPortalLine: boolean): string {
  const d = (draft || "").trim();
  if (!cameViaPortalLine) return d;
  return d ? `${d}\n\n${CELL_NOTE}` : CELL_NOTE;
}

/**
 * A usable email address or undefined. Junk leads carry garbage here and a bad
 * reply_to makes Resend reject the whole send, so the email must go out without
 * one rather than not at all.
 */
export function validEmail(s: string | null | undefined): string | undefined {
  const v = (s || "").trim();
  if (!v || v.length > 254) return undefined;
  return /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[A-Za-z]{2,}$/.test(v) ? v : undefined;
}

/** Keep a compose URL under a size every mail client handles; trim the body at a paragraph. */
const MAX_COMPOSE_URL = 6000;

function fitBody(build: (body: string) => string, body: string): string {
  let text = body.replace(/\r?\n/g, "\r\n");
  let url = build(text);
  while (url.length > MAX_COMPOSE_URL && text.length > 0) {
    const cut = text.lastIndexOf("\r\n\r\n", Math.floor(text.length * 0.8));
    text = cut > 0 ? text.slice(0, cut) : text.slice(0, Math.floor(text.length * 0.8));
    url = build(text);
  }
  return url;
}

/** mailto: with to/subject/body (and a BCC). Opens the phone's mail app compose. */
export function mailtoUrl(to: string, subject: string, body: string, bcc?: string): string {
  return fitBody((b) => {
    const q = [`subject=${encodeURIComponent(subject)}`];
    if (b) q.push(`body=${encodeURIComponent(b)}`);
    if (bcc) q.push(`bcc=${encodeURIComponent(bcc)}`);
    return `mailto:${encodeURIComponent(to)}?${q.join("&")}`;
  }, body);
}

/**
 * Gmail web compose. Desktop Gmail only opens mailto: links when Chrome has
 * mail.google.com registered as the handler, which most people dismissed once
 * and never see again; this URL works regardless. authuser pins the account.
 */
export function gmailComposeUrl(to: string, subject: string, body: string, bcc?: string, authuser = CHRIS_EMAIL): string {
  return fitBody((b) => {
    const q = [
      "view=cm",
      "fs=1",
      `to=${encodeURIComponent(to)}`,
      `su=${encodeURIComponent(subject)}`,
      `authuser=${encodeURIComponent(authuser)}`,
    ];
    if (b) q.push(`body=${encodeURIComponent(b)}`);
    if (bcc) q.push(`bcc=${encodeURIComponent(bcc)}`);
    return `https://mail.google.com/mail/?${q.join("&")}`;
  }, body);
}
