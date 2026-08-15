/**
 * Netlify Function: classify an inbound SMS to Portal's business line as a real
 * customer lead vs spam/vendor-pitch. Used by the portal-quo-ingest cron so we
 * only push genuine leads into the dashboard (and email Chris) — never the spam
 * pile QUO collects.
 *
 * Keeps the OpenRouter key server-side (same reason submit-lead does): the cron
 * calls this instead of holding an LLM key. Open + size-capped, consistent with
 * submit-lead. Fail-OPEN: if the classifier is unconfigured or errors we return
 * lead:true so a real lead is never dropped by a classifier hiccup (Chris can
 * dismiss a stray spam far more cheaply than losing a job).
 *
 * Body: { text: string, from?: string, channel?: "website" }
 * `channel: "website"` switches to the form-submission prompt (see below); any
 * other value keeps the SMS rules.
 * Returns: { lead: boolean, confidence: number, reason: string }
 */

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

/**
 * Website-form submissions get their own prompt. The SMS rules below assume a
 * cold text to a business line, where a one-word message really is a wrong
 * number. A form is the opposite: the sender typed a name, an email and a phone
 * into our own site to reach us, so thin content means a customer who didn't
 * feel like writing much. Scoring those by the SMS rules junked four real
 * Google Ads leads (two address-only pastes, two one-word messages) before this
 * split existed, and Chris was never emailed about any of them.
 */
const SYSTEM_WEBSITE =
  "You classify submissions to the contact form on a Seattle concrete " +
  "contractor's own website. The sender has already typed a name, email and " +
  "phone to reach this business. Decide if the submitter is a potential " +
  "CUSTOMER or NOT.\n" +
  "Presume CUSTOMER. A short, vague, blank-ish, or address-only message is a " +
  "customer — people paste an address, type one word, or write nothing much " +
  "and wait for a call back. Never judge a submission by how little it says.\n" +
  "NOT a customer only when the submission is clearly selling something TO the " +
  "contractor — SEO, web design, marketing, ads, lead generation, appointment " +
  "setting, virtual assistants, AI tools, software, recruiting, financing, " +
  "insurance, business brokerage, invitations to bid on someone else's " +
  "project — or is obvious bot output (random character strings for a name " +
  "and message).\n" +
  "When torn, choose customer (true): a stray pitch is one quick dismissal, a " +
  "missed customer is a lost job.\n" +
  "Respond with ONLY a JSON object, no prose: " +
  '{"lead": true|false, "confidence": 0.0-1.0, "reason": "<=12 words"}';

const SYSTEM =
  "You classify inbound SMS texts sent to a Seattle concrete contractor's " +
  "business phone line. Decide if the text is a REAL potential customer lead " +
  "or NOT.\n" +
  "A LEAD is anyone who might want concrete work or is responding about a job: " +
  "driveways, patios, slabs, foundations, steps, walkways, repairs, demolition, " +
  "asking for a quote or estimate, describing a project, sharing an address, " +
  "photos, or dimensions, asking about scheduling or availability, or replying " +
  "to a prior message from Chris. Be INCLUSIVE here — if it could plausibly be " +
  "a customer, call it a lead.\n" +
  "NOT a lead: spam, scams, marketing blasts, political/automated texts, wrong " +
  "numbers, and especially vendors selling services TO the contractor — lead-" +
  "generation or appointment-setting offers ('I book qualified appointments for " +
  "contractors'), SEO/marketing/ads pitches, financing or insurance offers, " +
  "recruiting, software pitches. Be STRICT against anything selling to the " +
  "business rather than buying from it.\n" +
  "A text that reads like a real person in conversation — using Chris's name, " +
  "saying they'll email or call or send photos or details, replying to an " +
  "earlier message, or asking a question — is a LEAD even if it does not name " +
  "the specific job. When genuinely torn between a real person and spam, choose " +
  "lead (true): a stray spam is one quick dismissal, a missed customer is a lost job.\n" +
  "Respond with ONLY a JSON object, no prose: " +
  '{"lead": true|false, "confidence": 0.0-1.0, "reason": "<=12 words"}';

async function classify(
  text: string,
  from?: string,
  channel?: string
): Promise<{ lead: boolean; confidence: number; reason: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { lead: true, confidence: 0, reason: "classifier unconfigured; default include" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 120,
        temperature: 0,
        messages: [
          { role: "system", content: channel === "website" ? SYSTEM_WEBSITE : SYSTEM },
          { role: "user", content: `From: ${from || "unknown"}\nText: ${text}` },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("classify-sms OpenRouter error:", res.status, await res.text());
      return { lead: true, confidence: 0, reason: "classifier error; default include" };
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") return { lead: true, confidence: 0, reason: "no classifier output; default include" };
    // Be forgiving about fenced/extra text — pull the first {...} blob.
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { lead: true, confidence: 0, reason: "unparseable classifier output; default include" };
    const parsed = JSON.parse(match[0]) as { lead?: unknown; confidence?: unknown; reason?: unknown };
    return {
      lead: parsed.lead !== false, // anything but an explicit false counts as a lead
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch (err) {
    console.error("classify-sms threw:", err);
    return { lead: true, confidence: 0, reason: "classifier exception; default include" };
  } finally {
    clearTimeout(timeout);
  }
}

export default async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 20_000) return json({ error: "Payload too large" }, 413);

  let body: { text?: string; from?: string; channel?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const text = (body.text || "").trim();
  if (!text) return json({ error: "Missing text" }, 400);

  const result = await classify(text, body.from, body.channel);
  return json(result, 200);
};
