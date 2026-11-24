/**
 * The Concrete Generator's Supabase store. Jobs and the daily counter live in
 * Postgres (supabase/driveway-generator.sql), so they survive function
 * restarts and the three money-critical steps run as single atomic database
 * functions. Photos and results live in the same private `lead-photos` bucket
 * the lead uploads use.
 */

import { SUPABASE_URL, auth, mergeRaw } from "./lead-db";
import { MAX_FILES, attach, findLead as findUploadLead, slotPath, usedSlots, signedUrl as longSignedUrl } from "../functions/lead-upload";
import { PRODUCT_NAME, type Job, type Limits, type StartArgs, type StartResult, type Store } from "./driveway-core";

const BUCKET = "lead-photos";
const JOB_COLUMNS = "id,created_at,lead_id,idem_key,job_type,width,height,input_path,result_path,status,calls,claimed_at,outcome";
const headers = (secret: string) => ({ ...auth(secret), "Content-Type": "application/json" });

async function rpc<T>(secret: string, fn: string, body: Record<string, unknown>): Promise<T | undefined> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: headers(secret), body: JSON.stringify(body) });
    if (!r.ok) {
      console.error(`${fn} failed:`, r.status, (await r.text()).slice(0, 200));
      return undefined;
    }
    return (await r.json()) as T;
  } catch (err) {
    console.error(`${fn} threw:`, err);
    return undefined;
  }
}

async function oneJob(secret: string, query: string): Promise<Job | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/driveway_jobs?${query}&select=${JOB_COLUMNS}&limit=1`, { headers: auth(secret) });
    const rows = r.ok ? ((await r.json()) as Job[]) : [];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function putObject(secret: string, path: string, bytes: Uint8Array): Promise<"ok" | "taken" | "error"> {
  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { ...auth(secret), "Content-Type": "image/jpeg", "x-upsert": "false" },
      body: bytes as BodyInit,
    });
    if (r.ok) return "ok";
    return r.status === 409 || (await r.text()).includes("Duplicate") ? "taken" : "error";
  } catch {
    return "error";
  }
}

/** Photos a lead may hold beyond its ten upload slots. */
const MAX_EXTRA_PHOTOS = 5;

/**
 * List a stored object on the lead as a named file (raw.files), once. Uses the
 * driveway_attach_file database function, which appends in a single statement,
 * so two pictures finishing together for one lead are both kept.
 */
async function attachFile(secret: string, leadId: string, path: string, name: string, size: number): Promise<boolean> {
  // Three tries: the bytes are already stored (and, for a result, paid for), so only the listing is repeated.
  for (let i = 0; i < 3; i++) {
    const url = await longSignedUrl(secret, path);
    const file = { url, path, name, content_type: "image/jpeg", size, added_at: new Date().toISOString(), from: PRODUCT_NAME };
    if (url && (await rpc<boolean>(secret, "driveway_attach_file", { p_lead: leadId, p_file: file })) === true) return true;
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  console.error(`driveway: stored ${path} but could not list it on the lead`);
  return false;
}

export function supabaseStore(secret: string): Store {
  return {
    async findLead(id) {
      const lead = await findUploadLead(secret, id);
      if (!lead) return null;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${lead.id}&select=id,phone&limit=1`, { headers: auth(secret) });
      const rows = r.ok ? ((await r.json()) as { id: string; phone: string | null }[]) : [];
      return rows[0] ?? null;
    },

    findJobByKey: (idemKey) => oneJob(secret, `idem_key=eq.${idemKey}`),
    getJob: (id) => oneJob(secret, `id=eq.${id}`),

    async savePhoto(leadId, bytes) {
      // The lead's ordinary upload slots first, so the photo shows in the CRM's
      // photo grid like one added on the thank-you screen.
      const used = await usedSlots(secret, leadId);
      for (let slot = 0; slot < MAX_FILES; slot++) {
        if (used.has(slot)) continue;
        const path = slotPath(leadId, slot);
        const put = await putObject(secret, path, bytes);
        if (put === "taken") continue;
        if (put === "error") return null;
        const url = await longSignedUrl(secret, path);
        const lead = await findUploadLead(secret, leadId);
        const onLead = Boolean(url && lead && (await attach(secret, lead, path, url, { size: bytes.length, type: "image/jpeg" }, "photo.jpg")));
        return { path, onLead };
      }
      // All ten slots are full. A few more photos are kept for their jobs and
      // listed on the lead as named files, in fixed places that can each be
      // written once; past that the lead takes no more.
      for (let n = 0; n < MAX_EXTRA_PHOTOS; n++) {
        const path = `${leadId}/driveway/in-${n}.jpg`;
        const put = await putObject(secret, path, bytes);
        if (put === "taken") continue;
        if (put === "error") return null;
        return { path, onLead: await attachFile(secret, leadId, path, "photo.jpg", bytes.length) };
      }
      return "full";
    },

    async startJob(a: StartArgs, limits: Limits): Promise<StartResult> {
      const res = await rpc<{ ok: boolean; existing?: boolean; reason?: "phone" | "ip" | "cap"; job?: Job }>(secret, "driveway_start", {
        p_idem_key: a.idemKey,
        p_lead_id: a.leadId,
        p_phone10: a.phone10,
        p_ip_hash: a.ipHash,
        p_job_type: a.jobType,
        p_width: a.width,
        p_height: a.height,
        p_input_path: a.inputPath,
        p_daily_cap: limits.dailyCap,
        p_per_phone: limits.perPhonePerDay,
        p_per_ip: limits.perIpPerDay,
      });
      if (!res) return { ok: false, reason: "error" };
      if (res.ok && res.job) return { ok: true, job: res.job, existing: Boolean(res.existing) };
      return { ok: false, reason: res.reason || "error" };
    },

    async claimJob(id, dailyCap) {
      return (await rpc<Job | null>(secret, "driveway_claim", { p_job: id, p_daily_cap: dailyCap })) ?? null;
    },

    async reserveRetry(id, dailyCap) {
      return (await rpc<boolean>(secret, "driveway_reserve_retry", { p_job: id, p_daily_cap: dailyCap })) === true;
    },

    async finishJob(id, patch) {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/driveway_jobs?id=eq.${id}&status=eq.working`, {
          method: "PATCH",
          headers: { ...headers(secret), Prefer: "return=minimal" },
          body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
        });
        return r.ok;
      } catch {
        return false;
      }
    },

    async expireJob(id, from) {
      await fetch(`${SUPABASE_URL}/rest/v1/driveway_jobs?id=eq.${id}&status=eq.${from}`, {
        method: "PATCH",
        headers: { ...headers(secret), Prefer: "return=minimal" },
        body: JSON.stringify({ status: "failed", outcome: "timeout", updated_at: new Date().toISOString() }),
      }).catch(() => {});
    },

    async readObject(path) {
      try {
        const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, { headers: auth(secret) });
        return r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
      } catch {
        return null;
      }
    },

    async saveResult(leadId, jobId, bytes) {
      const path = `${leadId}/driveway/${jobId}.jpg`;
      const put = await putObject(secret, path, bytes);
      if (put === "error") return null;
      // On the lead as a named file, never in the photo grid: Chris must be able
      // to tell a computer-made concept from a photo the customer took.
      await attachFile(secret, leadId, path, `${PRODUCT_NAME} concept picture (AI).jpg`, bytes.length);
      return path;
    },

    async signedUrl(path, seconds) {
      try {
        const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
          method: "POST",
          headers: headers(secret),
          body: JSON.stringify({ expiresIn: seconds }),
        });
        if (!r.ok) return null;
        const d = (await r.json()) as { signedURL?: string };
        return d.signedURL ? `${SUPABASE_URL}/storage/v1${d.signedURL}` : null;
      } catch {
        return null;
      }
    },

    async tagLead(leadId, tag) {
      await mergeRaw(secret, leadId, { driveway_generator: tag });
    },
  };
}
