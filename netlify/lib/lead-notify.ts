/**
 * Shared lead-notification pipeline: draft a paste-ready reply via OpenRouter,
 * then email Chris through Resend. Imported by submit-lead (preview mode +
 * inline fallback) and notify-lead (the normal async path), so the
 * slow LLM + email work stays off the user's submit round-trip.
 *
 * Email goes through Resend (RESEND_API_KEY), NOT Web3Forms: Web3Forms rejects
 * server-side API calls on the free tier ("Pro plan is required") and flags
 * accounts that try — which silently killed all lead emails in July 2026 while
 * Supabase capture kept working. If RESEND_API_KEY is unset, the email is
 * skipped.
 *
 * Everything here is best-effort: a failed draft or send is logged, never
 * thrown, because notification must never cost us the captured lead.
 */

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";
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
  // Landing-page extras (stored in `raw`, used to personalize the draft).
  project_type?: string;
  timeline?: string;
  owner_status?: string;
  source?: string;
  // When true, generate the reply draft only — no insert, no email (QA hook).
  preview?: boolean;
};

/**
 * Draft a short, paste-ready reply for Chris to send a new lead — in his voice,
 * asking for what he needs to estimate (photos, rough dimensions, site access).
 * Never prices. Returns null if OpenRouter is unconfigured or errors, since a
 * failed draft must never block lead capture.
 */
export async function draftReply(payload: LeadPayload): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const lead = [
    payload.name ? `Name: ${payload.name}` : "",
    payload.address ? `Address: ${payload.address}` : "",
    payload.project_type ? `Project type: ${payload.project_type}` : "",
    payload.timeline ? `Timeline: ${payload.timeline}` : "",
    payload.message ? `What they wrote: ${payload.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const system =
    "You draft a short reply that Chris, owner of Portal (a Seattle concrete " +
    "contractor), will send to a brand-new lead. Goal: thank them, reference " +
    "their specific project, and ask for exactly what Chris needs to give an " +
    "accurate estimate — clear photos of the area, rough dimensions (length x " +
    "width, plus thickness or height if they know it), and site access details " +
    "(driveway/gate width, slope, anything blocking a pour). Warm but direct, " +
    "first person as Chris, 3-5 sentences. Never quote a price or invent " +
    "details. Never use an em dash; use a period, comma, or parentheses " +
    "instead. Output ONLY the reply body — no subject line, no bracketed " +
    "placeholders — and sign off as Chris.";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 400,
        temperature: 0.6,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `New lead:\n${lead || "(no details provided)"}` },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error("OpenRouter draft error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      console.error("OpenRouter returned no draft text:", JSON.stringify(data).slice(0, 500));
      return null;
    }
    return text.trim();
  } catch (err) {
    console.error("OpenRouter draft threw:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Email Chris the lead notification: lead details, a ready-to-paste reply draft
 * (when the LLM produced one), and a tap-to-save vCard link. One email per
 * lead. Sent via Resend from our own domain so delivery doesn't depend on a
 * third-party form relay. Reply-To is the lead so Chris can just hit reply and
 * paste the draft. Best-effort: skipped when RESEND_API_KEY is unset, and a
 * send failure is logged, never thrown.
 */
export async function emailChris(payload: LeadPayload, draft: string | null, leadId?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const who = payload.name || payload.email || payload.phone || "a new lead";
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
    ...(draft ? ["", "Ready-to-send reply (hit reply and paste):", "", draft] : []),
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
        from: "Portal Leads <leads@buildwithportal.com>",
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
