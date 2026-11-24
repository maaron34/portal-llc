/**
 * Start, worker and status against the in-memory store and the mock editor.
 * No network, no Supabase, no OpenAI.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { handleStart, handleStatus, handleWorker, jobToken, runJob, verifyJobToken, type Deps, type Limits } from "../driveway-core";
import { memoryStore, type MemoryStore } from "../driveway-memory-store";
import { mockEditor, type MockMode } from "../driveway-mock-editor";
import { encodeJpeg } from "../driveway-image";
import { fixtureBytes } from "./helpers";

const SECRET = "test-secret";
const UPLOAD = "upload-ok";
const LIMITS: Limits = { dailyCap: 40, perPhonePerDay: 3, perIpPerDay: 8 };
let PHOTO: Uint8Array;
beforeAll(() => {
  process.env.LEAD_LINK_SECRET = SECRET;
  PHOTO = fixtureBytes("photo1.jpg");
});

type World = { deps: Deps; store: MemoryStore; editor: ReturnType<typeof mockEditor>; kicked: string[]; clock: { t: number }; lead(phone?: string): string };

function world(opts: { mode?: MockMode | ((call: number) => MockMode); limits?: Partial<Limits>; enabled?: boolean; noEditor?: boolean; kickFails?: boolean } = {}): World {
  const clock = { t: Date.parse("2026-11-24T18:00:00Z") };
  const store = memoryStore(() => clock.t);
  const mode = opts.mode ?? "ok";
  const editor = mockEditor((_req, call) => (typeof mode === "function" ? mode(call) : mode));
  const kicked: string[] = [];
  const deps: Deps = {
    enabled: opts.enabled ?? true,
    store,
    editor: opts.noEditor ? null : editor,
    limits: { ...LIMITS, ...opts.limits },
    secret: SECRET,
    kick: async (id) => {
      kicked.push(id);
      return !opts.kickFails;
    },
    verifyUpload: (_id, t) => t === UPLOAD,
    now: () => clock.t,
    log: () => {},
  };
  let n = 0;
  return {
    deps,
    store,
    editor,
    kicked,
    clock,
    lead(phone) {
      const id = crypto.randomUUID();
      store.leads.set(id, { id, phone: phone ?? `(206) 555-${String(1000 + n++)}`, photos: [], files: [] });
      return id;
    },
  };
}

function startRequest(leadId: string, o: { key?: string; jobType?: string; photo?: Uint8Array | null; t?: string; ip?: string } = {}): Request {
  const form = new FormData();
  form.set("lead_id", leadId);
  form.set("t", o.t ?? UPLOAD);
  form.set("key", o.key ?? crypto.randomUUID());
  form.set("job_type", o.jobType ?? "Front steps");
  if (o.photo !== null) form.set("photo", new Blob([(o.photo ?? PHOTO) as BlobPart], { type: "image/jpeg" }), "photo.jpg");
  return new Request("https://example.test/.netlify/functions/driveway-start", { method: "POST", body: form, headers: { "x-nf-client-connection-ip": o.ip ?? "203.0.113.7" } });
}
const start = async (w: World, leadId: string, o: Parameters<typeof startRequest>[1] = {}) => {
  const res = await handleStart(startRequest(leadId, o), w.deps);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};
const status = async (w: World, body: Record<string, unknown>) => {
  const res = await handleStatus(new Request("https://example.test/s", { method: "POST", body: JSON.stringify(body) }), w.deps);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};

describe("status flow", () => {
  it("goes working -> done, with two short-lived links and the photo and result on the lead", async () => {
    const w = world();
    const lead = w.lead();
    const s = await start(w, lead);
    expect(s.status).toBe(200);
    const job = String(s.body.job), t = String(s.body.t);
    expect(w.kicked).toEqual([job]);
    expect((await status(w, { job, t })).body.status).toBe("working");

    expect(await runJob(job, w.deps)).toEqual({ ran: true, outcome: "ok" });
    const done = (await status(w, { job, t })).body;
    expect(done.status).toBe("done");
    expect(done.job_type).toBe("Front steps");
    expect([done.width, done.height]).toEqual([640, 480]);
    const expires = Number(new URL(String(done.after_url), "https://x.test").searchParams.get("expires"));
    expect(expires - Math.floor(w.clock.t / 1000)).toBe(15 * 60);
    expect(w.store.leads.get(lead)!.photos).toHaveLength(1);
    expect(w.store.leads.get(lead)!.files).toEqual([`${lead}/driveway/${job}.jpg`]);
    expect(w.store.leads.get(lead)!.tag).toMatchObject({ job_type: "Front steps", job_id: job, result: "picture made" });
    expect(w.editor.calls).toBe(1);
  });

  it("retries once when the picture moved, then succeeds", async () => {
    const w = world({ mode: "moved-then-ok" });
    const s = await start(w, w.lead());
    expect(await runJob(String(s.body.job), w.deps)).toEqual({ ran: true, outcome: "ok" });
    expect(w.editor.calls).toBe(2);
    expect(w.store.callsReserved()).toBe(2);
  });

  it("gives up after the second moved picture and never shows it", async () => {
    const w = world({ mode: "moved" });
    const lead = w.lead();
    const s = await start(w, lead);
    expect(await runJob(String(s.body.job), w.deps)).toEqual({ ran: true, outcome: "moved" });
    expect(w.editor.calls).toBe(2);
    const st = (await status(w, { job: s.body.job, t: s.body.t })).body;
    expect(st.status).toBe("failed");
    expect(st.after_url).toBeUndefined();
    expect(w.store.leads.get(lead)!.files).toEqual([]);
    // The homeowner's own photo is still on the lead for Chris.
    expect(w.store.leads.get(lead)!.photos).toHaveLength(1);
  });

  it("does not retry a refusal, and retries a server error once", async () => {
    const refused = world({ mode: "refused" });
    await runJob(String((await start(refused, refused.lead())).body.job), refused.deps);
    expect(refused.editor.calls).toBe(1);
    const flaky = world({ mode: "error" });
    expect(await runJob(String((await start(flaky, flaky.lead())).body.job), flaky.deps)).toEqual({ ran: true, outcome: "error" });
    expect(flaky.editor.calls).toBe(2);
  });

  it("runs a job once even when the worker message is delivered twice", async () => {
    const w = world();
    const job = String((await start(w, w.lead())).body.job);
    const both = await Promise.all([runJob(job, w.deps), runJob(job, w.deps), runJob(job, w.deps)]);
    expect(both.filter((r) => r.ran)).toHaveLength(1);
    expect(w.editor.calls).toBe(1);
  });

  it("re-sends a lost worker message, then closes out a job that never started", async () => {
    const w = world({ kickFails: true });
    const s = await start(w, w.lead());
    const ask = () => status(w, { job: s.body.job, t: s.body.t });
    w.clock.t += 5_000;
    expect((await ask()).body.status).toBe("working");
    expect(w.kicked).toHaveLength(1);
    w.clock.t += 16_000;
    await ask();
    expect(w.kicked).toHaveLength(2);
    w.clock.t += 5 * 60_000;
    expect((await ask()).body.status).toBe("failed");
    // Too late to run now: nothing is charged after the page was told it failed.
    expect(await runJob(String(s.body.job), w.deps)).toEqual({ ran: false });
    expect(w.editor.calls).toBe(0);
  });

  it("closes out a job whose worker died mid-call", async () => {
    const w = world();
    const s = await start(w, w.lead());
    await w.store.claimJob(String(s.body.job));
    w.clock.t += 8 * 60_000;
    expect((await status(w, { job: s.body.job, t: s.body.t })).body.status).toBe("failed");
  });

  it("finds the job again after a reload, by lead and request key", async () => {
    const w = world();
    const lead = w.lead();
    const key = crypto.randomUUID();
    expect((await status(w, { lead_id: lead, t: UPLOAD, key })).body.status).toBe("none");
    const s = await start(w, lead, { key });
    const found = (await status(w, { lead_id: lead, t: UPLOAD, key })).body;
    expect(found.job).toBe(s.body.job);
    expect(found.status).toBe("working");
    // Someone else's lead cannot look it up with the same key.
    expect((await status(w, { lead_id: w.lead(), t: UPLOAD, key })).body.status).toBe("none");
    expect((await status(w, { lead_id: lead, t: "wrong", key })).status).toBe(403);
  });
});

describe("who may ask", () => {
  it("needs the token as well as the job id", async () => {
    const w = world();
    const s = await start(w, w.lead());
    expect((await status(w, { job: s.body.job, t: "1.bad" })).status).toBe(403);
    expect((await status(w, { job: s.body.job })).status).toBe(403);
    expect((await status(w, { job: crypto.randomUUID(), t: s.body.t })).status).toBe(403);
  });
  it("job tokens expire after two hours and cannot be moved to another job", () => {
    const now = Date.now();
    const a = crypto.randomUUID(), b = crypto.randomUUID();
    const t = jobToken(a, now);
    expect(verifyJobToken(a, t, now)).toBe(true);
    expect(verifyJobToken(b, t, now)).toBe(false);
    expect(verifyJobToken(a, t, now + 2 * 60 * 60 * 1000 + 1)).toBe(false);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });
  it("start needs the upload token submit-lead issued for that lead", async () => {
    const w = world();
    expect((await start(w, w.lead(), { t: "nope" })).status).toBe(403);
    expect((await start(w, crypto.randomUUID())).status).toBe(403);
    expect(w.store.callsReserved()).toBe(0);
  });
  it("the worker refuses a caller without the internal secret", async () => {
    const w = world();
    const job = String((await start(w, w.lead())).body.job);
    const call = (auth: string) => handleWorker(new Request("https://example.test/w", { method: "POST", headers: { "x-internal-auth": auth }, body: JSON.stringify({ job }) }), w.deps);
    expect((await call("wrong")).status).toBe(401);
    expect(w.editor.calls).toBe(0);
    expect((await call(SECRET)).status).toBe(200);
    expect(w.editor.calls).toBe(1);
  });
});

describe("validation", () => {
  it("refuses a missing photo, a non-photo, a bad job type and a bad key, and charges nothing", async () => {
    const w = world();
    const lead = w.lead();
    expect((await start(w, lead, { photo: null })).status).toBe(400);
    expect((await start(w, lead, { photo: new TextEncoder().encode("not a photo") })).status).toBe(400);
    expect((await start(w, lead, { photo: encodeJpeg({ width: 100, height: 80, data: new Uint8Array(100 * 80 * 4) }) })).status).toBe(400);
    expect((await start(w, lead, { jobType: "Stamped pool deck" })).status).toBe(400);
    expect((await start(w, lead, { key: "not-a-uuid" })).status).toBe(400);
    expect(w.store.callsReserved()).toBe(0);
    expect(w.store.objects.size).toBe(0);
  });
  it("refuses an oversized body before reading it", async () => {
    const w = world();
    const res = await handleStart(new Request("https://example.test/s", { method: "POST", headers: { "content-length": String(9 * 1024 * 1024), "content-type": "multipart/form-data; boundary=x" }, body: "x" }), w.deps);
    expect(res.status).toBe(413);
  });
  it("refuses a lead with no usable phone number", async () => {
    const w = world();
    expect((await start(w, w.lead("555"))).status).toBe(400);
  });
});

describe("limits", () => {
  it("a double tap or a re-send uses the same job and one call", async () => {
    const w = world();
    const lead = w.lead();
    const key = crypto.randomUUID();
    const all = await Promise.all([start(w, lead, { key }), start(w, lead, { key }), start(w, lead, { key })]);
    expect(new Set(all.map((r) => r.body.job)).size).toBe(1);
    expect((await start(w, lead, { key })).body.job).toBe(all[0].body.job);
    expect(w.store.callsReserved()).toBe(1);
    expect(w.store.jobs.size).toBe(1);
    expect(w.kicked).toHaveLength(1);
  });

  it("stops a phone number at its daily limit", async () => {
    const w = world();
    const lead = w.lead("(206) 555-0142");
    for (let i = 0; i < 3; i++) expect((await start(w, lead, { ip: `198.51.100.${i}` })).status).toBe(200);
    const fourth = await start(w, lead, { ip: "198.51.100.99" });
    expect(fourth.status).toBe(429);
    expect(fourth.body).toEqual({ error: "limit", reason: "phone" });
    // The same number written another way is the same number.
    const again = w.lead("+1 206.555.0142");
    expect((await start(w, again)).body.reason).toBe("phone");
    expect(w.store.callsReserved()).toBe(3);
  });

  it("stops an address at its daily limit, whatever phone numbers it uses", async () => {
    const w = world();
    for (let i = 0; i < 8; i++) expect((await start(w, w.lead(), { ip: "203.0.113.50" })).status).toBe(200);
    expect((await start(w, w.lead(), { ip: "203.0.113.50" })).body.reason).toBe("ip");
    expect((await start(w, w.lead(), { ip: "203.0.113.51" })).status).toBe(200);
  });

  it("the limits start over the next day in Seattle", async () => {
    const w = world({ limits: { dailyCap: 1 } });
    expect((await start(w, w.lead())).status).toBe(200);
    expect((await start(w, w.lead(), { ip: "198.51.100.1" })).body.reason).toBe("cap");
    w.clock.t += 24 * 60 * 60 * 1000;
    expect((await start(w, w.lead(), { ip: "198.51.100.2" })).status).toBe(200);
  });

  it("never reserves more calls than the daily cap, with 200 requests at once and every picture needing its retry", async () => {
    const w = world({ mode: "moved", limits: { dailyCap: 40, perIpPerDay: 1000 } });
    const starts = await Promise.all(Array.from({ length: 200 }, (_, i) => start(w, w.lead(), { ip: `10.0.${i % 250}.${i % 7}` })));
    const admitted = starts.filter((s) => s.status === 200);
    expect(admitted).toHaveLength(40);
    expect(starts.filter((s) => s.body.reason === "cap")).toHaveLength(160);
    // Every worker runs at the same moment and every one wants a second call: none may get it.
    await Promise.all(admitted.flatMap((s) => [runJob(String(s.body.job), w.deps), runJob(String(s.body.job), w.deps)]));
    expect(w.store.callsReserved()).toBe(40);
    expect(w.editor.calls).toBeLessThanOrEqual(40);
  }, 60_000);

  it("retries draw from the same cap as first tries", async () => {
    const w = world({ mode: "moved", limits: { dailyCap: 5, perIpPerDay: 1000 } });
    const a = await start(w, w.lead());
    const b = await start(w, w.lead());
    const c = await start(w, w.lead());
    await runJob(String(a.body.job), w.deps); // uses its retry: 4 reserved
    await runJob(String(b.body.job), w.deps); // uses its retry: 5 reserved
    await runJob(String(c.body.job), w.deps); // no retry left to reserve
    expect(w.store.callsReserved()).toBe(5);
    expect(w.editor.calls).toBe(5);
    expect((await start(w, w.lead())).body.reason).toBe("cap");
  });

  it("keeps the homeowner's photo on the lead even when no picture can be made", async () => {
    const w = world({ limits: { dailyCap: 0 } });
    const lead = w.lead();
    expect((await start(w, lead)).body).toEqual({ error: "limit", reason: "cap" });
    expect(w.store.leads.get(lead)!.photos).toHaveLength(1);
    expect(w.store.leads.get(lead)!.tag).toMatchObject({ job_type: "Front steps" });
  });
});

describe("flag and key", () => {
  it("is off unless the flag is on: the page is told, and nothing else answers", async () => {
    const w = world({ enabled: false });
    const cfg = await handleStart(new Request("https://example.test/s"), w.deps);
    expect(await cfg.json()).toEqual({ enabled: false });
    expect((await start(w, w.lead())).status).toBe(404);
    expect((await status(w, { job: crypto.randomUUID(), t: "x" })).status).toBe(404);
    expect(w.store.objects.size).toBe(0);
  });
  it("with the flag on and no API key, makes no job and no call", async () => {
    const w = world({ noEditor: true });
    expect((await start(w, w.lead())).body).toEqual({ error: "limit", reason: "cap" });
    expect(w.store.jobs.size).toBe(0);
  });
});
