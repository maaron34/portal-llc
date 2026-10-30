/**
 * Netlify Function: photos and plans a visitor adds on the thank-you screen,
 * right after submitting a lead form. Files go straight to Supabase Storage
 * (the same private `lead-photos` bucket the CRM's email ingest uses), so they
 * show on the lead in the CRM: images in the Photos grid, PDFs and anything
 * the grid cannot draw (an iPhone HEIC from a desktop browser) as named files.
 *
 * Two steps per file, because Netlify caps a request body at 6 MB and a phone
 * photo or a plan set can be bigger:
 *   1. { step: "start", id, t, slot } returns { upload_url }: a one-time
 *      Supabase upload link for that slot. The browser PUTs the bytes there.
 *   2. { step: "finish", id, t, slot, filename } checks what storage actually
 *      holds (type, size) and records the file on the lead.
 *
 * Open to the internet, so every call needs the upload token submit-lead
 * returned for that lead (good for two hours), and a lead takes at most
 * MAX_FILES files this way (see slotPath).
 */

import { verifyUploadToken } from "../lib/lead-links";
import { SUPABASE_URL, UUID, auth, mergeRaw } from "../lib/lead-db";

const BUCKET = "lead-photos";
const SIGN_TTL = 315_360_000; // ~10 years, same as the CRM ingest: <img> on a private bucket
export const MAX_FILES = 10;
export const MAX_BYTES = 25 * 1024 * 1024;
// Images the CRM's photo grid can draw. Anything else allowed is stored as a file.
const GRID_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const allowedType = (t: string): boolean => t.startsWith("image/") || t === "application/pdf";

/**
 * Each lead has exactly MAX_FILES upload slots, `<lead>/web/0` to `/9`, and a
 * slot can be written once (the upload link is signed without upsert). That
 * caps what one token can put in the bucket at ten objects, however many links
 * a caller asks for, with no counter to keep in step.
 */
export const slotPath = (id: string, slot: number): string => `${id}/web/${slot}`;

type Body = {
  step?: string;
  id?: string;
  t?: string;
  slot?: number;
  filename?: string;
};

type LeadFile = { path?: string };
type LeadRow = { id: string; photos?: string[] | null; raw?: Record<string, unknown> | null };

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

// The lead the token was issued for, or the older lead notify-lead folded it
// into a moment after submit (it records raw.auto_merged_from on the survivor).
async function findLead(secret: string, id: string): Promise<LeadRow | null> {
  const sel = "select=id,photos,raw";
  for (const q of [`id=eq.${id}`, `raw->>auto_merged_from=eq.${id}`]) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?${q}&${sel}&limit=1`, { headers: auth(secret) });
    const rows = r.ok ? ((await r.json()) as LeadRow[]) : [];
    if (rows.length) return rows[0];
  }
  return null;
}

// What storage actually holds, not what the browser said it would send.
async function objectInfo(secret: string, path: string): Promise<{ size: number; type: string } | null> {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/info/${BUCKET}/${path}`, { headers: auth(secret) });
  if (!r.ok) return null;
  const d = (await r.json()) as { size?: number; content_type?: string; metadata?: { size?: number; mimetype?: string } };
  const size = Number(d.size ?? d.metadata?.size ?? NaN);
  const type = String(d.content_type ?? d.metadata?.mimetype ?? "").toLowerCase();
  return Number.isFinite(size) ? { size, type } : null;
}

async function removeObject(secret: string, path: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, { method: "DELETE", headers: auth(secret) }).catch(() => {});
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
  const slot = Number(body.slot);
  if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_FILES) {
    return json({ error: `Up to ${MAX_FILES} files per request.` }, 429);
  }
  const path = slotPath(id, slot);

  if (body.step === "start") {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
      method: "POST",
      headers: auth(secret),
    });
    if (!r.ok) return json({ error: "Could not create upload link" }, 502);
    const d = (await r.json()) as { url?: string };
    if (!d.url) return json({ error: "Could not create upload link" }, 502);
    return json({ ok: true, upload_url: `${SUPABASE_URL}/storage/v1${d.url}` }, 200);
  }

  if (body.step === "finish") {
    const info = await objectInfo(secret, path);
    if (!info) return json({ error: "File not found in storage" }, 404);
    if (!allowedType(info.type) || info.size <= 0 || info.size > MAX_BYTES) {
      await removeObject(secret, path);
      return json({ error: "Photos and PDFs up to 25 MB only." }, 400);
    }

    const lead = await findLead(secret, id);
    if (!lead) return json({ error: "Lead not found" }, 404);
    const photos = Array.isArray(lead.photos) ? lead.photos : [];
    const raw = (lead.raw && typeof lead.raw === "object" ? lead.raw : {}) as Record<string, unknown>;
    const files = Array.isArray(raw.files) ? (raw.files as LeadFile[]) : [];
    if (photos.some((u) => u.includes(path)) || files.some((f) => f?.path === path)) {
      return json({ ok: true, deduped: true }, 200);
    }
    const url = await signedUrl(secret, path);
    if (!url) return json({ error: "File not found in storage" }, 404);

    // Photos are their own column. Files go through merge_raw, which replaces
    // only the `files` key, so the notes notify-lead is writing to raw at the
    // same moment (draft reply, scam check) are never overwritten.
    let saved: boolean;
    if (GRID_TYPES.has(info.type)) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${lead.id}`, {
        method: "PATCH",
        headers: { ...auth(secret), "Content-Type": "application/json" },
        body: JSON.stringify({ photos: [...photos, url] }),
      });
      saved = res.ok;
    } else {
      saved = await mergeRaw(secret, lead.id, {
        files: [
          ...files,
          {
            url,
            path,
            name: (body.filename || "file").slice(0, 160),
            content_type: info.type,
            size: info.size,
            added_at: new Date().toISOString(),
            from: "website form",
          },
        ],
      });
    }
    if (!saved) return json({ error: "Could not save the file on your request" }, 502);
    return json({ ok: true }, 200);
  }

  return json({ error: 'step must be "start" or "finish"' }, 400);
};
