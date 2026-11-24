import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import submitLead from "../../functions/submit-lead";
import { PRODUCT_NAME, isGeneratorTest } from "../../../src/lib/driveway-shared";

const PREVIEW = "https://deploy-preview-1--portalllc.netlify.app";
const calls: { url: string; body: string }[] = [];
beforeEach(() => {
  process.env.SUPABASE_SECRET_KEY = "x";
  calls.length = 0;
  vi.stubGlobal("fetch", async (url: string, init?: { method?: string; body?: string }) => {
    calls.push({ url: String(url), body: String(init?.body || "") });
    return new Response(JSON.stringify(init?.method === "POST" ? [{ id: "a1" }] : []), { status: 200 });
  });
});
afterEach(() => vi.unstubAllGlobals());

const post = (origin: string, source: string) =>
  submitLead(new Request(`${origin}/.netlify/functions/submit-lead`, { method: "POST", body: JSON.stringify({ name: "Pat Doe", phone: "2065550100", source }) }));

describe("generator test leads", () => {
  it("only matches the generator on a Netlify preview address", () => {
    expect(isGeneratorTest(PRODUCT_NAME, "deploy-preview-1--portalllc.netlify.app")).toBe(true);
    expect(isGeneratorTest(PRODUCT_NAME, "buildwithportal.com")).toBe(false);
    expect(isGeneratorTest("Contact page", "deploy-preview-1--portalllc.netlify.app")).toBe(false);
    expect(isGeneratorTest(PRODUCT_NAME, "x--portalllc.netlify.app.evil.com")).toBe(false);
    expect(isGeneratorTest(undefined, "deploy-preview-1--portalllc.netlify.app")).toBe(false);
  });
  it("on a preview: one junk row, no email, no merge, and a token to carry on with", async () => {
    for (const s of [PRODUCT_NAME, `${PRODUCT_NAME} - estimate request`]) {
      calls.length = 0;
      const d = (await (await post(PREVIEW, s)).json()) as { ok: boolean; upload_token?: string };
      expect(d.ok && Boolean(d.upload_token)).toBe(true);
      expect(calls).toHaveLength(1);
      expect(JSON.parse(calls[0].body).raw).toMatchObject({ junk: true, junk_reason: "generator test" });
    }
  });
  it("on the live site: a real lead that emails Chris", async () => {
    await post("https://buildwithportal.com", PRODUCT_NAME);
    expect(calls.some((c) => c.url.includes("notify-lead"))).toBe(true);
    const row = calls.find((c) => c.url.endsWith("/rest/v1/leads"));
    expect(JSON.parse(row!.body).raw.junk).toBeUndefined();
  });
});
