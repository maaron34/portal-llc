/**
 * The shared front half of every one-tap page (Mark as handled, Text back,
 * Reply): config check, method gate, id + token from the query string or the
 * posted form, signature check, lead read. Each page used to repeat these
 * twenty lines and the copies had already drifted (one page dropped the email
 * fallback in the display name).
 */

import { htmlResponse, page } from "./html";
import { UUID, leadName, readLead, type LeadRow } from "./lead-db";
import { verifyLink, type LinkAction } from "./lead-links";

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
