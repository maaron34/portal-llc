/**
 * GET/POST /.netlify/functions/lead-merge?into=<uuid>&from=<uuid>&t=<token> -
 * "Merge into one lead". The same person reaching Portal two ways used to sit in
 * the list twice with half the story in each, and Chris had no way to combine
 * them: portal-ops owns a merge-leads function that does it correctly, but
 * nothing he can reach ever called it (ops#13). He works out of his inbox, so
 * the merge is offered in the lead email that surfaced the duplicate.
 *
 * `into` is the lead whose email he is reading and the record that survives;
 * `from` is the older duplicate, folded in and deleted. Keeping the id he
 * arrived with means the buttons in the email he has open keep working after
 * the merge. The older lead's own email degrades honestly, because every signed
 * page answers "Lead not found. It may have been merged into another lead."
 *
 * The merge itself is portal-ops' merge-leads, called with OPS_PASSCODE exactly
 * as correspondence-append is. Nothing about the merge rules is reimplemented
 * here: blanks fill, messages append, photos and correspondence union, the
 * furthest-along stage wins with "lost" beating everything, and jobs repoint at
 * the survivor.
 *
 * Guardrails: the token signs BOTH ids as one string, so a token minted for this
 * pair does nothing for any other pair; a GET only ever shows a confirmation;
 * the button disables itself on tap; and a merge that has already happened is
 * reported plainly rather than retried, since `from` is gone by then.
 */

import { button, esc, htmlResponse, page, submitButton } from "../lib/html";
import { OPS, OPS_SITE, UUID, leadName, readLead } from "../lib/lead-db";
import { formatPhone, handledUrl, verifyMergeToken } from "../lib/lead-links";
import { channelWord, fmtDay } from "../lib/lead-notify";

const invalid = (hint: string): Response =>
  htmlResponse(page("Portal", `<h2 style="margin-top:0;">This link is not valid.</h2><p>${hint}</p>`), 403);

/** One lead summarized for the confirmation: who, how they arrived, what we hold. */
function card(title: string, lead: { name: string | null; phone: string | null; email: string | null; channel: string; created_at: string; message: string | null; photos: string[]; correspondence: unknown[] }): string {
  const bits = [
    lead.phone ? formatPhone(lead.phone) : "",
    lead.email || "",
    `came in by ${channelWord(lead.channel)} on ${fmtDay(lead.created_at)}`,
    lead.photos.length ? `${lead.photos.length} photo${lead.photos.length === 1 ? "" : "s"}` : "",
    lead.correspondence.length ? `${lead.correspondence.length} message${lead.correspondence.length === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return (
    `<div style="padding:12px 14px;background:#f3f4f6;border-radius:6px;margin-bottom:10px;">` +
    `<div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">${esc(title)}</div>` +
    `<div style="font-size:15px;color:#111827;"><strong>${esc(leadName(lead))}</strong></div>` +
    `<div style="font-size:14px;color:#6b7280;">${esc(bits.join(" &middot; ")).replace(/&amp;middot;/g, "&middot;")}</div>` +
    `</div>`
  );
}

export default async (request: Request): Promise<Response> => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return htmlResponse(page("Portal", "<p>Server config missing.</p>"), 500);
  if (!["GET", "POST"].includes(request.method)) return htmlResponse(page("Portal", "<p>Method not allowed.</p>"), 405);

  let into = "";
  let from = "";
  let token = "";
  if (request.method === "POST") {
    const form = await request.formData();
    into = String(form.get("into") || "");
    from = String(form.get("from") || "");
    token = String(form.get("t") || "");
  } else {
    const url = new URL(request.url);
    into = url.searchParams.get("into") || "";
    from = url.searchParams.get("from") || "";
    token = url.searchParams.get("t") || "";
  }
  const hint = "Open the lead email again and tap the button there.";
  if (!UUID.test(into) || !UUID.test(from) || into === from) return invalid(hint);
  if (!verifyMergeToken(into, from, token)) return invalid(hint);

  const [dst, src] = await Promise.all([readLead(secret, into), readLead(secret, from)]);
  if (!dst) {
    return htmlResponse(
      page("Portal", '<h2 style="margin-top:0;">Lead not found.</h2><p>It may have been merged into another lead or removed.</p>'),
      404
    );
  }
  if (!src) {
    // Already merged, or the older one was deleted since the email went out.
    return htmlResponse(
      page(
        "Portal",
        `<h2 style="margin-top:0;">Nothing left to merge.</h2>` +
          `<p>The other lead is already gone, most likely because this merge has already been done. ${esc(leadName(dst))} is the one to work from.</p>` +
          `<p>${button(`${OPS_SITE}/leads/${into}`, "Open in the CRM")}</p>`
      )
    );
  }

  const formPage = (note = "") =>
    page(
      "Merge two leads",
      `<h2 style="margin-top:0;">Merge these into one lead?</h2>` +
        `<p style="margin-top:0;color:#6b7280;">Everything from both is kept: the photos, the messages and the whole history. The older record is folded into the newer one and then removed.</p>` +
        card("Keeping this one", dst) +
        card("Folding in and removing", src) +
        (note ? `<p style="color:#b91c1c;">${esc(note)}</p>` : "") +
        `<form method="post" onsubmit="var b=this.querySelector('button');if(b.disabled)return false;b.disabled=true;b.textContent='Merging';">` +
        `<input type="hidden" name="into" value="${esc(into)}"><input type="hidden" name="from" value="${esc(from)}">` +
        `<input type="hidden" name="t" value="${esc(token)}">` +
        `<p>${submitButton("Merge them")}</p></form>` +
        `<p style="font-size:13px;color:#6b7280;">Nothing changes until you tap Merge them. If they are different people, just close this page.</p>`
    );

  if (request.method === "GET") return htmlResponse(formPage());

  const passcode = process.env.OPS_PASSCODE || "";
  if (!passcode) return htmlResponse(formPage("Merging is not configured on this site. Nothing was changed."), 500);

  try {
    const res = await fetch(`${OPS}/merge-leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${passcode}` },
      body: JSON.stringify({ from, into }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error("lead-merge merge-leads failed:", res.status, detail);
      return htmlResponse(formPage(`The merge did not go through (error ${res.status}). Nothing was changed. Try again, or merge them in the CRM.`), 502);
    }
  } catch (err) {
    console.error("lead-merge threw:", err);
    return htmlResponse(formPage("Could not reach the CRM. Nothing was changed. Try again in a minute."), 502);
  }

  return htmlResponse(
    page(
      "Merged",
      `<h2 style="margin-top:0;">Merged into one lead.</h2>` +
        `<p>${esc(leadName(dst))} now carries everything from both records. The duplicate is gone.</p>` +
        `<p>${button(`${OPS_SITE}/leads/${into}`, "Open in the CRM")}${button(handledUrl(new URL(request.url).origin, into), "Mark as handled")}</p>`
    )
  );
};
