/**
 * Local mock for the Driveway Generator. A Vite dev-server plugin, loaded only
 * when DRIVEWAY_MOCK is set (npm run dev:driveway-mock). It answers the page's
 * three server calls from memory, with a fake image editor.
 *
 * It makes NO outside calls: no Supabase, no OpenAI, no email to Chris. It runs
 * the real start, worker and status handlers and the real geometry gate, so
 * the whole flow can be walked in a browser for free.
 *
 * The phone number's last four digits pick what happens:
 *   0101  the picture "moves" twice     -> failure screen
 *   0102  the daily cap is reached      -> "full for today" screen
 *   0103  the model errors twice        -> failure screen
 *   0104  moves once, then is fine      -> result after one retry
 *   0105  this phone is over its limit  -> limit screen
 *   anything else                       -> result
 * DRIVEWAY_MOCK=off answers as if the flag were off. DRIVEWAY_MOCK_DELAY sets
 * the fake model's seconds per call (default 6).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { handleStart, handleStatus, runJob, type Deps } from "../netlify/lib/driveway-core";
import { memoryStore } from "../netlify/lib/driveway-memory-store";
import { mockEditor, type MockMode } from "../netlify/lib/driveway-mock-editor";

const body = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });

async function send(res: ServerResponse, r: Response): Promise<void> {
  res.statusCode = r.status;
  r.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(Buffer.from(await r.arrayBuffer()));
}

export function drivewayMock(): Plugin {
  const off = process.env.DRIVEWAY_MOCK === "off";
  // Job tokens are signed with this; any value works for a mock.
  process.env.LEAD_LINK_SECRET ||= "mock-link-secret";
  const delay = (Number(process.env.DRIVEWAY_MOCK_DELAY) || 6) * 1000;
  const store = memoryStore();
  const modes = new Map<string, MockMode | "cap" | "phone">();
  const submissions: Record<string, unknown>[] = [];
  const byPhone = new Map<string, string>();
  const modeOfJob = new Map<string, MockMode>();
  let current: MockMode = "ok";
  const editor = mockEditor(() => current, delay);

  const deps = (leadId: string): Deps => {
    const mode = modes.get(leadId) || "ok";
    const d: Deps = {
      enabled: !off,
      store,
      editor,
      limits: { dailyCap: mode === "cap" ? 0 : 40, perPhonePerDay: mode === "phone" ? 0 : 3, perIpPerDay: 1000 },
      secret: "mock-secret",
      kick: async (jobId) => {
        if (mode !== "cap" && mode !== "phone") modeOfJob.set(jobId, mode);
        // The worker, in this same process. One job at a time is plenty for a mock.
        void (async () => {
          current = modeOfJob.get(jobId) || "ok";
          editor.calls = 0;
          await runJob(jobId, d);
        })();
        return true;
      },
      verifyUpload: (_id, t) => t === "mock-upload-token",
      now: () => Date.now(),
      log: (line) => console.log(`[driveway mock] ${line}`),
    };
    return d;
  };

  return {
    name: "driveway-mock",
    apply: "serve",
    configureServer(server) {
      console.log(`\n[driveway mock] ON${off ? " (answering as switched off)" : ""}. No Supabase, no OpenAI, no email.\n`);
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        try {
          if (url.pathname === "/.netlify/functions/submit-lead") {
            const p = JSON.parse((await body(req)).toString() || "{}") as Record<string, unknown>;
            submissions.push(p);
            const digits = String(p.phone || "").replace(/\D/g, "").slice(-10);
            let id = byPhone.get(digits);
            if (!id) {
              id = crypto.randomUUID();
              byPhone.set(digits, id);
              store.leads.set(id, { id, phone: String(p.phone || ""), photos: [], files: [] });
            }
            const pick: Record<string, MockMode | "cap" | "phone"> = { "0101": "moved", "0102": "cap", "0103": "error", "0104": "moved-then-ok", "0105": "phone" };
            modes.set(id, pick[digits.slice(-4)] || "ok");
            return send(res, Response.json({ ok: true, id, upload_token: "mock-upload-token", notify: "mock" }));
          }
          if (url.pathname === "/.netlify/functions/driveway-start" || url.pathname === "/.netlify/functions/driveway-status") {
            const raw = req.method === "GET" ? undefined : await body(req);
            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
            const request = new Request(url, { method: req.method, headers, body: raw ? new Blob([new Uint8Array(raw).slice().buffer]) : undefined });
            if (url.pathname.endsWith("driveway-status")) return send(res, await handleStatus(request, deps("")));
            let leadId = "";
            if (raw) {
              try {
                leadId = String((await request.clone().formData()).get("lead_id") || "");
              } catch {
                /* the handler will answer 400 */
              }
            }
            return send(res, await handleStart(request, deps(leadId), req.socket.remoteAddress));
          }
          if (url.pathname.startsWith("/__driveway_mock/object/")) {
            const bytes = store.objects.get(decodeURIComponent(url.pathname.slice("/__driveway_mock/object/".length)));
            if (!bytes) return send(res, new Response("not found", { status: 404 }));
            return send(res, new Response(new Blob([bytes.slice().buffer]), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" } }));
          }
          if (url.pathname === "/__driveway_mock/reset") {
            for (const m of [store.jobs, store.objects, store.leads, store.days, modes, byPhone, modeOfJob]) m.clear();
            submissions.length = 0;
            return send(res, Response.json({ ok: true }));
          }
          if (url.pathname === "/__driveway_mock/state") {
            return send(
              res,
              Response.json({
                submissions,
                leads: [...store.leads.values()],
                jobs: [...store.jobs.values()],
                calls_reserved: store.callsReserved(),
                objects: [...store.objects.entries()].map(([path, b]) => ({ path, bytes: b.length })),
              })
            );
          }
        } catch (err) {
          console.error("[driveway mock]", err);
          return send(res, Response.json({ error: "mock failed" }, { status: 500 }));
        }
        next();
      });
    },
  };
}
