/**
 * Concrete Generator, step 1 of 3 on the server.
 *
 *   GET   -> { enabled }: the page asks before it shows anything.
 *   POST  -> multipart form: lead_id and t (the lead and upload token
 *            submit-lead just returned), key (a random id the page made for
 *            this request), job_type, photo (a JPEG the page already shrank).
 *            Answers { ok, job, t } or a refusal the page has a screen for.
 *
 * Off unless DRIVEWAY_GENERATOR_ENABLED is set. All logic and the reasoning
 * behind it: netlify/lib/driveway-core.ts.
 */

import { handleStart } from "../lib/driveway-core";
import { liveDeps, notConfigured } from "../lib/driveway-live";

export default async (request: Request, context?: { ip?: string }): Promise<Response> => {
  const deps = liveDeps(new URL(request.url).origin);
  if (!deps) return notConfigured();
  return handleStart(request, deps, context?.ip);
};
