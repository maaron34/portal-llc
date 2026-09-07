/**
 * The two helpers every passcode-gated function needs. The older functions
 * (gemini-photo-note, classify-sms, quo-webhook, submit-lead) carry their own
 * copies; new functions import these so a change to the check happens once.
 */

export const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Bearer <OPS_PASSCODE>, the shared secret the ops dashboard and the crons present. */
export function authorized(request: Request): boolean {
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const expected = process.env.OPS_PASSCODE;
  return Boolean(expected) && provided === expected;
}
