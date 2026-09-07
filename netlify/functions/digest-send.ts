/**
 * POST /.netlify/functions/digest-send - the weekly summary on demand.
 * Passcode-gated. Body: { to?, days?, dry? }. With `dry: true` the rendered HTML
 * comes back and nothing is sent; otherwise it goes to `to` (default: Chris) and
 * the counts come back as JSON. Links point at this deploy's origin, so a deploy
 * preview's digest links stay on the preview.
 */

import { buildDigest, sendDigest } from "../lib/digest";
import { validEmail } from "../lib/lead-links";

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function authorized(request: Request): boolean {
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const expected = process.env.OPS_PASSCODE;
  return Boolean(expected) && provided === expected;
}

export default async (request: Request): Promise<Response> => {
  if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return json({ error: "Server config missing" }, 500);

  let body: { to?: string; days?: number; dry?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine */
  }
  const days = Math.min(Math.max(Number(body.days) || 30, 1), 120);
  const origin = new URL(request.url).origin;

  try {
    if (body.dry) {
      const built = await buildDigest(secret, { days, origin });
      return new Response(built.html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "X-Digest-Subject": built.subject, "Cache-Control": "no-store" },
      });
    }
    const to = body.to ? validEmail(body.to) : undefined;
    if (body.to && !to) return json({ error: "Invalid to" }, 400);
    const result = await sendDigest({ days, origin, to });
    return json(result, result.sent ? 200 : 502);
  } catch (err) {
    console.error("digest-send threw:", err);
    return json({ error: "Digest failed" }, 502);
  }
};
