/**
 * POST a website lead to the capture function (netlify/functions/submit-lead):
 * Supabase insert (system-of-record) plus a queued email notification to
 * Chris. Every lead form (Contact, landing pages, referral) awaits this and
 * gates its success UI on the result — if capture fails, the lead was NOT
 * recorded anywhere, so the form must show its "call us directly" error
 * instead of a false thank-you. (Web3Forms, the client-side email relay that
 * once made fire-and-forget viable here, is gone: it flagged the account in
 * July 2026 and can't be trusted with leads.)
 *
 * Never throws; callers branch on `ok`.
 */

export type LeadResult = {
  ok: boolean;
  id?: string;
  duplicate?: boolean;
  junk?: boolean;
};

export async function submitLead(payload: Record<string, unknown>): Promise<LeadResult> {
  try {
    const res = await fetch("/.netlify/functions/submit-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<LeadResult>;
    return { ...data, ok: res.ok && data.ok === true };
  } catch (err) {
    console.warn("Lead capture failed:", err);
    return { ok: false };
  }
}
