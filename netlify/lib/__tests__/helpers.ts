import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeJpeg, toGray, resizeGray, type Gray } from "../driveway-image";

export const fixtureBytes = (name: string): Uint8Array => new Uint8Array(readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))));
export const fixtureGray = (name: string): Gray => toGray(decodeJpeg(fixtureBytes(name))!);
/** A result brought to the photo's size, as the worker does before the gate. */
export const fitted = (result: Gray, photo: Gray): Gray => resizeGray(result, photo.width, photo.height);

/**
 * Move a picture the way a model that "reframed" would: zoom (sx, sy), shift
 * (tx, ty in pixels) and rotate about the center. Bilinear, edges repeat.
 */
export function warp(a: Gray, t: { sx?: number; sy?: number; tx?: number; ty?: number; deg?: number }): Gray {
  const { width: w, height: h } = a;
  const sx = t.sx ?? 1, sy = t.sy ?? 1, tx = t.tx ?? 0, ty = t.ty ?? 0;
  const c = Math.cos(((t.deg ?? 0) * Math.PI) / 180), s = Math.sin(((t.deg ?? 0) * Math.PI) / 180);
  const o = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ux = x - w / 2 - tx, uy = y - h / 2 - ty;
      const rx = (c * ux + s * uy) / sx + w / 2, ry = (-s * ux + c * uy) / sy + h / 2;
      const x0 = Math.max(0, Math.min(w - 2, Math.floor(rx))), y0 = Math.max(0, Math.min(h - 2, Math.floor(ry)));
      const fx = Math.max(0, Math.min(1, rx - x0)), fy = Math.max(0, Math.min(1, ry - y0));
      const i = y0 * w + x0;
      o[y * w + x] = a.data[i] * (1 - fx) * (1 - fy) + a.data[i + 1] * fx * (1 - fy) + a.data[i + w] * (1 - fx) * fy + a.data[i + w + 1] * fx * fy;
    }
  return { width: w, height: h, data: o };
}
