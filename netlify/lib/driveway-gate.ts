/**
 * The geometry gate. An image model asked to "replace only the concrete" will
 * sometimes also move the camera: zoom in, shift the frame, redraw the house.
 * A before/after slider makes that obvious, so a result that moved is thrown
 * away before the homeowner sees it.
 *
 * How it decides. Both pictures are shrunk to the same small gray image. The
 * photo is cut into overlapping blocks, and each block with enough detail in
 * it (a plant, bricks, siding, a railing) is searched for in the result, a few
 * pixels in every direction. Three things can happen to a block:
 *
 *   - held:   it is found, and in the same place. The surroundings stayed put.
 *   - moved:  it is found, but somewhere else. The frame shifted or scaled.
 *   - gone:   it is not found. That is expected where the concrete was
 *             replaced, and a problem when it happens everywhere.
 *
 * A result passes when enough blocks held, few moved, the blocks that held are
 * spread across the frame and not bunched in one corner, and the best-fit shift
 * and zoom across all found blocks are close to none.
 *
 * Plain JavaScript, no native code, about a third of a second per pair.
 * Thresholds were set on the fixtures and synthetic cases in
 * __tests__/driveway-gate.test.ts; the numbers are in docs/driveway-generator.md.
 */

import { resizeGray, type Gray } from "./driveway-image";

export type GateOptions = {
  /** Long side of the working image, in pixels. */
  workEdge: number;
  block: number;
  stride: number;
  /** Search this many pixels in each direction. */
  radius: number;
  /** A block needs at least this much contrast (standard deviation, 0-255) to be used. */
  minStd: number;
  /** Correlation at which a block counts as found. */
  found: number;
  /** A found block within this many working pixels of its place has held. */
  holdPx: number;
  /** A moved block must beat the in-place score by this much, so repeating siding or brick does not count as movement. */
  movedMargin: number;
  /** Pass needs at least this share of detailed blocks to have held. */
  minHeld: number;
  /** Pass allows at most this share of found blocks to have moved. */
  maxMoved: number;
  /** Pass allows at most this overall shift, as a share of the long side. */
  maxShift: number;
  /** Pass allows at most this overall zoom or squeeze (0.006 is 0.6%). */
  maxScale: number;
  /** Pass allows at most this much rotation or shear, as a slope. */
  maxSkew: number;
  /** The frame is cut 3 by 3; pass needs held blocks in at least this many of the cells that had detail. */
  minCellShare: number;
};

export const GATE_DEFAULTS: GateOptions = {
  workEdge: 512,
  block: 32,
  stride: 16,
  radius: 7,
  minStd: 9,
  found: 0.6,
  holdPx: 1.25,
  movedMargin: 0.08,
  minHeld: 0.3,
  maxMoved: 0.45,
  maxShift: 0.0022,
  maxScale: 0.007,
  maxSkew: 0.0075,
  minCellShare: 0.6,
};

export type GateResult = {
  pass: boolean;
  /** Why it failed, in the order checked. Empty when it passed. */
  reasons: ("too_little_detail" | "held" | "moved" | "shift" | "scale" | "skew" | "coverage")[];
  detailed: number;
  held: number;
  moved: number;
  gone: number;
  heldShare: number;
  movedShare: number;
  /** Best-fit shift in working pixels and zoom per axis (1 is none). */
  dx: number;
  dy: number;
  sx: number;
  sy: number;
  /** Rotation or shear, as a slope (0.01 is about half a degree). */
  skew: number;
  cells: number;
  cellsHeld: number;
};

function blur3(g: Gray): Gray {
  const { width: w, height: h, data: s } = g;
  const t = new Float32Array(w * h);
  const o = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      t[i] = (s[y * w + Math.max(0, x - 1)] + s[i] + s[y * w + Math.min(w - 1, x + 1)]) / 3;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      o[i] = (t[Math.max(0, y - 1) * w + x] + t[i] + t[Math.min(h - 1, y + 1) * w + x]) / 3;
    }
  return { width: w, height: h, data: o };
}

const median = (v: number[]): number => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Best-fit plane d = at + gx * (x - cx) + gy * (y - cy) through the block
 * offsets. Least squares, refitted without the points that sit far off the
 * plane, so a few blocks that latched onto a redrawn step edge do not read as
 * the whole frame moving.
 */
function fitPlane(xs: number[], ys: number[], d: number[], cx: number, cy: number): { at: number; gx: number; gy: number } {
  let keep = xs.map((_, i) => i);
  let fit = { at: median(d), gx: 0, gy: 0 };
  for (let round = 0; round < 4; round++) {
    const n = keep.length;
    if (n < 12) break;
    let sx = 0, sy = 0, sd = 0, sxx = 0, sxy = 0, syy = 0, sxd = 0, syd = 0;
    for (const i of keep) {
      const x = xs[i] - cx, y = ys[i] - cy, v = d[i];
      sx += x; sy += y; sd += v; sxx += x * x; sxy += x * y; syy += y * y; sxd += x * v; syd += y * v;
    }
    // Solve the 3x3 normal equations by Cramer's rule.
    const det = n * (sxx * syy - sxy * sxy) - sx * (sx * syy - sxy * sy) + sy * (sx * sxy - sxx * sy);
    if (Math.abs(det) < 1e-6) break;
    const at = (sd * (sxx * syy - sxy * sxy) - sx * (sxd * syy - sxy * syd) + sy * (sxd * sxy - sxx * syd)) / det;
    const gx = (n * (sxd * syy - sxy * syd) - sd * (sx * syy - sxy * sy) + sy * (sx * syd - sxd * sy)) / det;
    const gy = (n * (sxx * syd - sxd * sxy) - sx * (sx * syd - sxd * sy) + sd * (sx * sxy - sxx * sy)) / det;
    fit = { at, gx, gy };
    const res = keep.map((i) => Math.abs(d[i] - at - gx * (xs[i] - cx) - gy * (ys[i] - cy)));
    const cut = Math.max(0.5, 2.5 * median(res));
    const next = keep.filter((_, j) => res[j] <= cut);
    if (next.length === keep.length || next.length < 12) break;
    keep = next;
  }
  return fit;
}

/** Sub-pixel peak position from three samples around the best one. */
const refine = (l: number, c: number, r: number): number => {
  const den = l - 2 * c + r;
  return Math.abs(den) < 1e-9 ? 0 : Math.max(-0.5, Math.min(0.5, (0.5 * (l - r)) / den));
};

export function checkGeometry(photo: Gray, result: Gray, options: Partial<GateOptions> = {}): GateResult {
  const o = { ...GATE_DEFAULTS, ...options };
  const k = o.workEdge / Math.max(photo.width, photo.height);
  const w = Math.max(o.block * 3, Math.round(photo.width * k));
  const h = Math.max(o.block * 3, Math.round(photo.height * k));
  const a = blur3(resizeGray(photo, w, h)).data;
  const b = blur3(resizeGray(result, w, h)).data;

  const B = o.block, R = o.radius, n = B * B, span = 2 * R + 1;
  const scores = new Float32Array(span * span);
  let detailed = 0, held = 0, moved = 0;
  const px: number[] = [], py: number[] = [], ddx: number[] = [], ddy: number[] = [];
  const cellDetail = new Uint16Array(9), cellHeld = new Uint16Array(9);

  for (let by = R; by + B + R <= h; by += o.stride) {
    for (let bx = R; bx + B + R <= w; bx += o.stride) {
      let sa = 0, saa = 0;
      for (let y = 0; y < B; y++) {
        const row = (by + y) * w + bx;
        for (let x = 0; x < B; x++) { const v = a[row + x]; sa += v; saa += v * v; }
      }
      const va = saa - (sa * sa) / n;
      if (va / n < o.minStd * o.minStd) continue;
      detailed++;
      const cell = Math.min(2, Math.floor(((by + B / 2) * 3) / h)) * 3 + Math.min(2, Math.floor(((bx + B / 2) * 3) / w));
      cellDetail[cell]++;

      let best = -2, bi = 0;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          let sb = 0, sbb = 0, sab = 0;
          for (let y = 0; y < B; y++) {
            const ra = (by + y) * w + bx;
            const rb = (by + dy + y) * w + bx + dx;
            for (let x = 0; x < B; x++) { const p = a[ra + x], q = b[rb + x]; sb += q; sbb += q * q; sab += p * q; }
          }
          const vb = sbb - (sb * sb) / n;
          const s = vb < 1e-3 ? 0 : (sab - (sa * sb) / n) / Math.sqrt(va * vb);
          const idx = (dy + R) * span + dx + R;
          scores[idx] = s;
          if (s > best) { best = s; bi = idx; }
        }
      }
      if (best < o.found) continue;
      const iy = Math.floor(bi / span), ix = bi % span;
      let ox = ix - R, oy = iy - R;
      if (ix > 0 && ix < span - 1) ox += refine(scores[bi - 1], best, scores[bi + 1]);
      if (iy > 0 && iy < span - 1) oy += refine(scores[bi - span], best, scores[bi + span]);
      const inPlace = scores[R * span + R];
      const off = Math.hypot(ox, oy);
      if (off <= o.holdPx || best - inPlace < o.movedMargin) {
        held++;
        cellHeld[cell]++;
      } else {
        moved++;
      }
      px.push(bx + B / 2); py.push(by + B / 2); ddx.push(ox); ddy.push(oy);
    }
  }

  const foundCount = held + moved;
  const fx = fitPlane(px, py, ddx, w / 2, h / 2);
  const fy = fitPlane(px, py, ddy, w / 2, h / 2);
  // A cell counts only when it had a fair amount of detail to begin with.
  let cells = 0, cellsHeld = 0;
  for (let c = 0; c < 9; c++) {
    if (cellDetail[c] < 4) continue;
    cells++;
    if (cellHeld[c] >= Math.max(2, cellDetail[c] * 0.15)) cellsHeld++;
  }

  const r: GateResult = {
    pass: false,
    reasons: [],
    detailed,
    held,
    moved,
    gone: detailed - foundCount,
    heldShare: detailed ? held / detailed : 0,
    movedShare: foundCount ? moved / foundCount : 0,
    dx: fx.at,
    dy: fy.at,
    sx: 1 + fx.gx,
    sy: 1 + fy.gy,
    skew: Math.max(Math.abs(fx.gy), Math.abs(fy.gx)),
    cells,
    cellsHeld,
  };
  // A blank wall or a blurred photo gives nothing to compare. Fail closed.
  if (detailed < 24) r.reasons.push("too_little_detail");
  if (r.heldShare < o.minHeld) r.reasons.push("held");
  if (r.movedShare > o.maxMoved) r.reasons.push("moved");
  if (Math.hypot(r.dx, r.dy) > o.maxShift * o.workEdge) r.reasons.push("shift");
  if (Math.abs(r.sx - 1) > o.maxScale || Math.abs(r.sy - 1) > o.maxScale) r.reasons.push("scale");
  if (r.skew > o.maxSkew) r.reasons.push("skew");
  if (cells > 0 && cellsHeld / cells < o.minCellShare) r.reasons.push("coverage");
  r.pass = r.reasons.length === 0;
  return r;
}
