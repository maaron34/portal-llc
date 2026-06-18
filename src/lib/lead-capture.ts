/**
 * Fire-and-forget POST of a website lead to the Supabase capture function
 * (netlify/functions/submit-lead). Used by every lead form (Contact, landing
 * pages) alongside the existing Web3Forms email.
 *
 * Never throws and never awaited by callers: capturing the canonical record
 * must not block the form's success state or Chris's Web3Forms notification.
 * A failed capture is recoverable from the Web3Forms logs.
 */
export function captureLead(payload: Record<string, unknown>): void {
  fetch("/.netlify/functions/submit-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((err) => console.warn("Supabase lead capture failed:", err));
}
