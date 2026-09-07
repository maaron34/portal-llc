/**
 * Netlify Scheduled Function: the weekly lead summary to Chris, Mondays at
 * 14:00 UTC (7 AM Pacific in summer, 6 AM in winter). Scheduled functions run
 * only on the production deploy, cannot be invoked by URL, and get 30 seconds;
 * the digest takes about two. For a manual or QA send use digest-send.
 */

import { sendDigest } from "../lib/digest";

export const config = { schedule: "0 14 * * 1" };

export default async (request: Request): Promise<Response> => {
  let nextRun: unknown = null;
  try {
    nextRun = ((await request.json()) as { next_run?: unknown })?.next_run ?? null;
  } catch {
    /* no body */
  }
  try {
    const result = await sendDigest({ origin: "https://buildwithportal.com" });
    console.log("digest-weekly:", JSON.stringify({ ...result, next_run: nextRun }));
  } catch (err) {
    console.error("digest-weekly threw:", err);
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
