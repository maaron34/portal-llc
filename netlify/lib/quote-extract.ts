/**
 * The price Chris quoted a customer, read out of his own emails and texts.
 *
 * Chris does not use the CRM's estimator: he prices in his head or his own
 * sheet and writes the number into his reply, in his own words ("Our bid for
 * this scope of work is $23,700", "in the $8,000-$12,000 range", "probably in
 * the ballpark of $15K", two options with a price each). A pattern match cannot
 * read those reliably, so a small model does, and the result is saved on the
 * lead as raw.quoted_estimate for the CRM to show at the top.
 *
 * Only Chris's newest words are read: quoted history below a reply is cut, and
 * his standard "send me photos and I can respond with a ballpark" opener has no
 * number in it, so it reads as no quote.
 */

import type { CorrespondenceEntry } from "./lead-db";

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";

export type QuotedEstimate = {
  low: number;
  high: number | null;
  /** Short label for the CRM, e.g. "$8,000-$12,000, back patio". */
  summary: string;
  /** Chris's own sentence the number came from. */
  quote: string;
  source: "email" | "text";
  at: string;
  message_id: string;
};

/** Messages to read, newest first: Chris's outbound emails and texts only. */
export const MAX_MESSAGES = 6;

/** Chris's new text only: cut quoted replies and forwarded history. */
export function ownWords(body: string): string {
  const lines = (body || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^On .{4,200}wrote:\s*$/i.test(t)) break;
    if (/^-{2,}\s*(Original Message|Forwarded message)/i.test(t)) break;
    if (/^From:\s.+/i.test(t) && out.some((l) => l.trim())) break;
    if (t.startsWith(">")) continue;
    out.push(line);
  }
  return out.join("\n").trim().slice(0, 4000);
}

const SYSTEM = `You read one message a concrete contractor (Chris, Portal Concrete in Seattle) sent a customer, and report the price he quoted in it, if any.

Reply with JSON only:
{"quoted": true|false, "low": number|null, "high": number|null, "summary": string|null, "quote": string|null}

Rules:
- A quote is a dollar figure Chris gives for the customer's job: a bid, an estimate, a ballpark, a range, or options with prices. "$15K" is 15000.
- A single figure: low is that number, high is null. A range: low and high. Several options: low is the cheapest, high the most expensive. "$20,000+" or "over $20K": low 20000, high null.
- summary: under 60 characters, the price as written plus what it is for if he says ("$8,000-$12,000, back patio"; "Option 1 $13,100 / Option 2 $9,800"). Use a plain hyphen for ranges.
- quote: Chris's sentence that contains the price, copied exactly, under 160 characters.
- Not a quote: a deposit amount alone, a payment receipt, a price for something other than this customer's job, or a message with no dollar figure. Then {"quoted": false}.
- Never invent a number that is not in the message.`;

export async function extractQuote(text: string, opts: { timeoutMs?: number } = {}): Promise<Omit<QuotedEstimate, "source" | "at" | "message_id"> | null> {
  const key = process.env.OPENROUTER_API_KEY;
  // No dollar figure at all means no quote; skip the model call.
  if (!key || !/\$\s?\d|\d\s?k\b|\d{1,3}(,\d{3})+|\d{3,}|\d\s?(dollars|bucks)\b/i.test(text)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 200,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("quote-extract OpenRouter error:", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    const match = typeof raw === "string" ? raw.match(/\{[\s\S]*\}/) : null;
    if (!match) return null;
    return parseQuote(JSON.parse(match[0]) as Record<string, unknown>, text);
  } catch (err) {
    console.error("quote-extract threw:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const digitsIn = (s: string) => s.replace(/[^\d]/g, "");

/**
 * Validate the model's answer. The low figure must actually appear in the
 * message (as digits, or as "15k"/"15K" for 15000), so a made-up number is
 * dropped rather than shown to Chris as his own quote.
 */
export function parseQuote(p: Record<string, unknown>, text: string): Omit<QuotedEstimate, "source" | "at" | "message_id"> | null {
  if (p.quoted !== true) return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v < 10_000_000 ? Math.round(v) : null);
  const low = num(p.low);
  if (low == null) return null;
  const high = num(p.high);
  const flat = digitsIn(text);
  // "15K", "15.5k": compare the thousands form, decimal point escaped.
  const k = String(low / 1000).replace(".", "\\.");
  const thousands = low % 100 === 0 ? new RegExp(`\\b${k}(\\.0)?\\s?k\\b`, "i") : null;
  if (!flat.includes(String(low)) && !(thousands && thousands.test(text))) return null;
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "");
  const money = (n: number) => `$${n.toLocaleString("en-US")}`;
  return {
    low,
    high: high != null && high > low ? high : null,
    summary: str(p.summary, 80) || (high != null && high > low ? `${money(low)}-${money(high)}` : money(low)),
    quote: str(p.quote, 200),
  };
}

/**
 * The newest quote in Chris's messages, reading at most MAX_MESSAGES of his
 * emails and texts newest first. Null when none of them carries a price.
 */
export async function latestQuote(entries: CorrespondenceEntry[]): Promise<QuotedEstimate | null> {
  const mine = entries
    .filter((e) => e.direction === "out" && (e.type === "email" || e.type === "text") && (e.body || "").trim())
    .sort((a, b) => (b.at || "").localeCompare(a.at || ""))
    .slice(0, MAX_MESSAGES);
  for (const e of mine) {
    const words = ownWords(e.body);
    const q = await extractQuote(words);
    if (q) return { ...q, source: e.type === "text" ? "text" : "email", at: e.at, message_id: e.id };
  }
  return null;
}
