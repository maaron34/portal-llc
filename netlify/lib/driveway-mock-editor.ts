/**
 * A stand-in for the paid image model, for tests and the local mock. It never
 * leaves the machine and costs nothing. It paints the lower middle of the
 * photo plain gray, which is enough to exercise the wait, the geometry gate
 * and the before/after slider. Not used on the live site.
 */

import { decodeJpeg, encodeJpeg } from "./driveway-image";
import type { EditRequest, EditResult, Editor } from "./driveway-openai";

export type MockMode = "ok" | "moved" | "moved-then-ok" | "error" | "refused";

export function paintConcrete(photo: Uint8Array, shiftShare = 0): Uint8Array | null {
  const img = decodeJpeg(photo);
  if (!img) return null;
  const { width: w, height: h, data } = img;
  const out = new Uint8Array(data.length);
  const dx = Math.round(w * shiftShare), dy = Math.round(h * shiftShare * 0.5);
  const top = h * 0.55;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(w - 1, Math.max(0, x - dx)), sy = Math.min(h - 1, Math.max(0, y - dy));
      const s = (sy * w + sx) * 4, d = (y * w + x) * 4;
      const t = (sy - top) / (h - top);
      const inside = sy > top && Math.abs(sx - w / 2) < w * (0.2 + 0.22 * t);
      if (inside) {
        // Light gray with faint broom lines.
        const v = 168 + 5 * Math.sin(sy / 2.5) + ((sx * 13 + sy * 7) % 5);
        out[d] = v; out[d + 1] = v; out[d + 2] = v - 2;
      } else {
        out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2];
      }
      out[d + 3] = 255;
    }
  }
  return encodeJpeg({ width: w, height: h, data: out }, 88);
}

export function mockEditor(modeFor: (req: EditRequest, call: number) => MockMode, delayMs = 0): Editor & { calls: number } {
  const editor = {
    name: "mock",
    calls: 0,
    async edit(req: EditRequest): Promise<EditResult> {
      const call = ++editor.calls;
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      const mode = modeFor(req, call);
      if (mode === "error") return { ok: false, error: "mock 500", retry: true };
      if (mode === "refused") return { ok: false, error: "mock 400", retry: false };
      const moved = mode === "moved" || (mode === "moved-then-ok" && call % 2 === 1);
      const jpeg = paintConcrete(req.photo, moved ? 0.04 : 0);
      return jpeg ? { ok: true, jpeg } : { ok: false, error: "mock could not read photo", retry: false };
    },
  };
  return editor;
}
