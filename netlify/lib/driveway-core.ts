/**
 * The Driveway Generator's server logic: start a job, run it, report on it.
 * The three Netlify functions (driveway-start, driveway-worker,
 * driveway-status) are thin wrappers around the handlers here, and the tests
 * and the local mock drive the same handlers with an in-memory store.
 *
 * The flow, and what protects the money at each step:
 *
 *   start   The page has already created a lead through submit-lead and holds
 *           that lead's upload token. Start checks the token and the photo,
 *           saves the photo on the lead, then asks the store for a job. The
 *           store answers in ONE atomic step: same request seen before (hand
 *           back that job, charge nothing), over the phone or address limit,
 *           over the day's cap, or a new job with one image call reserved.
 *
 *   worker  A background function. It first claims the job (queued -> working,
 *           atomic), so a second delivery of the same message does nothing.
 *           It makes the reserved call, checks the result's geometry, and on a
 *           miss reserves ONE more call (atomic, against the same day cap) and
 *           tries again. Every paid call is reserved before it is made and a
 *           reservation is never handed back, so calls made <= calls reserved
 *           <= the cap.
 *
 *   status  The page polls this. It only reads, re-sends a lost worker
 *           message, and closes out a job that has been stuck too long. It
 *           never causes a paid call for a job that is already working.
 */

import { createHmac } from "node:crypto";
import { digits10, signLink, verifyLink } from "./lead-links";
import { UUID } from "./lead-db";
import { checkGeometry, type GateResult } from "./driveway-gate";
import { checkPhoto, decodeJpeg, fitToSize, requestSize, toGray } from "./driveway-image";
import { isJobType, type Editor, type JobType } from "./driveway-openai";

/** Michael may rename the product. This is the one place the server spells it. */
export const PRODUCT_NAME = "Driveway Generator";

export type JobStatus = "queued" | "working" | "done" | "failed";
/** Why a job ended: ok, the picture moved twice, the model failed, or it ran out of time. */
export type Outcome = "ok" | "moved" | "error" | "timeout";

export type Job = {
  id: string;
  created_at: string;
  lead_id: string;
  idem_key: string;
  job_type: string;
  width: number;
  height: number;
  input_path: string;
  result_path: string | null;
  status: JobStatus;
  calls: number;
  claimed_at: string | null;
  outcome: Outcome | null;
};

export type Limits = { dailyCap: number; perPhonePerDay: number; perIpPerDay: number };

export type StartArgs = {
  idemKey: string;
  leadId: string;
  phone10: string;
  ipHash: string;
  jobType: JobType;
  width: number;
  height: number;
  inputPath: string;
};

export type StartResult = { ok: true; job: Job; existing: boolean } | { ok: false; reason: "phone" | "ip" | "cap" | "error" };

export interface Store {
  /** The lead, or the older lead it was folded into a moment after submit. */
  findLead(id: string): Promise<{ id: string; phone: string | null } | null>;
  findJobByKey(idemKey: string): Promise<Job | null>;
  getJob(id: string): Promise<Job | null>;
  /** Save the homeowner's photo and attach it to the lead like any uploaded photo. Returns its storage path. */
  savePhoto(leadId: string, bytes: Uint8Array): Promise<string | null>;
  /** Atomic: dedupe on idemKey, check the limits, reserve one image call, create the job. */
  startJob(args: StartArgs, limits: Limits): Promise<StartResult>;
  /** Atomic queued -> working. Null when another worker already has it. */
  claimJob(id: string): Promise<Job | null>;
  /** Atomic: reserve the job's second and last image call against the day cap. */
  reserveRetry(id: string, dailyCap: number): Promise<boolean>;
  /** End a working job. Does nothing unless the job is still working. */
  finishJob(id: string, patch: { status: "done" | "failed"; outcome: Outcome; result_path?: string; detail?: Record<string, unknown> }): Promise<boolean>;
  /** End a job stuck in `from` since before `before`. */
  expireJob(id: string, from: "queued" | "working"): Promise<void>;
  readObject(path: string): Promise<Uint8Array | null>;
  /** Save the result and attach it to the lead as a named file. Returns its storage path. */
  saveResult(leadId: string, jobId: string, bytes: Uint8Array): Promise<string | null>;
  /** A link to a private object, good for `seconds`. */
  signedUrl(path: string, seconds: number): Promise<string | null>;
  /** Mark the lead so these leads can be compared with Free estimate leads. */
  tagLead(leadId: string, tag: Record<string, unknown>): Promise<void>;
}

export type Deps = {
  enabled: boolean;
  store: Store;
  editor: Editor | null;
  limits: Limits;
  /** Secret for hashing addresses and signing job tokens; the internal-auth secret between functions. */
  secret: string;
  /** Tell the background worker to run this job. Returns false when the message could not be sent. */
  kick(jobId: string): Promise<boolean>;
  verifyUpload(leadId: string, token: string | null | undefined): boolean;
  now(): number;
  log(line: string): void;
};

export const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// ---- configuration ----------------------------------------------------------

const intEnv = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};

export function limitsFromEnv(env: Record<string, string | undefined> = process.env): Limits {
  return {
    dailyCap: intEnv(env.DRIVEWAY_DAILY_CAP, 40),
    perPhonePerDay: intEnv(env.DRIVEWAY_MAX_PER_PHONE_PER_DAY, 3),
    perIpPerDay: intEnv(env.DRIVEWAY_MAX_PER_IP_PER_DAY, 8),
  };
}

export const enabledFromEnv = (env: Record<string, string | undefined> = process.env): boolean =>
  ["1", "true", "on", "yes"].includes((env.DRIVEWAY_GENERATOR_ENABLED || "").trim().toLowerCase());

// ---- tokens -----------------------------------------------------------------

/** How long the page may ask about a job, and how long its picture links are offered. */
export const JOB_WINDOW_MS = 2 * 60 * 60 * 1000;
export const LINK_SECONDS = 15 * 60;
const QUEUED_RESEND_MS = 20_000;
const QUEUED_GIVE_UP_MS = 4 * 60 * 1000;
const WORKING_GIVE_UP_MS = 7 * 60 * 1000;
export const MAX_BODY_BYTES = 4 * 1024 * 1024;

/** "<expiry ms>.<signature>", the same shape as the upload token. The job id alone is not enough to read a job. */
export function jobToken(jobId: string, now: number): string {
  const exp = now + JOB_WINDOW_MS;
  return `${exp}.${signLink("driveway", `${jobId}:${exp}`)}`;
}

export function verifyJobToken(jobId: string, token: unknown, now: number): boolean {
  const [expStr, sig] = (typeof token === "string" ? token : "").split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now || exp > now + JOB_WINDOW_MS) return false;
  return verifyLink("driveway", `${jobId}:${exp}`, sig);
}

export const hashIp = (secret: string, ip: string): string => createHmac("sha256", secret).update(`driveway-ip:${ip}`).digest("hex").slice(0, 32);

export function clientIp(request: Request, contextIp?: string): string {
  return (contextIp || request.headers.get("x-nf-client-connection-ip") || (request.headers.get("x-forwarded-for") || "").split(",")[0] || "unknown").trim();
}

// ---- start ------------------------------------------------------------------

const PHOTO_ERRORS: Record<string, string> = {
  type: "That file is not a photo we can read. Try a JPG or PNG.",
  size: "That photo is too large. Try a different one.",
  dimensions: "That photo is too small or too wide. Try a regular photo from your camera.",
  unreadable: "We could not read that photo. Try a different one.",
};

export async function handleStart(request: Request, deps: Deps, contextIp?: string): Promise<Response> {
  // The page asks this first so it can show its "not available" state.
  if (request.method === "GET") return json({ enabled: deps.enabled }, 200);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!deps.enabled) return json({ enabled: false }, 404);
  if (Number(request.headers.get("content-length") || "0") > MAX_BODY_BYTES) return json({ error: PHOTO_ERRORS.size }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Invalid form" }, 400);
  }
  const field = (k: string): string => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const leadId = field("lead_id");
  const key = field("key");
  const jobType = field("job_type");
  if (!UUID.test(leadId) || !deps.verifyUpload(leadId, field("t"))) return json({ error: "expired" }, 403);
  if (!UUID.test(key)) return json({ error: "Bad request" }, 400);
  if (!isJobType(jobType)) return json({ error: "Choose what the concrete is." }, 400);

  const now = deps.now();
  const lead = await deps.store.findLead(leadId);
  if (!lead) return json({ error: "expired" }, 403);

  // A double tap or a re-send after a dropped connection: same key, same job, no second charge.
  const seen = await deps.store.findJobByKey(key);
  if (seen) {
    if (seen.lead_id !== lead.id) return json({ error: "Bad request" }, 400);
    return json({ ok: true, job: seen.id, t: jobToken(seen.id, now) }, 200);
  }

  const file = form.get("photo");
  if (!file || typeof file === "string") return json({ error: "Add a photo first." }, 400);
  if (file.size > MAX_BODY_BYTES) return json({ error: PHOTO_ERRORS.size }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const photo = checkPhoto(bytes);
  if (!photo.ok) return json({ error: PHOTO_ERRORS[photo.reason] }, 400);

  const phone10 = digits10(lead.phone || "");
  if (!phone10) return json({ error: "Enter a 10-digit mobile number." }, 400);

  // The photo goes on the lead before any limit is checked, so Chris has it
  // even when no picture can be made today.
  const inputPath = await deps.store.savePhoto(lead.id, bytes);
  if (!inputPath) return json({ error: "storage" }, 502);
  await deps.store.tagLead(lead.id, { job_type: jobType, at: new Date(now).toISOString() });

  if (!deps.editor) return json({ error: "limit", reason: "cap" }, 429);
  const started = await deps.store.startJob(
    { idemKey: key, leadId: lead.id, phone10, ipHash: hashIp(deps.secret, clientIp(request, contextIp)), jobType, width: photo.width, height: photo.height, inputPath },
    deps.limits
  );
  if (!started.ok) {
    if (started.reason === "error") return json({ error: "storage" }, 502);
    deps.log(`driveway-start: refused (${started.reason})`);
    return json({ error: "limit", reason: started.reason }, 429);
  }
  if (!started.existing && !(await deps.kick(started.job.id))) deps.log(`driveway-start: worker message not sent for ${started.job.id}; status will re-send`);
  return json({ ok: true, job: started.job.id, t: jobToken(started.job.id, now) }, 200);
}

// ---- worker -----------------------------------------------------------------

const gateSummary = (g: GateResult) => ({
  pass: g.pass,
  reasons: g.reasons,
  held: Number(g.heldShare.toFixed(3)),
  moved: Number(g.movedShare.toFixed(3)),
  dx: Number(g.dx.toFixed(2)),
  dy: Number(g.dy.toFixed(2)),
  sx: Number(g.sx.toFixed(4)),
  sy: Number(g.sy.toFixed(4)),
  skew: Number(g.skew.toFixed(4)),
});

/** Run one job to its end. Safe to call twice: the second call finds nothing to claim. */
export async function runJob(jobId: string, deps: Deps): Promise<{ ran: boolean; outcome?: Outcome }> {
  const job = await deps.store.claimJob(jobId);
  if (!job) return { ran: false };
  const attempts: Record<string, unknown>[] = [];
  const fail = async (outcome: Outcome) => {
    await deps.store.finishJob(job.id, { status: "failed", outcome, detail: { attempts } });
    deps.log(`driveway-worker: ${job.id} failed (${outcome}) after ${attempts.length} call(s)`);
    return { ran: true, outcome };
  };
  try {
    if (!deps.editor || !isJobType(job.job_type)) return await fail("error");
    const photo = await deps.store.readObject(job.input_path);
    const decoded = photo ? decodeJpeg(photo) : null;
    if (!photo || !decoded) return await fail("error");
    const before = toGray(decoded);
    const size = requestSize(job.width, job.height);

    let outcome: Outcome = "error";
    for (let attempt = 1; attempt <= 2; attempt++) {
      // Call 1 was reserved when the job was created. Call 2 is reserved here, or not made.
      if (attempt === 2 && !(await deps.store.reserveRetry(job.id, deps.limits.dailyCap))) break;
      const started = deps.now();
      const res = await deps.editor.edit({ photo, width: size.width, height: size.height, jobType: job.job_type });
      const seconds = Math.round((deps.now() - started) / 1000);
      if (!res.ok) {
        attempts.push({ attempt, error: res.error, seconds });
        outcome = "error";
        if (!res.retry) break;
        continue;
      }
      const fitted = fitToSize(res.jpeg, job.width, job.height);
      if (!fitted) {
        attempts.push({ attempt, error: "unreadable result", seconds });
        outcome = "error";
        continue;
      }
      const gate = checkGeometry(before, toGray(fitted.image));
      attempts.push({ attempt, seconds, resized: fitted.resized, gate: gateSummary(gate), usage: res.usage });
      if (!gate.pass) {
        outcome = "moved";
        continue;
      }
      const path = await deps.store.saveResult(job.lead_id, job.id, fitted.bytes);
      if (!path) return await fail("error");
      await deps.store.finishJob(job.id, { status: "done", outcome: "ok", result_path: path, detail: { attempts, model: deps.editor.name } });
      await deps.store.tagLead(job.lead_id, { job_type: job.job_type, job_id: job.id, result: "picture made", at: new Date(deps.now()).toISOString() });
      deps.log(`driveway-worker: ${job.id} done after ${attempts.length} call(s)`);
      return { ran: true, outcome: "ok" };
    }
    return await fail(outcome);
  } catch (err) {
    deps.log(`driveway-worker: ${job.id} threw ${err instanceof Error ? err.name : "error"}`);
    return await fail("error");
  }
}

export async function handleWorker(request: Request, deps: Deps): Promise<Response> {
  if (!deps.secret || request.headers.get("x-internal-auth") !== deps.secret) return json({ error: "Unauthorized" }, 401);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!deps.enabled) return json({ enabled: false }, 200);
  let id = "";
  try {
    id = String(((await request.json()) as { job?: unknown }).job || "");
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!UUID.test(id)) return json({ error: "Bad job" }, 400);
  // Always 200 once a job id was read: Netlify re-delivers a background
  // message on any other answer, and a re-delivery has nothing left to do.
  return json(await runJob(id, deps), 200);
}

// ---- status -----------------------------------------------------------------

type StatusBody = { job?: unknown; t?: unknown; lead_id?: unknown; key?: unknown };

export async function handleStatus(request: Request, deps: Deps): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!deps.enabled) return json({ enabled: false }, 404);
  let body: StatusBody;
  try {
    body = (await request.json()) as StatusBody;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const now = deps.now();

  let job: Job | null = null;
  if (typeof body.job === "string" && UUID.test(body.job)) {
    if (!verifyJobToken(body.job, body.t, now)) return json({ error: "expired" }, 403);
    job = await deps.store.getJob(body.job);
  } else if (typeof body.lead_id === "string" && typeof body.key === "string" && UUID.test(body.lead_id) && UUID.test(body.key)) {
    // A page that reloaded before start answered knows its lead and its request key, not its job.
    if (!deps.verifyUpload(body.lead_id, typeof body.t === "string" ? body.t : "")) return json({ error: "expired" }, 403);
    const lead = await deps.store.findLead(body.lead_id);
    const found = await deps.store.findJobByKey(body.key);
    job = found && lead && found.lead_id === lead.id ? found : null;
    if (!job) return json({ status: "none" }, 200);
  } else {
    return json({ error: "Bad request" }, 400);
  }
  if (!job) return json({ status: "none" }, 200);

  const token = jobToken(job.id, now);
  const age = now - new Date(job.created_at).getTime();
  if (job.status === "queued") {
    if (age > QUEUED_GIVE_UP_MS) {
      await deps.store.expireJob(job.id, "queued");
      return json({ status: "failed", job: job.id, t: token }, 200);
    }
    // The worker message can be lost. Re-send it about every 20 seconds; the claim makes extra copies harmless.
    if (age > QUEUED_RESEND_MS && age % QUEUED_RESEND_MS < 4000) await deps.kick(job.id);
    return json({ status: "working", job: job.id, t: token }, 200);
  }
  if (job.status === "working") {
    const since = now - new Date(job.claimed_at || job.created_at).getTime();
    if (since > WORKING_GIVE_UP_MS) {
      await deps.store.expireJob(job.id, "working");
      return json({ status: "failed", job: job.id, t: token }, 200);
    }
    return json({ status: "working", job: job.id, t: token }, 200);
  }
  if (job.status === "done" && job.result_path) {
    const [before, after] = await Promise.all([deps.store.signedUrl(job.input_path, LINK_SECONDS), deps.store.signedUrl(job.result_path, LINK_SECONDS)]);
    if (before && after) return json({ status: "done", job: job.id, t: token, job_type: job.job_type, before_url: before, after_url: after, width: job.width, height: job.height }, 200);
  }
  return json({ status: "failed", job: job.id, t: token }, 200);
}
