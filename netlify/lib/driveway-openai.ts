/**
 * The one call that costs money: send the homeowner's photo to OpenAI's image
 * EDIT endpoint and get the same photo back with new concrete. Never
 * text-to-image; the photo is always the input.
 *
 * Checked against OpenAI's own reference on 2026-11-24
 * (developers.openai.com/api/reference/resources/images/methods/edit) and one
 * live run by Michael's other session the same day:
 *   POST https://api.openai.com/v1/images/edits, multipart form
 *   fields model, prompt, size "WIDTHxHEIGHT" (both multiples of 16), quality, n, image
 *   answer data[0].b64_json (a PNG unless output_format says otherwise) and usage
 * The default model, gpt-image-2.5-sunburst, took 44 to 57 seconds a picture at
 * quality "high" in that run, which is why this runs in a background function.
 *
 * The key comes from OPENAI_IMAGE_API_KEY and is only ever read here, on the
 * server. It is never logged and never sent to the browser.
 */

import { PNG } from "pngjs";
import { encodeJpeg } from "./driveway-image";

export const JOB_TYPES = ["Driveway", "Front steps", "Patio", "Walkway", "Retaining wall"] as const;
export type JobType = (typeof JOB_TYPES)[number];
export const isJobType = (v: unknown): v is JobType => typeof v === "string" && (JOB_TYPES as readonly string[]).includes(v);

/**
 * Finish is always plain gray concrete. No pavers, stamping, color or exposed
 * aggregate: the picture must not promise a finish Chris has not agreed to.
 *
 * Driveway and Front steps are the wording from the live run of 2026-11-24,
 * word for word. Patio, Walkway and Retaining wall follow the same pattern and
 * have NOT been run against the model yet.
 */
const TAIL = " Do not add, remove, move or resize anything.";
export const PROMPTS: Record<JobType, string> = {
  Driveway:
    "Edit this exact photo. Replace only the surface of the main private driveway that leads to the house or garage with fresh, plain light-gray broom-finish poured concrete, including any broken asphalt, gravel or weeds inside its current outline. Keep the driveway's exact outline, slope and edges; do not widen or extend it. Leave every other surface exactly as it is: street, sidewalk, gutter, walls, steps, paths, soil, lawn and neighboring paving. Keep the same camera angle and framing, and every house, garage door, car, plant, bin, shadow and the lighting exactly as they are." +
    TAIL,
  "Front steps":
    "Edit this exact photo. Replace every step of the staircase, from the first step up from the ground to the top step, both treads and risers, with fresh, smooth light-gray poured concrete with clean edges and no cracks, moss or stains. Leave the ground or paving at the foot of the stairs and the porch floor at the top exactly as they are, including their wear. Keep the same camera angle, framing, number of steps, and the position and size of every step edge. Keep every wall, pillar, plant, pot, railing, siding, object, shadow and the lighting exactly as they are." +
    TAIL,
  Patio:
    "Edit this exact photo. Replace only the surface of the main patio slab with fresh, plain light-gray broom-finish poured concrete, including any cracked concrete, broken pavers, gravel or weeds inside its current outline. Keep the patio's exact outline, level and edges; do not widen or extend it. Leave every other surface exactly as it is: lawn, soil, planting beds, steps, paths, walls, decking and neighboring paving. Keep the same camera angle and framing, and every house wall, door, window, fence, chair, table, grill, plant, pot, shadow and the lighting exactly as they are." +
    TAIL,
  Walkway:
    "Edit this exact photo. Replace only the surface of the main walkway that leads to the house with fresh, plain light-gray broom-finish poured concrete, including any cracked concrete, broken pavers, gravel or weeds inside its current outline. Keep the walkway's exact outline, width, slope and edges; do not widen, straighten or extend it. Leave every other surface exactly as it is: street, sidewalk, driveway, steps, porch, lawn, soil, planting beds and neighboring paving. Keep the same camera angle and framing, and every house, door, fence, gate, plant, pot, shadow and the lighting exactly as they are." +
    TAIL,
  "Retaining wall":
    "Edit this exact photo. Replace only the face and top of the main retaining wall with fresh, smooth light-gray poured concrete with clean edges and no cracks, moss or stains. Keep the wall's exact outline, height, length and position; do not raise, lengthen or straighten it. Leave every other surface exactly as it is: the ground at the foot of the wall, the soil, lawn or planting above it, steps, paths, fences and neighboring paving. Keep the same camera angle and framing, and every house, fence, railing, plant, pot, object, shadow and the lighting exactly as they are." +
    TAIL,
};

export type EditRequest = { photo: Uint8Array; width: number; height: number; jobType: JobType };
export type EditResult =
  | { ok: true; jpeg: Uint8Array; usage?: unknown }
  /** retry false: asking again would fail the same way (refused, bad key, out of credit). */
  | { ok: false; error: string; retry: boolean };
export type Editor = { name: string; edit(req: EditRequest): Promise<EditResult> };

export type OpenAiConfig = {
  apiKey: string;
  model: string;
  quality: string;
  /** "" sends no output_format (the tested path: the model answers with a PNG). */
  outputFormat: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
};

export const DEFAULT_MODEL = "gpt-image-2.5-sunburst";
export const EDIT_URL = "https://api.openai.com/v1/images/edits";

export function openAiConfigFromEnv(env: Record<string, string | undefined> = process.env): OpenAiConfig | null {
  const apiKey = (env.OPENAI_IMAGE_API_KEY || "").trim();
  if (!apiKey) return null;
  return {
    apiKey,
    model: (env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL).trim(),
    quality: (env.OPENAI_IMAGE_QUALITY || "high").trim(),
    outputFormat: (env.OPENAI_IMAGE_OUTPUT_FORMAT || "").trim(),
    timeoutMs: Number(env.OPENAI_IMAGE_TIMEOUT_MS) || 150_000,
  };
}

const isPng = (b: Uint8Array): boolean => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const isJpeg = (b: Uint8Array): boolean => b.length > 3 && b[0] === 0xff && b[1] === 0xd8;

/** The model's answer as JPEG bytes, whichever format it came back in. */
export function toJpeg(bytes: Uint8Array): Uint8Array | null {
  if (isJpeg(bytes)) return bytes;
  if (!isPng(bytes)) return null;
  try {
    const png = PNG.sync.read(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    return encodeJpeg({ width: png.width, height: png.height, data: new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength) }, 90);
  } catch {
    return null;
  }
}

export function openAiEditor(cfg: OpenAiConfig): Editor {
  const doFetch = cfg.fetchImpl || fetch;
  return {
    name: cfg.model,
    async edit(req) {
      const form = new FormData();
      form.set("model", cfg.model);
      form.set("prompt", PROMPTS[req.jobType]);
      form.set("size", `${req.width}x${req.height}`);
      form.set("quality", cfg.quality);
      form.set("n", "1");
      if (cfg.outputFormat) form.set("output_format", cfg.outputFormat);
      form.set("image", new Blob([req.photo as BlobPart], { type: "image/jpeg" }), "photo.jpg");

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
      try {
        const res = await doFetch(EDIT_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${cfg.apiKey}` },
          body: form,
          signal: controller.signal,
        });
        if (!res.ok) {
          // OpenAI's error text can echo part of a bad key; keep only the type and code.
          let code = "";
          try {
            const e = (await res.json()) as { error?: { type?: string; code?: string } };
            code = [e.error?.type, e.error?.code].filter(Boolean).join("/");
          } catch {
            /* no body */
          }
          return { ok: false, error: `openai ${res.status}${code ? ` ${code}` : ""}`, retry: res.status >= 500 };
        }
        const data = (await res.json()) as { data?: { b64_json?: string }[]; usage?: unknown };
        const b64 = data.data?.[0]?.b64_json;
        if (!b64) return { ok: false, error: "openai answered with no image", retry: true };
        const jpeg = toJpeg(new Uint8Array(Buffer.from(b64, "base64")));
        if (!jpeg) return { ok: false, error: "openai answered with an unreadable image", retry: true };
        return { ok: true, jpeg, usage: data.usage };
      } catch (err) {
        const aborted = err instanceof Error && err.name === "AbortError";
        return { ok: false, error: aborted ? "openai timed out" : "openai request failed", retry: true };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
