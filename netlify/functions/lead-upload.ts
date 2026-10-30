/**
 * Netlify Function: photos and plans a visitor adds on the thank-you screen,
 * right after submitting a lead form. Files go straight to Supabase Storage
 * (the same private `lead-photos` bucket the CRM's email ingest uses), so they
 * show on the lead in the CRM: images in the Photos grid, PDFs and anything
 * the grid cannot draw (an iPhone HEIC from a desktop browser) as named files.
 *
 * Two steps per file, because Netlify caps a request body at 6 MB and a phone
 * photo or a plan set can be bigger:
 *   1. { step: "start", id, t, filename, content_type, size }
 *      returns { upload_url, path }: a one-time Supabase upload link. The
 *      browser PUTs the bytes there.
 *   2. { step: "finish", id, t, path, filename, content_type, size }
 *      records the file on the lead.
 *
 * Open to the internet, so every call needs the upload token submit-lead
 * returned for that lead (good for two hours), and a lead takes at most
 * MAX_FILES files this way.
 */

import { verifyUploadToken } from "../lib/lead-links";
import { SUPABASE_URL, UUID, auth } from "../lib/lead-db";

const BUCKET = "lead-photos";
const SIGN_TTL = 315_360_000; // ~10 years, same as the CRM ingest: <img> on a private bucket
export const MAX_FILES = 10;
export const MAX_BYTES = 25 * 1024 * 1024;
// Images the CRM's photo grid can draw. Anything else allowed is stored as a file.
const GRID_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const allowedType = (t: string): boolean => t.startsWith("image/") || t === "application/pdf";
const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "file";

type Body = {
  step?: string;
  id?: string;
  t?: string;
  filename?: string;
  content_type?: string;
  size?: number;
  path?: string;
};

type LeadFile = { path?: string };

async function signedUrl(secret: string, path: string): Promise<string | null> {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...auth(secret), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: SIGN_TTL }),
  });
  if (!r.ok) return null;
  const d = (await r.json()) as { signedURL?: string };
  return d.signedURL ? `${SUPABASE_URL}/storage/v1${d.signedURL}` : null;
}

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return json({ error: "Server config missing" }, 500);

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const id = body.id && UUID.test(body.id) ? body.id : "";
  if (!id || !verifyUploadToken(id, body.t)) return json({ error: "This upload link has expired." }, 403);

  const contentType = (body.content_type || "").toLowerCase().slice(0, 100);
  if (!allowedType(contentType)) return json({ error: "Photos and PDFs only." }, 400);
  if (typeof body.size !== "number" || body.size <= 0 || body.size > MAX_BYTES) {
    return json({ error: "Each file can be up to 25 MB." }, 413);
  }

  const cur = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}&select=photos,raw`, { headers: auth(secret) });
  const rows = cur.ok ? ((await cur.json()) as { photos?: string[] | null; raw?: Record<string, unknown> | null }[]) : [];
  if (!rows.length) return json({ error: "Lead not found" }, 404);
  const photos = Array.isArray(rows[0].photos) ? rows[0].photos : [];
  const raw = (rows[0].raw && typeof rows[0].raw === "object" ? rows[0].raw : {}) as Record<string, unknown>;
  const files = Array.isArray(raw.files) ? (raw.files as LeadFile[]) : [];
  const webCount = typeof raw.web_uploads === "number" ? raw.web_uploads : 0;
  if (webCount >= MAX_FILES) return json({ error: `Up to ${MAX_FILES} files per request.` }, 429);

  if (body.step === "start") {
    const path = `${id}/web/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe(body.filename || "file")}`;
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
      method: "POST",
      headers: auth(secret),
    });
    if (!r.ok) return json({ error: "Could not create upload link" }, 502);
    const d = (await r.json()) as { url?: string };
    if (!d.url) return json({ error: "Could not create upload link" }, 502);
    return json({ ok: true, upload_url: `${SUPABASE_URL}/storage/v1${d.url}`, path }, 200);
  }

  if (body.step === "finish") {
    const path = body.path || "";
    if (!path.startsWith(`${id}/web/`) || path.includes("..")) return json({ error: "Bad path" }, 400);
    if (photos.some((u) => u.includes(path)) || files.some((f) => f?.path === path)) {
      return json({ ok: true, deduped: true }, 200);
    }
    const url = await signedUrl(secret, path);
    if (!url) return json({ error: "File not found in storage" }, 404);

    const patch: Record<string, unknown> = { raw: { ...raw, web_uploads: webCount + 1 } };
    if (GRID_TYPES.has(contentType)) {
      patch.photos = [...photos, url];
    } else {
      (patch.raw as Record<string, unknown>).files = [
        ...files,
        {
          url,
          path,
          name: (body.filename || "file").slice(0, 160),
          content_type: contentType,
          size: body.size,
          added_at: new Date().toISOString(),
          from: "website form",
        },
      ];
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...auth(secret), "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return json({ error: "Could not save the file on your request" }, 502);
    return json({ ok: true }, 200);
  }

  return json({ error: 'step must be "start" or "finish"' }, 400);
};
