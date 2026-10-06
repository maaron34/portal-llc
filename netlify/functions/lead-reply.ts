/**
 * GET /.netlify/functions/lead-reply?id=<uuid>&t=<token> - the "Reply" link in
 * the weekly summary. Shows what the customer said, the suggested reply, and
 * buttons that open a draft (see lib/reply-page.ts). Nothing here sends.
 */

import { htmlResponse } from "../lib/html";
import { replyPage } from "../lib/reply-page";
import { loadSignedPage } from "../lib/signed-page";

export default async (request: Request): Promise<Response> => {
  const signed = await loadSignedPage(request, "reply", {
    methods: ["GET"],
    hint: "Open the summary email again and tap the link there.",
  });
  if (signed instanceof Response) return signed;
  const { id, lead, name, origin } = signed;
  return htmlResponse(replyPage(lead, id, name, origin));
};
