/**
 * GET/POST /.netlify/functions/lead-delete?id=<uuid>&t=<token> - "Delete this
 * lead" on a lead flagged as a likely scam. GET shows the lead and one confirm
 * button; only the POST deletes, through portal-ops' delete-lead. A mail
 * scanner following the link can never delete anything (it only GETs).
 */

import { esc, htmlResponse, page, submitButton } from "../lib/html";
import { OPS } from "../lib/lead-db";
import { loadSignedPage, saidBlock } from "../lib/signed-page";

export default async (request: Request): Promise<Response> => {
  const signed = await loadSignedPage(request, "delete");
  if (signed instanceof Response) return signed;
  const { id, token, lead, name } = signed;

  if (request.method === "GET") {
    return htmlResponse(
      page(
        "Delete lead",
        `<h2 style="margin-top:0;">Delete ${esc(name)}?</h2>` +
          saidBlock(lead) +
          `<form method="post"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="t" value="${esc(token)}">` +
          `<p>${submitButton("Yes, delete this lead")}</p></form>` +
          `<p style="font-size:13px;color:#6b7280;">This removes the lead for good. If it might be real, close this page and use Not a scam in the email instead.</p>`
      )
    );
  }

  const passcode = process.env.OPS_PASSCODE || "";
  try {
    const res = await fetch(`${OPS}/delete-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${passcode}` },
      body: JSON.stringify({ lead_id: id }),
    });
    if (!res.ok) throw new Error(`delete-lead ${res.status}`);
  } catch (err) {
    console.error("lead-delete failed:", err);
    return htmlResponse(page("Portal", `<h2 style="margin-top:0;">That did not go through.</h2><p>Nothing was deleted. Try again in a minute.</p>`), 502);
  }
  return htmlResponse(page("Deleted", `<h2 style="margin-top:0;">Deleted.</h2><p>${esc(name)} is gone from your leads.</p>`));
};
