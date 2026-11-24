/**
 * Wires the Driveway Generator's handlers to the real services, from
 * environment variables. Imported only by the three Netlify functions.
 */

import { verifyUploadToken } from "./lead-links";
import { enabledFromEnv, limitsFromEnv, type Deps } from "./driveway-core";
import { openAiConfigFromEnv, openAiEditor } from "./driveway-openai";
import { supabaseStore } from "./driveway-store";

export function liveDeps(origin: string): Deps | null {
  const secret = process.env.SUPABASE_SECRET_KEY || "";
  if (!secret) return null;
  const openai = openAiConfigFromEnv();
  return {
    enabled: enabledFromEnv(),
    store: supabaseStore(secret),
    editor: openai ? openAiEditor(openai) : null,
    limits: limitsFromEnv(),
    secret,
    // Same pattern as submit-lead -> notify-lead: a background function on this
    // same deploy answers 202 at once, so this costs one short round-trip.
    async kick(jobId) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(`${origin}/.netlify/functions/driveway-worker`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-auth": secret },
          body: JSON.stringify({ job: jobId }),
          signal: controller.signal,
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    },
    verifyUpload: (leadId, token) => verifyUploadToken(leadId, token),
    now: () => Date.now(),
    log: (line) => console.log(line),
  };
}

export const notConfigured = (): Response =>
  new Response(JSON.stringify({ enabled: false }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
