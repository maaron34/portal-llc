/**
 * GET/POST /.netlify/functions/lead-email?id=<uuid>&t=<token> - the old "Email
 * back from Portal" link. Until 2026-10-05 this page sent the email through
 * Resend. Chris asked at the Oct 4 meeting to always see and edit a draft in his
 * own email first, so it now only shows the reply page (lib/reply-page.ts),
 * whose Reply by email opens a fresh compose to the customer only. The link
 * stays valid because older lead emails in his inbox still carry it. A POST
 * from a page opened before the change sends nothing and gets the same page.
 */

import { htmlResponse } from "../lib/html";
import { replyPage } from "../lib/reply-page";
import { loadSignedPage } from "../lib/signed-page";

export default async (request: Request): Promise<Response> => {
  const signed = await loadSignedPage(request, "email");
  if (signed instanceof Response) return signed;
  const { id, lead, name, origin } = signed;
  return htmlResponse(replyPage(lead, id, name, origin, "email"));
};
