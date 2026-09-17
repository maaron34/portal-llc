/**
 * The shared front half of every one-tap page (Mark as handled, Text back,
 * Reply): config check, method gate, id + token from the query string or the
 * posted form, signature check, lead read. Each page used to repeat these
 * twenty lines and the copies had already drifted (one page dropped the email
 * fallback in the display name).
 */

import { esc, htmlResponse, nl2br, page } from "./html";
import { UUID, leadName, readLead, type LeadRow } from "./lead-db";
import { verifyLink, type LinkAction } from "./lead-links";
import { fmtWhen } from "./lead-notify";

export type SignedPage = {
  id: string;
  token: string;
  lead: LeadRow;
  name: string;
  origin: string;
  form: FormData | null;
};

const invalid = (hint: string): Response =>
  htmlResponse(page("Portal", `<h2 style="margin-top:0;">This link is not valid.</h2><p>${hint}</p>`), 403);

/**
 * Returns the page inputs, or a Response to send back as-is (bad method, bad
 * token, unknown lead, missing config).
 */
export async function loadSignedPage(
  request: Request,
  action: LinkAction,
  opts: { methods?: string[]; hint?: string } = {}
): Promise<SignedPage | Response> {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return htmlResponse(page("Portal", "<p>Server config missing.</p>"), 500);
  const methods = opts.methods ?? ["GET", "POST"];
  if (!methods.includes(request.method)) return htmlResponse(page("Portal", "<p>Method not allowed.</p>"), 405);

  let id = "";
  let token = "";
  let form: FormData | null = null;
  if (request.method === "POST") {
    form = await request.formData();
    id = String(form.get("id") || "");
    token = String(form.get("t") || "");
  } else {
    const url = new URL(request.url);
    id = url.searchParams.get("id") || "";
    token = url.searchParams.get("t") || "";
  }
  const hint = opts.hint ?? "Open the lead email again and tap the button there.";
  if (!UUID.test(id) || !verifyLink(action, id, token)) return invalid(hint);

  const lead = await readLead(secret, id);
  if (!lead) {
    return htmlResponse(
      page("Portal", "<h2 style=\"margin-top:0;\">Lead not found.</h2><p>It may have been merged into another lead or removed.</p>"),
      404
    );
  }
  return { id, token, lead, name: leadName(lead), origin: new URL(request.url).origin, form };
}

/**
 * The "What they said" block the send pages (Text back, Email back) show above
 * the reply box: the last three inbound messages, or the form message when
 * nothing has come in since. One definition so the two pages cannot drift.
 */
export function saidBlock(lead: LeadRow): string {
  const inbound = lead.correspondence.filter((e) => e.direction === "in").slice(-3);
  const label = `<div style="font-size:13px;color:#6b7280;margin-bottom:4px;">What they said</div>`;
  const box = (inner: string) =>
    `<div style="margin-bottom:8px;padding:10px 12px;background:#f3f4f6;border-radius:6px;font-size:15px;">${inner}</div>`;
  if (inbound.length) {
    return (
      label +
      inbound
        .map((e) => box(`<span style="color:#6b7280;font-size:12px;">${esc(fmtWhen(e.at))}${e.type === "voicemail" ? ", voicemail" : ""}</span><br>${nl2br(e.body)}`))
        .join("")
    );
  }
  return lead.message ? label + box(nl2br(lead.message)) : "";
}
