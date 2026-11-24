/**
 * An in-memory stand-in for the Supabase store, with the same rules as
 * supabase/driveway-generator.sql. Used by the tests and by the local mock
 * (scripts/driveway-mock.ts). Never used on the live site: it forgets
 * everything on restart, which is exactly what the real store must not do.
 */

import type { Job, Limits, StartArgs, StartResult, Store } from "./driveway-core";

export type MemoryStore = Store & {
  jobs: Map<string, Job & { phone10: string; ip_hash: string; day: string; detail?: unknown }>;
  objects: Map<string, Uint8Array>;
  leads: Map<string, { id: string; phone: string | null; photos: string[]; files: string[]; tag?: Record<string, unknown> }>;
  /** Paid image calls reserved per day. */
  days: Map<string, number>;
  callsReserved(): number;
};

export function memoryStore(now: () => number = Date.now): MemoryStore {
  const jobs: MemoryStore["jobs"] = new Map();
  const objects = new Map<string, Uint8Array>();
  const leads: MemoryStore["leads"] = new Map();
  const days = new Map<string, number>();
  const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date(now()));
  const reserve = (cap: number): boolean => {
    const d = today();
    const n = days.get(d) || 0;
    if (n >= cap) return false;
    days.set(d, n + 1);
    return true;
  };
  const view = (j: Job): Job => ({ ...j });

  return {
    jobs,
    objects,
    leads,
    days,
    callsReserved: () => [...days.values()].reduce((a, b) => a + b, 0),

    async findLead(id) {
      const l = leads.get(id);
      return l ? { id: l.id, phone: l.phone } : null;
    },
    async findJobByKey(key) {
      const j = [...jobs.values()].find((x) => x.idem_key === key);
      return j ? view(j) : null;
    },
    async getJob(id) {
      const j = jobs.get(id);
      return j ? view(j) : null;
    },
    async savePhoto(leadId, bytes) {
      const lead = leads.get(leadId);
      if (!lead) return null;
      const path = `${leadId}/web/${lead.photos.length}`;
      objects.set(path, bytes);
      lead.photos.push(path);
      return path;
    },
    async startJob(a: StartArgs, limits: Limits): Promise<StartResult> {
      // No await between the checks and the insert: one JavaScript turn, the
      // same all-or-nothing the database function gets from its lock.
      const seen = [...jobs.values()].find((x) => x.idem_key === a.idemKey);
      if (seen) return { ok: true, job: view(seen), existing: true };
      const d = today();
      const mine = [...jobs.values()].filter((x) => x.day === d);
      if (mine.filter((x) => x.phone10 === a.phone10).length >= limits.perPhonePerDay) return { ok: false, reason: "phone" };
      if (mine.filter((x) => x.ip_hash === a.ipHash).length >= limits.perIpPerDay) return { ok: false, reason: "ip" };
      if (!reserve(limits.dailyCap)) return { ok: false, reason: "cap" };
      const job = {
        id: crypto.randomUUID(),
        created_at: new Date(now()).toISOString(),
        lead_id: a.leadId,
        idem_key: a.idemKey,
        job_type: a.jobType,
        width: a.width,
        height: a.height,
        input_path: a.inputPath,
        result_path: null,
        status: "queued" as const,
        calls: 1,
        claimed_at: null,
        outcome: null,
        phone10: a.phone10,
        ip_hash: a.ipHash,
        day: d,
      };
      jobs.set(job.id, job);
      return { ok: true, job: view(job), existing: false };
    },
    async claimJob(id) {
      const j = jobs.get(id);
      if (!j || j.status !== "queued") return null;
      j.status = "working";
      j.claimed_at = new Date(now()).toISOString();
      return view(j);
    },
    async reserveRetry(id, cap) {
      const j = jobs.get(id);
      if (!j || j.status !== "working" || j.calls !== 1) return false;
      if (!reserve(cap)) return false;
      j.calls = 2;
      return true;
    },
    async finishJob(id, patch) {
      const j = jobs.get(id);
      if (!j || j.status !== "working") return false;
      j.status = patch.status;
      j.outcome = patch.outcome;
      if (patch.result_path) j.result_path = patch.result_path;
      j.detail = patch.detail;
      return true;
    },
    async expireJob(id, from) {
      const j = jobs.get(id);
      if (j && j.status === from) {
        j.status = "failed";
        j.outcome = "timeout";
      }
    },
    async readObject(path) {
      return objects.get(path) ?? null;
    },
    async saveResult(leadId, jobId, bytes) {
      const path = `${leadId}/driveway/${jobId}.jpg`;
      objects.set(path, bytes);
      leads.get(leadId)?.files.push(path);
      return path;
    },
    async signedUrl(path, seconds) {
      return objects.has(path) ? `/__driveway_mock/object/${path}?expires=${Math.floor(now() / 1000) + seconds}` : null;
    },
    async tagLead(leadId, tag) {
      const l = leads.get(leadId);
      if (l) l.tag = tag;
    },
  };
}
