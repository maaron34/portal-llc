/**
 * Draft the reply Chris will send a new lead, in his voice, asking for what he
 * needs to estimate (photos, rough dimensions, site access). Never prices.
 *
 * One OpenRouter call returns three things so the email can be built from a
 * single round-trip: the draft itself, a 2-5 word topic for the subject line
 * ("retaining wall replacement"), and the caller's name when a voicemail
 * transcript states it (so a phone-only lead stops being a bare number).
 *
 * Returns null on any failure. A missing draft must never block the email or
 * the captured lead; the email simply goes out without a suggested reply.
 */

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";

export type DraftInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  project_type?: string | null;
  timeline?: string | null;
  message?: string | null;
  channel?: string | null;
  gemini_notes?: string | null;
  /** How many messages are already on the thread (0 for a brand-new lead). */
  prior_messages?: number;
};

export type DraftResult = { draft: string; topic: string; caller_name: string | null };

const BASE =
  "You draft a short reply that Chris, owner of Portal Seattle Concrete (a Seattle " +
  "concrete contractor), will send to a brand-new lead. Goal: thank them, reference " +
  "their specific project, and ask for exactly what Chris needs to give an accurate " +
  "estimate: clear photos of the area, rough dimensions (length x width, plus " +
  "thickness or height if they know it), and site access details (driveway or gate " +
  "width, slope, anything blocking a pour). Warm but direct, first person as Chris. " +
  "Never quote a price or invent details. Never use an em dash; when a sentence wants " +
  "a dash, use a spaced hyphen ( - ) or a comma. No bracketed placeholders. If a triage note about their " +
  "photos is provided, ask only for what it says is still missing.";

const EMAIL_STYLE = "This reply is an email: 3-5 sentences, and sign off as Chris.";
const TEXT_STYLE =
  "This reply is a text message sent from Chris's business number: 2-4 short " +
  "sentences, no greeting line on its own, no signature block, and it should read " +
  "naturally on a phone. If they left a voicemail, open by acknowledging the call.";

const OUTPUT =
  'Respond with JSON only, no fences: {"topic": "<2-5 lowercase words naming the job, e.g. ' +
  '\\"retaining wall replacement\\" or \\"driveway pour\\">", "caller_name": "<the person\'s ' +
  'first and last name only if they state it in their message or transcript, else null>", ' +
  '"draft": "<the reply>"}';

const isPhoneChannel = (ch?: string | null): boolean => ["quo", "quo-sms", "text", "voicemail"].includes((ch || "").toLowerCase());

export async function draftReply(input: DraftInput, opts: { timeoutMs?: number } = {}): Promise<DraftResult | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const lines = [
    input.name ? `Name: ${input.name}` : "",
    input.address ? `Address: ${input.address}` : "",
    input.project_type ? `Project type: ${input.project_type}` : "",
    input.timeline ? `Timeline: ${input.timeline}` : "",
    input.channel ? `How they reached us: ${isPhoneChannel(input.channel) ? (input.channel === "voicemail" ? "voicemail" : "text message") : input.channel}` : "",
    input.message ? `What they ${input.channel === "voicemail" ? "said" : "wrote"}: ${input.message}` : "",
    input.gemini_notes ? `Triage note from their photos: ${input.gemini_notes}` : "",
    input.prior_messages ? `Messages already on this thread: ${input.prior_messages}` : "",
  ].filter(Boolean);

  const system = [BASE, isPhoneChannel(input.channel) ? TEXT_STYLE : EMAIL_STYLE, OUTPUT].join(" ");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 600,
        temperature: 0.6,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `New lead:\n${lines.join("\n") || "(no details provided)"}` },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("draft-reply OpenRouter error:", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) return null;

    // Be forgiving about fenced or wrapped output: pull the first {...} blob. If
    // there is none, the whole text is the draft (the old, pre-JSON behavior).
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { draft: raw.trim(), topic: "", caller_name: null };
    try {
      const parsed = JSON.parse(match[0]) as { draft?: unknown; topic?: unknown; caller_name?: unknown };
      const draft = typeof parsed.draft === "string" ? parsed.draft.trim() : "";
      if (!draft) return { draft: raw.trim(), topic: "", caller_name: null };
      return {
        draft,
        topic: typeof parsed.topic === "string" ? cleanTopic(parsed.topic) : "",
        caller_name: typeof parsed.caller_name === "string" ? cleanName(parsed.caller_name) : null,
      };
    } catch {
      return { draft: raw.trim(), topic: "", caller_name: null };
    }
  } catch (err) {
    console.error("draft-reply threw:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function cleanTopic(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 5).join(" ");
}

function cleanName(n: string): string | null {
  const v = n.replace(/[\r\n"<>]/g, "").trim();
  if (!v || /^(null|unknown|none|n\/a)$/i.test(v) || v.length > 80) return null;
  return v;
}
