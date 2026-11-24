/**
 * The geometry gate against real model output and against pictures moved on
 * purpose. The last test prints the table quoted in docs/driveway-generator.md.
 *
 * Fixtures (640 px copies, see fixtures/README.md):
 *   photoN.jpg           four real Portal "before" photos
 *   photoN-edit-*.jpg    ten real edits of them that kept the frame (should pass)
 *   stairs-moved-*.jpg   two real edits that reframed the photo (should fail)
 *   stairs-squeezed.jpg  a real edit returned in the wrong shape (should fail)
 */

import { describe, expect, it } from "vitest";
import { checkGeometry, type GateResult } from "../driveway-gate";
import type { Gray } from "../driveway-image";
import { fitted, fixtureGray, warp } from "./helpers";

const GOOD: [string, string][] = [
  ["photo1.jpg", "photo1-edit-a.jpg"],
  ["photo1.jpg", "photo1-edit-b.jpg"],
  ["photo1.jpg", "photo1-edit-c.jpg"],
  ["photo2.jpg", "photo2-edit-a.jpg"],
  ["photo2.jpg", "photo2-edit-b.jpg"],
  ["photo3.jpg", "photo3-edit-a.jpg"],
  ["photo3.jpg", "photo3-edit-b.jpg"],
  ["photo4.jpg", "photo4-edit-a.jpg"],
  ["photo4.jpg", "photo4-edit-b.jpg"],
  ["photo4.jpg", "photo4-edit-c.jpg"],
];
const MOVED = ["stairs-moved-a.jpg", "stairs-moved-b.jpg", "stairs-squeezed.jpg"];

const cache = new Map<string, Gray>();
const g = (name: string): Gray => cache.get(name) ?? (cache.set(name, fixtureGray(name)), cache.get(name)!);
const run = (photo: string, result: Gray): GateResult => checkGeometry(g(photo), fitted(result, g(photo)));
const long = (b: Gray) => Math.max(b.width, b.height);

// Sizes are shares of the picture's long side, so the table reads the same at any resolution.
const MOVES: { name: string; reject: boolean; make: (b: Gray) => Gray }[] = [
  { name: "shift 0.13% (2 px at 1536)", reject: false, make: (b) => warp(b, { tx: 0.0013 * long(b) }) },
  { name: "shift 0.26% (4 px)", reject: false, make: (b) => warp(b, { ty: 0.0026 * long(b) }) },
  { name: "shift 0.4% (6 px)", reject: true, make: (b) => warp(b, { tx: 0.004 * long(b) }) },
  { name: "shift 1% (15 px)", reject: true, make: (b) => warp(b, { ty: 0.01 * long(b) }) },
  { name: "shift 3% (46 px)", reject: true, make: (b) => warp(b, { tx: 0.03 * long(b) }) },
  { name: "zoom in 0.5%", reject: false, make: (b) => warp(b, { sx: 1.005, sy: 1.005 }) },
  { name: "zoom in 1%", reject: true, make: (b) => warp(b, { sx: 1.01, sy: 1.01 }) },
  { name: "zoom out 2%", reject: true, make: (b) => warp(b, { sx: 0.98, sy: 0.98 }) },
  { name: "zoom in 5%", reject: true, make: (b) => warp(b, { sx: 1.05, sy: 1.05 }) },
  { name: "zoom in 10%", reject: true, make: (b) => warp(b, { sx: 1.1, sy: 1.1 }) },
  { name: "squeeze height 1%", reject: false, make: (b) => warp(b, { sy: 0.99 }) },
  { name: "squeeze height 2%", reject: true, make: (b) => warp(b, { sy: 0.98 }) },
  { name: "rotate 0.25 degrees", reject: false, make: (b) => warp(b, { deg: 0.25 }) },
  { name: "rotate 0.5 degrees", reject: true, make: (b) => warp(b, { deg: 0.5 }) },
  { name: "rotate 2 degrees", reject: true, make: (b) => warp(b, { deg: 2 }) },
];

describe("geometry gate", () => {
  it("passes all ten real edits that kept the frame", () => {
    for (const [photo, edit] of GOOD) {
      const r = run(photo, g(edit));
      expect(r.pass, `${edit}: ${r.reasons.join(",")}`).toBe(true);
    }
  });

  it("rejects the three real edits that moved or changed shape", () => {
    for (const name of MOVED) expect(run("stairs-photo.jpg", g(name)).pass, name).toBe(false);
  });

  it("passes a photo compared with itself", () => {
    for (const p of ["photo1.jpg", "photo2.jpg", "photo3.jpg", "photo4.jpg", "stairs-photo.jpg"]) expect(run(p, g(p)).pass, p).toBe(true);
  });

  it("fails closed when there is nothing to compare", () => {
    const flat: Gray = { width: 640, height: 480, data: new Float32Array(640 * 480).fill(128) };
    const r = checkGeometry(flat, flat);
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain("too_little_detail");
  });

  it("rejects every real edit once it is moved past the tolerance, and prints the table", () => {
    const lines: string[] = [];
    let falseAccepts = 0, mustReject = 0;
    for (const m of MOVES) {
      let passed = 0;
      for (const [photo, edit] of GOOD) if (run(photo, m.make(fitted(g(edit), g(photo)))).pass) passed++;
      lines.push(`${m.name.padEnd(28)} accepted ${String(passed).padStart(2)} of ${GOOD.length}${m.reject ? "   must reject" : "   gray zone, either answer is fine"}`);
      if (m.reject) {
        mustReject += GOOD.length;
        falseAccepts += passed;
      }
    }
    console.log(["", "Real edits, then moved on purpose:", ...lines, `False accepts past the tolerance: ${falseAccepts} of ${mustReject}`, ""].join("\n"));
    expect(falseAccepts).toBe(0);
  }, 120_000);
});
