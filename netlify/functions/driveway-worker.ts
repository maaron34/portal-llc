/**
 * Concrete Generator, step 2 of 3 on the server: make the picture.
 *
 * A Netlify Background Function (answers 202 at once, may run 15 minutes),
 * because one image edit takes about a minute and a normal function is cut off
 * long before that. Internal only: driveway-start and driveway-status call it
 * with the Supabase secret in x-internal-auth, like notify-lead.
 *
 * This is the only code path that spends money. See netlify/lib/driveway-core.ts
 * for how each call is reserved before it is made.
 */

import { handleWorker } from "../lib/driveway-core";
import { liveDeps } from "../lib/driveway-live";

export const config = { background: true };

export default async (request: Request): Promise<Response> => {
  const deps = liveDeps(new URL(request.url).origin);
  if (!deps) return new Response(JSON.stringify({ error: "Server config missing" }), { status: 200 });
  const res = await handleWorker(request, deps);
  console.log("driveway-worker:", res.status, await res.clone().text());
  return res;
};
