/**
 * Pixel work for the Driveway Generator, in plain JavaScript so it runs inside
 * a Netlify function with no native module: read a JPEG, check it, resize it,
 * write a JPEG. jpeg-js is the only dependency.
 *
 * The browser already shrinks the photo to about 1536 px and bakes in the
 * phone's rotation, so everything here sees an upright image of modest size.
 */

import jpeg from "jpeg-js";

export type Rgba = { width: number; height: number; data: Uint8Array };
export type Gray = { width: number; height: number; data: Float32Array };

/** Limits for a photo arriving from the public page. */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MIN_EDGE = 480;
export const MAX_EDGE = 2048;
/** The image model accepts 1:3 to 3:1. A phone photo is 4:3 or 16:9; this is stricter on purpose. */
export const MAX_ASPECT = 2.4;

export type PhotoCheck = { ok: true; width: number; height: number } | { ok: false; reason: "type" | "size" | "dimensions" | "unreadable" };

const isJpeg = (b: Uint8Array): boolean => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/**
 * Width and height from the JPEG's frame header, without decoding pixels.
 * Used to refuse an oversized image before any memory is spent on it.
 */
export function jpegSize(b: Uint8Array): { width: number; height: number } | null {
  if (!isJpeg(b)) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2) return null;
    // SOF0..SOF15, except DHT (c4), JPG (c8) and DAC (cc).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (b[i + 5] << 8) | b[i + 6];
      const width = (b[i + 7] << 8) | b[i + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    i += 2 + len;
  }
  return null;
}

/** What the bytes are, never what the browser said they were. */
export function checkPhoto(bytes: Uint8Array): PhotoCheck {
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) return { ok: false, reason: "size" };
  if (!isJpeg(bytes)) return { ok: false, reason: "type" };
  const size = jpegSize(bytes);
  if (!size) return { ok: false, reason: "unreadable" };
  const long = Math.max(size.width, size.height);
  const short = Math.min(size.width, size.height);
  if (long > MAX_EDGE || short < MIN_EDGE || long / short > MAX_ASPECT) return { ok: false, reason: "dimensions" };
  return { ok: true, width: size.width, height: size.height };
}

export function decodeJpeg(bytes: Uint8Array): Rgba | null {
  try {
    const d = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 12, maxMemoryUsageInMB: 256 });
    return { width: d.width, height: d.height, data: d.data };
  } catch {
    return null;
  }
}

export function encodeJpeg(img: Rgba, quality = 88): Uint8Array {
  const out = jpeg.encode({ width: img.width, height: img.height, data: img.data }, quality);
  return new Uint8Array(out.data.buffer, out.data.byteOffset, out.data.byteLength);
}

/** Triangle-filter weights for one axis. Averages when shrinking, interpolates when growing. */
function axisWeights(src: number, dst: number): { start: Int32Array; size: number; w: Float32Array } {
  const scale = src / dst;
  const support = Math.max(1, scale);
  const size = Math.ceil(support * 2) + 1;
  const start = new Int32Array(dst);
  const w = new Float32Array(dst * size);
  for (let o = 0; o < dst; o++) {
    const center = (o + 0.5) * scale - 0.5;
    const first = Math.floor(center - support) + 1;
    start[o] = first;
    let sum = 0;
    for (let k = 0; k < size; k++) {
      const x = first + k;
      const v = Math.max(0, 1 - Math.abs(x - center) / support);
      w[o * size + k] = v;
      sum += v;
    }
    for (let k = 0; k < size; k++) w[o * size + k] /= sum || 1;
  }
  return { start, size, w };
}

/** Resize `channels` interleaved planes (1 for gray, 4 for RGBA). Edges repeat. */
function resizePlanes(src: Float32Array | Uint8Array, sw: number, sh: number, dw: number, dh: number, channels: number): Float32Array {
  const ax = axisWeights(sw, dw);
  const mid = new Float32Array(dw * sh * channels);
  for (let y = 0; y < sh; y++) {
    for (let o = 0; o < dw; o++) {
      for (let k = 0; k < ax.size; k++) {
        const wt = ax.w[o * ax.size + k];
        if (wt === 0) continue;
        const x = Math.min(sw - 1, Math.max(0, ax.start[o] + k));
        const si = (y * sw + x) * channels;
        const di = (y * dw + o) * channels;
        for (let c = 0; c < channels; c++) mid[di + c] += src[si + c] * wt;
      }
    }
  }
  const ay = axisWeights(sh, dh);
  const out = new Float32Array(dw * dh * channels);
  for (let o = 0; o < dh; o++) {
    for (let k = 0; k < ay.size; k++) {
      const wt = ay.w[o * ay.size + k];
      if (wt === 0) continue;
      const y = Math.min(sh - 1, Math.max(0, ay.start[o] + k));
      const srow = y * dw * channels;
      const drow = o * dw * channels;
      for (let i = 0; i < dw * channels; i++) out[drow + i] += mid[srow + i] * wt;
    }
  }
  return out;
}

export function resizeRgba(img: Rgba, width: number, height: number): Rgba {
  if (img.width === width && img.height === height) return img;
  const f = resizePlanes(img.data, img.width, img.height, width, height, 4);
  const data = new Uint8Array(f.length);
  for (let i = 0; i < f.length; i++) data[i] = f[i] < 0 ? 0 : f[i] > 255 ? 255 : Math.round(f[i]);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return { width, height, data };
}

export function toGray(img: Rgba): Gray {
  const n = img.width * img.height;
  const data = new Float32Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) data[i] = 0.299 * img.data[p] + 0.587 * img.data[p + 1] + 0.114 * img.data[p + 2];
  return { width: img.width, height: img.height, data };
}

export function resizeGray(img: Gray, width: number, height: number): Gray {
  if (img.width === width && img.height === height) return img;
  return { width, height, data: resizePlanes(img.data, img.width, img.height, width, height, 1) };
}

/**
 * The size to ask the image model for: the photo's own shape, with both sides
 * a multiple of 16 (the model's rule). The page already sends such a size, so
 * this normally returns the photo's exact size and nothing is stretched.
 */
export function requestSize(width: number, height: number): { width: number; height: number } {
  const r = (n: number) => Math.max(16, Math.round(n / 16) * 16);
  return { width: r(width), height: r(height) };
}

/**
 * Bring the model's JPEG back to exactly the photo's size. Returns the bytes
 * untouched when they already match, so a good result is never re-compressed.
 */
export function fitToSize(bytes: Uint8Array, width: number, height: number): { bytes: Uint8Array; image: Rgba; resized: boolean } | null {
  const image = decodeJpeg(bytes);
  if (!image) return null;
  if (image.width === width && image.height === height) return { bytes, image, resized: false };
  const fitted = resizeRgba(image, width, height);
  return { bytes: encodeJpeg(fitted), image: fitted, resized: true };
}
