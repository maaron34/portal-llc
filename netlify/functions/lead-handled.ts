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

import { button, esc, htmlResponse, page } from "../lib/html";
import { UUID, appendCorrespondence, readLead } from "../lib/lead-db";
import { formatPhone, replyUrl, verifyLink } from "../lib/lead-links";

const STAGE_LABEL: Record<string, string> = {
  contacted: "contacted",
  quoted: "quoted",
  signed: "signed",
  deposit_paid: "deposit paid",
  booked: "booked",
  completed: "completed",
  lost: "lost",
};

const BUTTON_STYLE =
  "display:inline-block;padding:12px 18px;background:#1d4ed8;color:#fff;border:0;border-radius:6px;font-size:16px;font-weight:600;";

export default async (request: Request): Promise<Response> => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return htmlResponse(page("Portal", "<p>Server config missing.</p>"), 500);

  let id = "";
  let t = "";
  if (request.method === "POST") {
    const form = await request.formData();
    id = String(form.get("id") || "");
    t = String(form.get("t") || "");
  } else if (request.method === "GET") {
    const url = new URL(request.url);
    id = url.searchParams.get("id") || "";
    t = url.searchParams.get("t") || "";
  } else {
    return htmlResponse(page("Portal", "<p>Method not allowed.</p>"), 405);
  }

  if (!UUID.test(id) || !verifyLink("handled", id, t)) {
    return htmlResponse(page("Portal", "<h2>This link is not valid.</h2><p>Open the lead email again and tap the button there.</p>"), 403);
  }

  const lead = await readLead(secret, id);
  if (!lead) return htmlResponse(page("Portal", "<h2>Lead not found.</h2><p>It may have been merged into another lead or removed.</p>"), 404);
  const name = (lead.name || "").trim() || formatPhone(lead.phone) || lead.email || "this lead";
  const origin = new URL(request.url).origin;

  const isTap = request.headers.get("sec-fetch-mode") === "navigate";
  if (request.method === "GET" && !isTap) {
    return htmlResponse(
      page(
        "Mark as handled",
        `<h2 style="margin-top:0;">Mark ${esc(name)} as handled?</h2>` +
          `<form method="post"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="t" value="${esc(t)}">` +
          `<button type="submit" style="${BUTTON_STYLE}">Yes, mark as handled</button></form>`
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
    return htmlResponse(page("Portal", `<h2>Could not save that.</h2><p>Try the link again in a minute. Nothing was changed.</p>`), 502);
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
