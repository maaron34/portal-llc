/**
 * GET/POST /.netlify/functions/lead-handled?id=<uuid>&t=<token> - the "Mark as
 * handled" link in Chris's lead emails and weekly summary. A standalone page on
 * buildwithportal.com, not the CRM.
 *
 * Writes through the ops dashboard's correspondence-append as an outbound note,
 * so the same code that handles a real reply moves the lead new -> contacted and
 * stamps first_response_at. Idempotent: the entry id is per lead per day and
 * the append RPC drops ids it already has.
 *
 * A real tap in a browser carries `Sec-Fetch-Mode: navigate` and is acted on at
 * once. Anything else fetching the link (a mail security scanner following URLs
 * before Chris ever sees the email) gets a one-button confirmation page instead,
 * so a scanner can never mark a lead handled by itself.
 */

import { button, esc, htmlResponse, page, submitButton } from "../lib/html";
import { appendCorrespondence } from "../lib/lead-db";
import { replyUrl } from "../lib/lead-links";
import { STAGE_LABEL } from "../lib/lead-notify";
import { loadSignedPage } from "../lib/signed-page";

export default async (request: Request): Promise<Response> => {
  const signed = await loadSignedPage(request, "handled");
  if (signed instanceof Response) return signed;
  const { id, token, lead, name, origin } = signed;

  const isTap = request.headers.get("sec-fetch-mode") === "navigate";
  if (request.method === "GET" && !isTap) {
    return htmlResponse(
      page(
        "Mark as handled",
        `<h2 style="margin-top:0;">Mark ${esc(name)} as handled?</h2>` +
          `<form method="post"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="t" value="${esc(token)}">` +
          `${submitButton("Yes, mark as handled")}</form>`
      )
    );
  }

  if (lead.stage !== "new") {
    return htmlResponse(
      page(
        "Already handled",
        `<h2 style="margin-top:0;">${esc(name)} is already marked ${esc(STAGE_LABEL[lead.stage] || lead.stage)}.</h2>` +
          `<p>Nothing changed.</p><p>${button(replyUrl(origin, id), "Reply to " + name)}</p>`
      )
    );
  }

  const now = new Date();
  const result = await appendCorrespondence(id, [
    {
      id: `handled:${id}:${now.toISOString().slice(0, 10)}`,
      type: "note",
      direction: "out",
      at: now.toISOString(),
      body: "Marked as handled from the lead email",
      source: "lead-email",
    },
  ]);
  if (!result.ok) {
    return htmlResponse(page("Portal", `<h2 style="margin-top:0;">Could not save that.</h2><p>Try the link again in a minute. Nothing was changed.</p>`), 502);
  }

  return htmlResponse(
    page(
      "Done",
      `<h2 style="margin-top:0;">Done. ${esc(name)} is marked as handled.</h2>` +
        `<p>It comes off the "not yet answered" list in the weekly summary.</p>` +
        `<p>${button(replyUrl(origin, id), "Reply to " + name)}</p>`
    )
  );
};
