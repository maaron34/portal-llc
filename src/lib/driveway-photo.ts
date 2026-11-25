/**
 * Get a phone photo ready for the Concrete Generator, in the browser, before
 * anything is uploaded: turn it upright, shrink it to about 1536 px on the long
 * side, and save it as a JPEG whose width and height are both multiples of 16.
 *
 * Why here and not on the server: a phone photo is 3 to 12 MB and Netlify
 * accepts 6 MB; the image model wants sides in multiples of 16; and the result
 * must come back in exactly the photo's shape, so the shape is fixed once, here.
 */

export const LONG_EDGE = 1536;
const MIN_SHORT_EDGE = 480;
const MAX_ASPECT = 2.3;
const MAX_BYTES = 3 * 1024 * 1024;

export type PreparedPhoto = { blob: Blob; width: number; height: number; url: string };
export type PhotoProblem = "not-a-photo" | "heic" | "unreadable" | "too-small" | "too-wide";

export const PHOTO_MESSAGES: Record<PhotoProblem, string> = {
  "not-a-photo": "That file is not a photo. Choose a JPG or PNG.",
  heic: "This browser cannot open that iPhone photo (HEIC). Choose a JPG or PNG, or use a screenshot of it.",
  unreadable: "We could not open that photo. Try a different one.",
  "too-small": "That photo is too small. Try one straight from your camera.",
  "too-wide": "That photo is too wide. Try a regular photo, not a panorama.",
};

const isHeic = (f: File): boolean => /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);

type Drawable = { source: CanvasImageSource; width: number; height: number; close(): void };

/** Decode with the phone's rotation applied. Two ways, because older Safari lacks the first. */
async function decode(file: File): Promise<Drawable | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode"));
      img.src = url;
    });
    if (!img.naturalWidth) return null;
    // An <img> draws upright: browsers apply the photo's rotation tag by default.
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/** Output size: long side at most 1536, both sides multiples of 16. */
export function targetSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, LONG_EDGE / Math.max(width, height));
  const snap = (n: number) => Math.max(16, Math.floor((n * scale) / 16) * 16);
  return { width: snap(width), height: snap(height) };
}

const toBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));

export async function preparePhoto(file: File): Promise<{ ok: true; photo: PreparedPhoto } | { ok: false; problem: PhotoProblem }> {
  const looksLikeImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|hei[cf])$/i.test(file.name);
  if (!looksLikeImage || file.size === 0) return { ok: false, problem: "not-a-photo" };

  const img = await decode(file);
  // iPhones hand a web page a JPEG; a HEIC file reaches us from a desktop, where only Safari can open it.
  if (!img) return { ok: false, problem: isHeic(file) ? "heic" : "unreadable" };
  try {
    const long = Math.max(img.width, img.height), short = Math.min(img.width, img.height);
    if (long / short > MAX_ASPECT) return { ok: false, problem: "too-wide" };
    const size = targetSize(img.width, img.height);
    if (Math.min(size.width, size.height) < MIN_SHORT_EDGE) return { ok: false, problem: "too-small" };

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, problem: "unreadable" };
    // Snapping to 16 changes the shape by under 1%. Trim that from the edges; never stretch.
    const want = size.width / size.height;
    let sw = img.width, sh = img.height;
    if (sw / sh > want) sw = sh * want;
    else sh = sw / want;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.source, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, size.width, size.height);

    let blob = await toBlob(canvas, 0.88);
    if (blob && blob.size > MAX_BYTES) blob = await toBlob(canvas, 0.7);
    if (!blob || blob.size > MAX_BYTES) return { ok: false, problem: "unreadable" };
    return { ok: true, photo: { blob, width: size.width, height: size.height, url: URL.createObjectURL(blob) } };
  } finally {
    img.close();
  }
}
