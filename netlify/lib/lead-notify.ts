/**
 * Shared lead-notification pipeline: email Chris through Resend. Imported by
 * submit-lead (inline fallback) and notify-lead (the normal async path).
 *
 * The email is addressed so Chris can respond to the lead in place: the From
 * display name carries the lead's name and Reply-To is the lead's email, so
 * hitting Reply answers the lead directly with their inquiry quoted. The
 * actual sending address stays leads@buildwithportal.com because Resend (and
 * DMARC everywhere) only allows sending from our verified domain — we can't
 * literally send as the lead. leads@ is send-only: mail composed TO it
 * bounces, which is fine as long as Chris replies rather than starts new
 * threads there.
 *
 * (There used to be an LLM-drafted suggested reply in the email; Chris asked
 * for it to be removed — he'd rather write his own, and the draft got quoted
 * back at leads when he hit reply.)
 *
 * Email goes through Resend (RESEND_API_KEY), NOT Web3Forms: Web3Forms rejects
 * server-side API calls on the free tier ("Pro plan is required") and flags
 * accounts that try — which silently killed all lead emails in July 2026 while
 * Supabase capture kept working. If RESEND_API_KEY is unset, the email is
 * skipped.
 *
 * Everything here is best-effort: a failed send is logged, never thrown,
 * because notification must never cost us the captured lead.
 */

// Where lead notifications go. Env override so QA can redirect without a code change.
const NOTIFY_TO = process.env.LEAD_NOTIFY_TO || "chris@buildwithportal.com";

export type LeadPayload = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  message?: string;
  lead_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  http_referrer?: string;
  landing_page?: string;
  channel?: string;
  // Landing-page extras (stored in `raw`).
  project_type?: string;
  timeline?: string;
  owner_status?: string;
  source?: string;
};

/**
 * Email Chris the lead notification: lead details and a tap-to-save vCard
 * link. One email per lead. Sent via Resend from our own domain so delivery
 * doesn't depend on a third-party form relay. Best-effort: skipped when
 * RESEND_API_KEY is unset, and a send failure is logged, never thrown.
 */
export async function emailChris(payload: LeadPayload, leadId?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const who = payload.name || payload.email || payload.phone || "a new lead";
  // Lead name goes in the From display name so the inbox reads as the person,
  // not the pipeline. Stripped of header-breaking characters.
  const fromName = (payload.name || "").replace(/[\r\n"<>]/g, "").trim();
  const vcardLink = leadId
    ? `https://buildwithportal.com/.netlify/functions/vcard?id=${leadId}`
    : "";
  const message = [
    payload.name ? `Name: ${payload.name}` : "",
    payload.email ? `Email: ${payload.email}` : "",
    payload.phone ? `Phone: ${payload.phone}` : "",
    payload.address ? `Address: ${payload.address}` : "",
    payload.project_type ? `Project: ${payload.project_type}` : "",
    payload.timeline ? `Timeline: ${payload.timeline}` : "",
    payload.message ? `Message: ${payload.message}` : "",
    payload.lead_source ? `Source: ${payload.lead_source}` : "",
    ...(vcardLink ? ["", `Add ${who} to your contacts (tap on your phone): ${vcardLink}`] : []),
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromName
          ? `${fromName} via Portal <leads@buildwithportal.com>`
          : "Portal Leads <leads@buildwithportal.com>",
        to: [NOTIFY_TO],
        reply_to: payload.email || undefined,
        subject: `New lead: ${who}${payload.lead_source ? ` (${payload.lead_source})` : ""}`,
        text: message,
      }),
    });
    if (!res.ok) {
      console.error("Resend send failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend send threw:", err);
    return false;
  }
}
