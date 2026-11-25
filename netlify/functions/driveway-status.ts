/**
 * Concrete Generator, step 3 of 3 on the server: the page polls this while it
 * waits. POST { job, t } answers { status: "working" | "done" | "failed" };
 * "done" carries two links to the private before and after pictures, each good
 * for 15 minutes. POST { lead_id, t, key } finds the job again for a page that
 * reloaded before it learned its job id.
 */

import { handleStatus } from "../lib/driveway-core";
import { liveDeps, notConfigured } from "../lib/driveway-live";

export default async (request: Request): Promise<Response> => {
  const deps = liveDeps(new URL(request.url).origin);
  if (!deps) return notConfigured();
  return handleStatus(request, deps);
};
