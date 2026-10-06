/**
 * GET/POST /.netlify/functions/lead-text?id=<uuid>&t=<token> - the old "Text
 * back from Portal's number" link. Until 2026-10-05 this page sent the text
 * through QUO. Chris asked at the Oct 4 meeting never to send for him and never
 * from the Portal line, so it now only shows the reply page (lib/reply-page.ts),
 * whose Reply by text opens Messages from his own cell. The link stays valid
 * because older lead emails in his inbox still carry it. A POST from a page
 * opened before the change sends nothing and gets the same page.
 */

import { htmlResponse } from "../lib/html";
import { replyPage } from "../lib/reply-page";
import { loadSignedPage } from "../lib/signed-page";

export default async (request: Request): Promise<Response> => {
  const signed = await loadSignedPage(request, "text");
  if (signed instanceof Response) return signed;
  const { id, lead, name, origin } = signed;
  return htmlResponse(replyPage(lead, id, name, origin, "text"));
};
