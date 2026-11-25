/**
 * One REAL, PAID image edit through the exact code the site runs: the OpenAI
 * call, the resize back to the photo's size, and the geometry gate. Costs
 * about 3 cents per run. Nothing touches Supabase or the website.
 *
 *   npx vite-node scripts/driveway-live-check.ts <photo.jpg> "<job type>" [out.jpg]
 *
 * The photo must already be a JPEG at most 2048 px on its long side (the page
 * does this in the browser). The key is read from OPENAI_IMAGE_API_KEY or, on
 * Michael's Mac, ~/.config/portal-ops/openai-image-key. It is never printed.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { checkGeometry } from "../netlify/lib/driveway-gate";
import { checkPhoto, decodeJpeg, fitToSize, requestSize, toGray } from "../netlify/lib/driveway-image";
import { isJobType, openAiConfigFromEnv, openAiEditor } from "../netlify/lib/driveway-openai";

const [photoPath, jobType = "Front steps", outPath = "driveway-live-check.jpg"] = process.argv.slice(2);
if (!photoPath || !isJobType(jobType)) {
  console.error('usage: npx vite-node scripts/driveway-live-check.ts <photo.jpg> "Driveway|Front steps|Patio|Walkway|Retaining wall" [out.jpg]');
  process.exit(2);
}
const keyFile = join(homedir(), ".config/portal-ops/openai-image-key");
const env = { ...process.env };
if (!env.OPENAI_IMAGE_API_KEY && existsSync(keyFile)) env.OPENAI_IMAGE_API_KEY = readFileSync(keyFile, "utf8").trim();
const cfg = openAiConfigFromEnv(env);
if (!cfg) {
  console.error("No key: set OPENAI_IMAGE_API_KEY or create ~/.config/portal-ops/openai-image-key");
  process.exit(2);
}

const photo = new Uint8Array(readFileSync(photoPath));
const check = checkPhoto(photo);
if (!check.ok) {
  console.error(`The site would refuse this photo: ${check.reason}`);
  process.exit(1);
}
const size = requestSize(check.width, check.height);
console.log(`model ${cfg.model}, quality ${cfg.quality}, photo ${check.width}x${check.height}, asking for ${size.width}x${size.height}`);
const t0 = Date.now();
const res = await openAiEditor(cfg).edit({ photo, width: size.width, height: size.height, jobType });
console.log(`answered in ${Math.round((Date.now() - t0) / 1000)} s`);
if (!res.ok) {
  console.error(`failed: ${res.error}`);
  process.exit(1);
}
const fitted = fitToSize(res.jpeg, check.width, check.height);
if (!fitted) {
  console.error("the answer was not a readable image");
  process.exit(1);
}
const gate = checkGeometry(toGray(decodeJpeg(photo)!), toGray(fitted.image));
writeFileSync(outPath, fitted.bytes);
console.log(`saved ${outPath} (${fitted.image.width}x${fitted.image.height}${fitted.resized ? ", resized to the photo's size" : ""})`);
console.log(`usage: ${JSON.stringify(res.usage)}`);
console.log(`geometry gate: ${gate.pass ? "PASS" : `FAIL (${gate.reasons.join(", ")})`}  held ${(gate.heldShare * 100).toFixed(0)}%, moved ${(gate.movedShare * 100).toFixed(0)}%, shift ${Math.hypot(gate.dx, gate.dy).toFixed(2)} px of 512`);
