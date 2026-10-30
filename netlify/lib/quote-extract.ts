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

/**
 * Chris's earlier email as quoted inside a customer's reply. Until late
 * October 2026 his sent mail was not captured, so for most leads the only copy
 * of his quote is the history under the customer's answer:
 *   On Tue, Oct 20, 2026 at 3:12 PM Chris Hildebrand <chris@buildwithportal.com> wrote:
 *   > Our quote for this scope of work is $14,850.
 * Returns his quoted words (quote markers removed) up to the next quoted
 * header, which belongs to someone else. Empty when the reply quotes no email
 * from Chris.
 */
export function chrisQuotedPart(body: string): string {
  const lines = (body || "").replace(/\r\n/g, "\n").split("\n");
  const header = (l: string) => /^(>\s*)*(On\s.{4,200}wrote:|From:\s.+)\s*$/i.test(l.trim());
  const isChris = (l: string) => /chris\s+hildebrand|chris@buildwithportal\.com|portal concrete/i.test(l);
  const out: string[] = [];
  let inChris = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Gmail wraps a long "On ... wrote:" header over two lines.
    const joined = i + 1 < lines.length && !/wrote:\s*$/i.test(line) && /wrote:\s*$/i.test(lines[i + 1]) ? `${line} ${lines[i + 1]}` : line;
    if (header(joined) || header(line)) {
      if (inChris && out.length) break;
      inChris = isChris(joined);
      continue;
    }
    if (inChris) out.push(line.replace(/^(\s*>\s?)+/, ""));
  }
  return out.join("\n").trim().slice(0, 4000);
}

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

/** The model call failed (timeout, HTTP error, unreadable answer): unknown, not "no quote". */
export const FAILED = "failed" as const;

export async function extractQuote(
  text: string,
  opts: { timeoutMs?: number } = {}
): Promise<Omit<QuotedEstimate, "source" | "at" | "message_id"> | null | typeof FAILED> {
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
      return FAILED;
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    const match = typeof raw === "string" ? raw.match(/\{[\s\S]*\}/) : null;
    if (!match) return FAILED;
    const answer = JSON.parse(match[0]) as Record<string, unknown>;
    // The model saw a quote but its figure is not in the message: unread, not
    // "no quote", so an older price is not shown in its place.
    return parseQuote(answer, text) ?? (answer.quoted === true ? FAILED : null);
  } catch (err) {
    console.error("quote-extract threw:", err);
    return FAILED;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Every amount written in the message, as whole numbers: "$23,700" -> 23700,
 * "$15.5K" -> 15500, "15000 dollars" -> 15000. Each figure is read whole, so a
 * wrong 5000 never matches inside 15000.
 */
export function amountsIn(text: string): Set<number> {
  const out = new Set<number>();
  const re = /(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?\s?(k\b)?/gi;
  // "$8-12K": the K belongs to both ends.
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s?[-–]\s?\$?(\d+(?:\.\d+)?)\s?k\b/gi)) {
    out.add(Math.round(Number(m[1]) * 1000));
    out.add(Math.round(Number(m[2]) * 1000));
  }
  for (const m of text.matchAll(re)) {
    const n = Number(`${m[1].replace(/,/g, "")}${m[2] ? `.${m[2]}` : ""}`);
    if (Number.isFinite(n)) out.add(Math.round(m[3] ? n * 1000 : n));
  }
  return out;
}

/**
 * Validate the model's answer. Both figures must actually be written in the
 * message, so a made-up number is dropped rather than shown to Chris as his
 * own quote.
 */
const squash = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
/** The sentence the model says it copied is really in the message. */
const inText = (quote: string, text: string): boolean => Boolean(quote) && squash(text).includes(squash(quote));

export function parseQuote(p: Record<string, unknown>, text: string): Omit<QuotedEstimate, "source" | "at" | "message_id"> | null {
  if (p.quoted !== true) return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v < 10_000_000 ? Math.round(v) : null);
  const low = num(p.low);
  if (low == null) return null;
  const written = amountsIn(text);
  if (!written.has(low)) return null;
  const rawHigh = num(p.high);
  const high = rawHigh != null && rawHigh > low && written.has(rawHigh) ? rawHigh : null;
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "");
  const money = (n: number) => `$${n.toLocaleString("en-US")}`;
  return {
    low,
    high,
    summary: high != null ? `${money(low)}-${money(high)}` : money(low),
    quote: inText(str(p.quote, 200), text) ? str(p.quote, 200) : "",
  };
}

/**
 * The newest quote in Chris's messages, reading at most MAX_MESSAGES of his
 * emails and texts newest first. Null when none of them carries a price.
 */
export async function latestQuote(entries: CorrespondenceEntry[]): Promise<QuotedEstimate | null | typeof FAILED> {
  // Chris's own messages, plus his earlier emails as quoted in customers'
  // replies, newest first.
  const candidates = entries
    .flatMap((e) => {
      if (!(e.body || "").trim()) return [];
      if (e.direction === "out" && (e.type === "email" || e.type === "text")) return [{ e, words: ownWords(e.body) }];
      if (e.direction === "in" && e.type === "email") {
        const words = chrisQuotedPart(e.body);
        return words ? [{ e, words }] : [];
      }
      return [];
    })
    .sort((a, b) => (b.e.at || "").localeCompare(a.e.at || ""))
    .slice(0, MAX_MESSAGES);
  for (const { e, words } of candidates) {
    const q = await extractQuote(words);
    // A message that could not be read stops the scan: an older price must not
    // stand in for a newer one nobody has read yet.
    if (q === FAILED) return FAILED;
    if (q) return { ...q, source: e.type === "text" ? "text" : "email", at: e.at, message_id: e.id };
  }
  return null;
}
