/**
 * One record per person (Chris, 2026-10-04: "we are not connecting the dots
 * between email, text and voicemail, so I see lots of dupes").
 *
 * Two jobs, both run from notify-lead after every new lead and every new
 * inbound message, so they see a lead the moment it has something to say:
 *
 * 1. extractIdentity: read the person's own words (form message, texts,
 *    voicemail transcripts, emails) for a name, street address, city and email,
 *    and fill ONLY the blanks on the lead. Chris's edits and what the form
 *    collected are never overwritten. Angela texted "my name is Angela. Address
 *    is 2802 11th Ave E, Seattle" and the lead stayed nameless; 46 of 181 real
 *    leads were nameless on 2026-10-05, about 20 of them with the name sitting
 *    in a text.
 *
 * 2. findMatch: decide whether another lead is the same person.
 *      - same phone, or same email            -> "sure" (auto-merge)
 *      - same normalized full name, and no
 *        phone/email disagreement             -> "sure" (auto-merge)
 *      - same full name but the phones or
 *        emails differ                        -> "maybe" (Merge button for Chris)
 *      - a first name alone                   -> no match
 *    Junk rows and "lost" leads never match: merge-leads lets "lost" win the
 *    stage, so merging a live inquiry into a lost one would bury it.
 *
 * Auto-merge keeps the OLDER lead (it holds the history and Chris's notes) and
 * folds the newer one in through portal-ops' merge-leads, which unions photos
 * and messages and keeps the richer value on every field. The merge is written
 * to raw.auto_merged_from on the survivor so it can be audited.
 */

import { digits10, validEmail } from "./lead-links";
import { normalizeName, type CorrespondenceEntry, type LeadRow } from "./lead-db";

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";
const SUPABASE_URL = "https://tldsueyauxlctrywnfed.supabase.co";

export type Identity = { name?: string; street?: string; city?: string; email?: string };

const SYSTEM =
  "You read messages a homeowner sent to Chris, a Seattle concrete contractor, " +
  "and pull out the sender's own contact details when they state them. Return " +
  "only what the SENDER says about THEMSELVES: their name, the street address of " +
  "the job (number and street), the city, and their email address. Never guess, " +
  "never infer a name from an email address, never return Chris's or Portal's " +
  "details, and never return a name that is clearly a business unless the sender " +
  "gives no personal name. A first name alone is fine. Leave a field null when the " +
  "messages do not state it. Respond with JSON only, no fences: " +
  '{"name": string|null, "street": string|null, "city": string|null, "email": string|null}';

/** The sender's inbound words, newest last, capped so the prompt stays small. */
export function inboundText(lead: Pick<LeadRow, "message" | "correspondence">): string {
  const parts = (lead.correspondence || [])
    .filter((e: CorrespondenceEntry) => e.direction === "in" && (e.body || "").trim())
    .map((e) => `[${e.type}] ${e.body.trim()}`);
  if ((lead.message || "").trim()) parts.unshift(`[message] ${lead.message!.trim()}`);
  return parts.join("\n\n").slice(0, 6000);
}

/** Pull name / street / city / email out of the sender's words. Null on any failure. */
export async function extractIdentity(text: string, opts: { timeoutMs?: number } = {}): Promise<Identity | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || !text.trim()) return null;
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
      console.error("lead-identity OpenRouter error:", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    const match = typeof raw === "string" ? raw.match(/\{[\s\S]*\}/) : null;
    if (!match) return null;
    const p = JSON.parse(match[0]) as Record<string, unknown>;
    const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() && !/^(null|unknown|n\/a|none)$/i.test(v.trim()) ? v.trim().slice(0, max) : undefined);
    const out: Identity = {
      name: str(p.name, 80),
      street: str(p.street, 120),
      city: str(p.city, 60),
      email: validEmail(str(p.email, 254)),
    };
    // A "name" that is really Chris or the business is noise.
    if (out.name && /\b(chris|portal)\b/i.test(out.name) && out.name.split(/\s+/).length <= 2) out.name = undefined;
    return out.name || out.street || out.city || out.email ? out : null;
  } catch (err) {
    console.error("lead-identity threw:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** The column patch that fills blanks only. Empty when nothing new was learned. */
export function identityPatch(lead: Pick<LeadRow, "name" | "email" | "address">, found: Identity): Record<string, string> {
  const patch: Record<string, string> = {};
  if (found.name && !(lead.name || "").trim()) patch.name = found.name;
  if (found.email && !(lead.email || "").trim()) patch.email = found.email;
  if (!(lead.address || "").trim()) {
    const addr = [found.street, found.city].filter(Boolean).join(", ");
    if (addr) patch.address = addr;
  }
  return patch;
}

export type MatchVerdict = "sure" | "maybe";
export type Match = { verdict: MatchVerdict; other: MatchRow; reason: string };
export type MatchRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  channel: string;
  stage: string;
  created_at: string;
  raw?: { junk?: unknown } | null;
};

const SELECT = "id,name,phone,email,channel,stage,created_at,raw";

/** Candidates: every other non-junk, non-lost lead. 500 newest is the whole table today. */
export async function loadCandidates(secret: string, excludeId: string): Promise<MatchRow[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?stage=neq.lost&select=${SELECT}&order=created_at.desc&limit=500`, {
      headers: { apikey: secret, Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) return [];
    return ((await res.json()) as MatchRow[]).filter((r) => r.id !== excludeId && !r.raw?.junk);
  } catch {
    return [];
  }
}

/**
 * Pure: the best match for `lead` among `rows`, or null. "sure" beats "maybe";
 * among equals the oldest row wins, since it holds the history.
 */
export function findMatch(lead: MatchRow, rows: MatchRow[]): Match | null {
  const phone = digits10(lead.phone);
  const email = (validEmail(lead.email) || "").toLowerCase();
  const name = normalizeName(lead.name);
  // A first name alone ("Mike") never matches: too many Mikes.
  const fullName = name.split(" ").length >= 2 && name.replace(/\s/g, "").length >= 5 ? name : "";

  let best: Match | null = null;
  const consider = (m: Match) => {
    if (!best) best = m;
    else if (m.verdict === "sure" && best.verdict !== "sure") best = m;
    else if (m.verdict === best.verdict && m.other.created_at < best.other.created_at) best = m;
  };

  for (const r of rows) {
    const rPhone = digits10(r.phone);
    const rEmail = (validEmail(r.email) || "").toLowerCase();
    const rName = normalizeName(r.name);
    if (phone && rPhone && phone === rPhone) {
      consider({ verdict: "sure", other: r, reason: "same phone number" });
      continue;
    }
    if (email && rEmail && email === rEmail) {
      consider({ verdict: "sure", other: r, reason: "same email address" });
      continue;
    }
    if (fullName && rName === fullName) {
      const phonesDisagree = Boolean(phone && rPhone && phone !== rPhone);
      const emailsDisagree = Boolean(email && rEmail && email !== rEmail);
      if (!phonesDisagree && !emailsDisagree) consider({ verdict: "sure", other: r, reason: "same full name, nothing disagrees" });
      else consider({ verdict: "maybe", other: r, reason: "same full name, different " + (phonesDisagree ? "phone" : "email") });
      continue;
    }
  }
  return best;
}
