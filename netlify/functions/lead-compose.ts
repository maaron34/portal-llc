/**
 * GET /.netlify/functions/lead-compose?id=<uuid>&t=<token> - "Reply in Gmail on
 * a computer". Redirects to a Gmail web compose to the customer only, with the
 * suggested reply filled in and Portal's records blind-copied. Going through
 * this site instead of linking mail.google.com directly avoids the "Redirect
 * Notice" Gmail shows for links into Gmail. Nothing is sent.
 */

import { esc, htmlResponse, page } from "../lib/html";
import { rawStr } from "../lib/lead-db";
import { INGEST_BCC, gmailComposeUrl, validEmail } from "../lib/lead-links";
import { fallbackTopic } from "../lib/lead-notify";
import { loadSignedPage } from "../lib/signed-page";

export default async (request: Request): Promise<Response> => {
  const signed = await loadSignedPage(request, "compose", { methods: ["GET"] });
  if (signed instanceof Response) return signed;
  const { lead, name } = signed;
  const to = validEmail(lead.email);
  if (!to) {
    return htmlResponse(page("Portal", `<h2 style="margin-top:0;">${esc(name)} has no email address on file.</h2><p>Use Reply by text or Call from the lead email.</p>`));
  }
  const draft = lead.stage === "new" ? rawStr(lead.raw, "draft_reply") : "";
  const topic = rawStr(lead.raw, "draft_topic") || fallbackTopic({}, lead);
  const url = gmailComposeUrl(to, `About your ${topic} - Portal Seattle Concrete`, draft, INGEST_BCC);
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } });
};
