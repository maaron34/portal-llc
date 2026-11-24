import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL, EDIT_URL, JOB_TYPES, PROMPTS, openAiConfigFromEnv, openAiEditor } from "../driveway-openai";
import { encodeJpeg } from "../driveway-image";

const KEY = "test-key-not-real";
const photo = encodeJpeg({ width: 64, height: 48, data: new Uint8Array(64 * 48 * 4).fill(120) });
const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("OpenAI image edit call", () => {
  it("is off without a key and reads the model from the environment", () => {
    expect(openAiConfigFromEnv({})).toBeNull();
    expect(openAiConfigFromEnv({ OPENAI_IMAGE_API_KEY: KEY })!.model).toBe(DEFAULT_MODEL);
    expect(openAiConfigFromEnv({ OPENAI_IMAGE_API_KEY: KEY, OPENAI_IMAGE_MODEL: "gpt-image-2.6-sunburst" })!.model).toBe("gpt-image-2.6-sunburst");
  });

  it("posts the photo to the edit endpoint with the photo's own size", async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const editor = openAiEditor({
      ...openAiConfigFromEnv({ OPENAI_IMAGE_API_KEY: KEY })!,
      fetchImpl: (async (url: string, init: RequestInit) => {
        seen = { url, init };
        return answer({ data: [{ b64_json: Buffer.from(photo).toString("base64") }], usage: { total_tokens: 1 } });
      }) as unknown as typeof fetch,
    });
    const res = await editor.edit({ photo, width: 1536, height: 1152, jobType: "Front steps" });
    expect(res.ok).toBe(true);
    expect(seen!.url).toBe(EDIT_URL);
    expect(seen!.url).toContain("/images/edits");
    expect(seen!.init.method).toBe("POST");
    expect((seen!.init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    const form = seen!.init.body as FormData;
    expect(form.get("model")).toBe(DEFAULT_MODEL);
    expect(form.get("size")).toBe("1536x1152");
    expect(form.get("quality")).toBe("high");
    expect(form.get("n")).toBe("1");
    expect(form.get("prompt")).toBe(PROMPTS["Front steps"]);
    expect(form.has("output_format")).toBe(false);
    const image = form.get("image") as File;
    expect(image.type).toBe("image/jpeg");
    expect(image.size).toBe(photo.length);
  });

  it("reports a refusal as final and a server error as worth one more try, without echoing the key", async () => {
    const make = (status: number, body: unknown) =>
      openAiEditor({ ...openAiConfigFromEnv({ OPENAI_IMAGE_API_KEY: KEY })!, fetchImpl: (async () => answer(body, status)) as unknown as typeof fetch });
    const refused = await make(400, { error: { type: "invalid_request_error", code: "moderation_blocked", message: `key ${KEY}` } }).edit({ photo, width: 64, height: 48, jobType: "Patio" });
    expect(refused).toEqual({ ok: false, error: "openai 400 invalid_request_error/moderation_blocked", retry: false });
    const unauthorized = await make(401, { error: { message: `Incorrect API key provided: ${KEY}` } }).edit({ photo, width: 64, height: 48, jobType: "Patio" });
    expect(JSON.stringify(unauthorized)).not.toContain(KEY);
    expect(unauthorized).toMatchObject({ ok: false, retry: false });
    expect(await make(429, {}).edit({ photo, width: 64, height: 48, jobType: "Patio" })).toMatchObject({ ok: false, retry: false });
    expect(await make(503, {}).edit({ photo, width: 64, height: 48, jobType: "Patio" })).toMatchObject({ ok: false, retry: true });
  });

  it("treats a network failure and an empty answer as worth one more try", async () => {
    const down = openAiEditor({ ...openAiConfigFromEnv({ OPENAI_IMAGE_API_KEY: KEY })!, fetchImpl: (async () => { throw new Error("down"); }) as unknown as typeof fetch });
    expect(await down.edit({ photo, width: 64, height: 48, jobType: "Walkway" })).toEqual({ ok: false, error: "openai request failed", retry: true });
    const empty = openAiEditor({ ...openAiConfigFromEnv({ OPENAI_IMAGE_API_KEY: KEY })!, fetchImpl: (async () => answer({ data: [] })) as unknown as typeof fetch });
    expect(await empty.edit({ photo, width: 64, height: 48, jobType: "Walkway" })).toMatchObject({ ok: false, retry: true });
  });
});

describe("prompts", () => {
  it("has one for every job type, each an edit of the photo in plain gray concrete", () => {
    for (const t of JOB_TYPES) {
      const p = PROMPTS[t];
      expect(p.startsWith("Edit this exact photo."), t).toBe(true);
      expect(p, t).toMatch(/light-gray/);
      expect(p, t).toMatch(/Keep the same camera angle/);
      expect(p, t).toMatch(/Do not add, remove, move or resize anything\.$/);
      // Only plain gray concrete: none of the finishes Chris would have to agree to first.
      expect(p, t).not.toMatch(/stamp|paver stones|exposed aggregate|colored|stain(ed)? finish|brick pattern|tile pattern/i);
      expect(p, t).not.toContain("—");
    }
  });
});
