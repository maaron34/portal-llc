/**
 * Walk the Concrete Generator in a real browser at phone width, against the
 * local mock (npm run dev:driveway-mock). No outside calls, no cost.
 *
 *   node scripts/driveway-mock-e2e.mjs <base url> <screenshot folder> [off]
 *
 * Saves dgreal-*.png and prints a pass/fail line per check. Pass "off" as the
 * third argument when the mock was started with DRIVEWAY_MOCK=off.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [base = "http://localhost:5199", out = "./dgreal", offMode] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const PHOTO = "public/images/before-after/before-stairs.jpeg"; // a 4032 x 3024 phone photo
const URL_ = `${base}/concrete-generator`;
let failed = 0;
const check = (name, ok, extra = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
};
const state = async () => (await fetch(`${base}/__driveway_mock/state`)).json();

/** The same photo with a "rotate 90 degrees" tag, as a phone held upright writes it. */
function rotatedCopy() {
  const src = readFileSync(PHOTO);
  const tiff = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0]);
  const exif = Buffer.concat([Buffer.from("Exif\0\0"), tiff]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 0xff]), exif]);
  // Drop the original's own APP1 so the new tag is the only one.
  let rest = src.subarray(2);
  while (rest[0] === 0xff && (rest[1] === 0xe1 || rest[1] === 0xe0)) rest = rest.subarray(2 + ((rest[2] << 8) | rest[3]));
  const p = join(tmpdir(), "dg-rotated.jpg");
  writeFileSync(p, Buffer.concat([src.subarray(0, 2), app1, rest]));
  return p;
}

await fetch(`${base}/__driveway_mock/reset`); // start from an empty mock, so the script can be run again
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
// Nothing but the Inter font files leaves this machine: no ad pixels, no analytics.
await ctx.route((u) => !["localhost", "127.0.0.1", "fonts.googleapis.com", "fonts.gstatic.com"].includes(u.hostname), (r) => r.abort());
const page = await ctx.newPage();
const shot = (name) => page.screenshot({ path: join(out, `dgreal-${name}.png`), fullPage: true });
const open = async () => {
  await page.goto(URL_);
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(URL_);
};
const toContact = async (file, job, name, phone) => {
  await page.setInputFiles('input[type="file"]', file);
  await page.getByText("Photo added").waitFor();
  await page.selectOption("select", job);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("First and last name").fill(name);
  await page.getByLabel("Mobile number").fill(phone);
};

if (offMode === "off") {
  await page.goto(URL_);
  await page.getByText("switched off").waitFor();
  check("flag off: the page says so and offers the estimate link", (await page.getByRole("link", { name: "Get a free estimate" }).count()) === 1);
  check("flag off: no photo box", (await page.locator('input[type="file"]').count()) === 0);
  await shot("10-flag-off");
  await browser.close();
  process.exit(failed ? 1 : 0);
}

// ---- 1. The whole happy path --------------------------------------------------
await open();
await page.getByText("Show us the concrete").waitFor();
check("noindex meta is on the page", (await page.locator('meta[name="robots"][content*="noindex"]').count()) === 1);
check("no sideways scroll at 390 px", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await shot("01-photo-empty");

await page.getByRole("button", { name: "Next" }).click();
check("Next without a photo asks for one", await page.getByText("Add a photo first.").isVisible());

await page.setInputFiles('input[type="file"]', { name: "IMG_0001.HEIC", mimeType: "image/heic", buffer: Buffer.from("not really a heic") });
await page.getByText("HEIC").waitFor();
await shot("02-heic-message");
await page.setInputFiles('input[type="file"]', { name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
check("a PDF is refused with a plain message", await page.getByText("That file is not a photo").isVisible());

await page.setInputFiles('input[type="file"]', PHOTO);
await page.getByText("Photo added").waitFor();
await page.selectOption("select", "Front steps");
await shot("03-photo-added");
await page.getByRole("button", { name: "Next" }).click();
await page.getByLabel("First and last name").fill("Sarah Kim");
await page.getByLabel("Mobile number").fill("555");
await page.getByRole("button", { name: "Make my picture" }).click();
check("a short phone number is caught", await page.getByText("Enter a 10-digit mobile number.").isVisible());
await page.getByLabel("Mobile number").fill("(206) 555-0142");
await page.getByLabel("First and last name").focus();
await shot("04-contact");

// Double tap on the button.
await page.getByRole("button", { name: "Make my picture" }).dblclick();
await page.getByText("Working on it").waitFor();
await page.waitForTimeout(1500);
await shot("05-working");
let s = await state();
check("double tap made one job and reserved one call", s.jobs.length === 1 && s.calls_reserved === 1, `jobs ${s.jobs.length}, calls ${s.calls_reserved}`);
check("photo was shrunk to 1536 x 1152 (multiples of 16)", s.jobs[0].width === 1536 && s.jobs[0].height === 1152, `${s.jobs[0].width} x ${s.jobs[0].height}`);
check("lead is marked with the product name", String(s.submissions.at(-1).source).startsWith("Concrete Generator"), s.submissions.at(-1).source);

// Refresh in the middle of the wait.
await page.reload();
await page.getByText("Working on it").waitFor();
await shot("06-working-after-refresh");
s = await state();
check("refresh mid-wait did not start a second job", s.jobs.length === 1 && s.calls_reserved === 1);

await page.getByText("Here is your front steps idea").waitFor({ timeout: 60_000 });
await page.waitForTimeout(3400); // let the slider's nudge finish
await shot("07-result");
const sizes = await page.evaluate(() => [...document.querySelectorAll(".dg-ba img")].map((i) => [i.naturalWidth, i.naturalHeight]));
check("before and after pictures are the same size", sizes.length === 2 && sizes[0][0] === sizes[1][0] && sizes[0][1] === sizes[1][1] && sizes[1][0] === 1536, JSON.stringify(sizes));
const box = await page.locator(".dg-ba").boundingBox();
await page.touchscreen.tap(box.x + box.width * 0.2, box.y + box.height / 2);
await page.locator(".dg-ba input").evaluate((el) => { el.value = "22"; el.dispatchEvent(new Event("input", { bubbles: true })); });
await shot("08-result-slider-moved");
check("slider moves the cut", (await page.locator(".dg-ba").evaluate((el) => el.style.getPropertyValue("--cut"))) === "22%");

// Refresh on the result.
await page.reload();
await page.getByText("Here is your front steps idea").waitFor({ timeout: 20_000 });
check("refresh on the result shows the result again, no new job", (await state()).jobs.length === 1);

await page.getByRole("button", { name: "Get a free estimate" }).click();
await page.getByText("Chris has your request").waitFor();
await shot("09-estimate-requested");
s = await state();
check("estimate request went through submit-lead, marked as such", String(s.submissions.at(-1).source).includes("estimate request"), s.submissions.at(-1).source);
check("photo and result are both on the lead", s.leads[0].photos.length === 1 && s.leads[0].files.length === 1);
check("no copy claims a text was sent", !(await page.content()).match(/texted|text you|we will text/i));

// ---- 2. A photo with a rotation tag -------------------------------------------
await open();
await toContact(rotatedCopy(), "Driveway", "Pat Lee", "(206) 555-0150");
await page.getByRole("button", { name: "Make my picture" }).click();
await page.getByText("Working on it").waitFor();
s = await state();
const rot = s.jobs.at(-1);
check("a rotated phone photo is turned upright before upload", rot.width === 1152 && rot.height === 1536, `${rot.width} x ${rot.height}`);
await page.getByText("Here is your driveway idea").waitFor({ timeout: 60_000 });
await page.waitForTimeout(3400);
await shot("11-result-portrait");

// ---- 3. The picture moved twice ------------------------------------------------
await open();
await toContact(PHOTO, "Patio", "Moved Twice", "(206) 555-0101");
await page.getByRole("button", { name: "Make my picture" }).click();
await page.getByText("We could not make your picture").waitFor({ timeout: 90_000 });
await shot("12-failed");
s = await state();
const movedJob = s.jobs.at(-1);
check("moved picture: two calls, then failed, nothing shown", movedJob.calls === 2 && movedJob.status === "failed" && movedJob.outcome === "moved" && !movedJob.result_path, `${movedJob.calls} calls, ${movedJob.outcome}`);
await page.getByRole("button", { name: "Get a free estimate" }).click();
await page.getByText("Chris has your request").waitFor();
check("failure screen still takes an estimate request", true);

// ---- 4. One retry, then fine ---------------------------------------------------
await open();
await toContact(PHOTO, "Walkway", "Retry Once", "(206) 555-0104");
await page.getByRole("button", { name: "Make my picture" }).click();
await page.getByText("Here is your walkway idea").waitFor({ timeout: 90_000 });
s = await state();
check("one moved picture is retried once and then shown", s.jobs.at(-1).calls === 2 && s.jobs.at(-1).status === "done");

// ---- 5. Limits -------------------------------------------------------------------
const before = (await state()).calls_reserved;
await open();
await toContact(PHOTO, "Retaining wall", "Cap Reached", "(206) 555-0102");
await page.getByRole("button", { name: "Make my picture" }).click();
await page.getByText("The generator is full for today").waitFor({ timeout: 20_000 });
await shot("13-full-for-today");
await open();
await toContact(PHOTO, "Driveway", "Phone Limit", "(206) 555-0105");
await page.getByRole("button", { name: "Make my picture" }).click();
await page.getByText("That is all the pictures for today").waitFor({ timeout: 20_000 });
await shot("14-phone-limit");
s = await state();
check("refused requests reserved no calls", s.calls_reserved === before, `${before} -> ${s.calls_reserved}`);
check("refused requests still left the photo on the lead", s.leads.at(-1).photos.length === 1 && s.leads.at(-2).photos.length === 1);
await page.getByRole("button", { name: "Get a free estimate" }).click();
await page.getByText("Chris has your request").waitFor();

console.log(`\ncalls reserved in this run: ${(await state()).calls_reserved}`);
await browser.close();
process.exit(failed ? 1 : 0);
