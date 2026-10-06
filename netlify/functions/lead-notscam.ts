/**
 * GET/POST /.netlify/functions/lead-notscam?id=<uuid>&t=<token> - "Not a scam"
 * on a flagged lead. Clears the flag for good (raw.scam_cleared), so it never
 * shows on this lead again. GET confirms first so a mail scanner changes nothing.
 */

import { esc, htmlResponse, page, submitButton } from "../lib/html";
import { mergeRaw } from "../lib/lead-db";
import { loadSignedPage } from "../lib/signed-page";

export default async (request: Request): Promise<Response> => {
  const signed = await loadSignedPage(request, "notscam");
  if (signed instanceof Response) return signed;
  const { id, token, name } = signed;
  if (request.method === "GET") {
    return htmlResponse(
      page(
        "Not a scam",
        `<h2 style="margin-top:0;">Mark ${esc(name)} as not a scam?</h2>` +
          `<form method="post"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="t" value="${esc(token)}">` +
          `<p>${submitButton("Yes, it's a real lead")}</p></form>`
      )
    );
  }
  const ok = await mergeRaw(process.env.SUPABASE_SECRET_KEY || "", id, { scam_cleared: true, scam_cleared_at: new Date().toISOString() });
  return htmlResponse(
    page("Portal", ok ? `<h2 style="margin-top:0;">Done.</h2><p>${esc(name)} will not be flagged again.</p>` : `<h2 style="margin-top:0;">That did not save.</h2><p>Try again in a minute.</p>`),
    ok ? 200 : 502
  );
};
