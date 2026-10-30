/**
 * Two flags Chris asked for at the Oct 4 meeting. Both only FLAG: nothing is
 * deleted or sent on its own.
 *
 * 1. Service area (portal-ops#18). Distance from West Seattle, where Portal is
 *    based. Over 25 miles: the suggested reply becomes the polite "outside our
 *    service area" message. 15 to 25 miles: flagged "borderline" with the
 *    distance, the normal reply stays, and Chris decides (he takes some of
 *    those when he has room). Geocoding: the US Census geocoder for a street
 *    address (free, no key), then OpenStreetMap's Nominatim for a city or
 *    neighborhood alone.
 *
 * 2. Likely scam (portal-ops#19). A short AI check against the patterns Chris
 *    sees: can't talk by phone ("I'm deaf", "hearing impaired"), a start date
 *    of next week with no street address, payment by check or a third party,
 *    an out-of-area or overseas contact with a vague job, someone else to meet
 *    on site. Returns the reasons so the lead email can say why.
 */

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";

/** Portal's base: the Alaska Junction, West Seattle. */
const BASE = { lat: 47.5615, lng: -122.387 };
export const OUT_OF_AREA_MILES = 25;
export const BORDERLINE_MILES = 15;

/** `for` is the text that was looked up, so a cached result is reused only for the same input. */
export type Area = { miles: number; verdict: "in" | "borderline" | "out"; place: string; for?: string };

export function milesFromBase(lat: number, lng: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - BASE.lat);
  const dLng = toRad(lng - BASE.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(BASE.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Distances are straight lines, so places across the water read closer than
 * the drive (Vashon and Bainbridge are a ferry away). Those are at least
 * "borderline" whatever the miles say.
 */
const ACROSS_WATER = /\b(vashon|maury island|bainbridge|kitsap|bremerton|port orchard|poulsbo|silverdale|gig harbor|kingston|hansville|port townsend|whidbey)\b/i;

export function areaVerdict(miles: number, place = ""): Area["verdict"] {
  const v = miles > OUT_OF_AREA_MILES ? "out" : miles >= BORDERLINE_MILES ? "borderline" : "in";
  return v === "in" && ACROSS_WATER.test(place) ? "borderline" : v;
}

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "buildwithportal.com lead triage (chris@buildwithportal.com)" }, signal: controller.signal });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Where an address is, as miles from West Seattle. Null when it cannot be placed. */
export async function locate(address: string | null | undefined): Promise<Area | null> {
  return (await locateChecked(address)).area;
}

/**
 * Same, plus whether a geocoder actually answered. "Not found" is evidence
 * against an address only when a lookup ran and came back empty; a timeout or
 * an outage says nothing, and must not count as a scam red flag.
 */
export async function locateChecked(address: string | null | undefined): Promise<{ area: Area | null; checked: boolean }> {
  const a = (address || "").trim();
  if (a.length < 3) return { area: null, checked: false };
  // Assume Washington when the address names no state; nearly every lead is local.
  const q = /\b(WA|Washington)\b/i.test(a) ? a : `${a}, WA`;

  const census = (await getJson(
    `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=${encodeURIComponent(q)}`,
    5000
  )) as { result?: { addressMatches?: { coordinates: { x: number; y: number }; matchedAddress: string }[] } } | null;
  const hit = census?.result?.addressMatches?.[0];
  if (hit) {
    const miles = milesFromBase(hit.coordinates.y, hit.coordinates.x);
    return { area: { miles: Math.round(miles * 10) / 10, verdict: areaVerdict(miles, `${hit.matchedAddress} ${a}`), place: hit.matchedAddress }, checked: true };
  }

  const osm = (await getJson(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`,
    5000
  )) as { lat: string; lon: string; display_name: string }[] | null;
  const o = osm?.[0];
  if (o) {
    const miles = milesFromBase(Number(o.lat), Number(o.lon));
    return { area: { miles: Math.round(miles * 10) / 10, verdict: areaVerdict(miles, `${o.display_name} ${a}`), place: o.display_name.split(",").slice(0, 3).join(",") }, checked: true };
  }
  // Both answered (non-null JSON) and neither placed it: a confirmed miss.
  return { area: null, checked: census != null && osm != null };
}

/** The polite decline, for a lead well outside the area. Never sent on its own. */
export function outOfAreaReply(firstName: string, place: string, asText: boolean): string {
  const hi = firstName ? `Hi ${firstName}, thanks` : "Thanks";
  const where = place ? `${place.split(",")[0]} is` : "that location is";
  return asText
    ? `${hi} for reaching out. Unfortunately ${where} outside the area we serve, so we're not the right crew for this one. I hope you find someone great for the project.`
    : `${hi} for reaching out about your project.\n\nUnfortunately ${where} outside the area we serve, so we're not the right crew for this one. I hope you find someone great for it.\n\nChris`;
}

export type ScamCheck = { scam: boolean; reasons: string[] };

const SCAM_SYSTEM =
  "You screen messages sent to Chris, a residential concrete contractor in Seattle, for the scam " +
  "patterns contractors get. Red flags: the sender says they cannot talk by phone (deaf, hearing " +
  "impaired, at sea, overseas, in the hospital) and wants email or text only; an urgent start " +
  "(\"next week\") with no street address or a vague job; asks to pay by check, cashier's check, " +
  "wire, or through a third party or 'my contractor/assistant'; wants Chris to pay someone else or " +
  "refund an overpayment; a job described in generic terms with no real detail (\"I have a project, " +
  "send your price\"); an out-of-state or overseas private individual for a job in Seattle; asks for Chris's " +
  "license or insurance before saying anything about the job; a 'scope of work', 'project spec', " +
  "'bid package' or 'requirements' said to be 'available for your review here', 'at the link' or " +
  "'attached' while the message itself describes no job (that is a phishing lure, and it counts as " +
  "unmistakable when the greeting is also generic, like 'Hello,' with no name); an address that " +
  "cannot be found on a map. Chris also gets real bid requests from general contractors and " +
  "other trades, and those are legitimate business, not scams: a company asking for a concrete " +
  "quote on a project, with plans and specs, prevailing wage, public works, an RFP or a bid date. " +
  "A full business signature (person's name and title, company name, office phone, street address) " +
  "with an email at that company's own domain counts strongly against a scam. A company based " +
  "elsewhere in the US is NOT a red flag for a job in Seattle. Documents " +
  "that actually arrived as attachments (the count is given) are real files, not a lure; the lure is " +
  "a link to view the documents or a claimed attachment that never arrived. Real homeowners are " +
  "often brief, so brevity alone is NOT a red flag, and a vendor pitch is not a scam (another system handles those). " +
  "Flag as a likely scam only when two or more red flags are present, or one is unmistakable (asks " +
  "Chris to pay or refund money, or a check overpayment). Respond with JSON only: " +
  '{"scam": true|false, "reasons": ["<plain short reason>", ...]}';

/**
 * `mapped`: whether the address geocoded. null when there was no address to
 * check. A street address the Census and Nominatim both fail to find is a made-up
 * one, which is how form bots fill required fields ("348 Matthew Islands Suite
 * 152, Port Lisabury" passed every required-field check on 2026-10-09).
 */
export async function checkScam(
  text: string,
  phone: string | null | undefined,
  hasStreet: boolean,
  mapped: boolean | null = null,
  extra: { email?: string | null; files?: number } = {}
): Promise<ScamCheck | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || !text.trim()) return null;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 200,
        temperature: 0,
        messages: [
          { role: "system", content: SCAM_SYSTEM },
          {
            role: "user",
            content:
              `Phone: ${phone || "none"}\nEmail: ${extra.email || "none"}\nDocuments attached: ${extra.files ?? 0}\n` +
              `Street address given: ${hasStreet ? "yes" : "no"}\n` +
              `Address found on a map: ${mapped == null ? "not checked" : mapped ? "yes" : "no"}\nMessages:\n${text.slice(0, 5000)}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    const m = typeof raw === "string" ? raw.match(/\{[\s\S]*\}/) : null;
    if (!m) return null;
    const p = JSON.parse(m[0]) as { scam?: unknown; reasons?: unknown };
    const reasons = Array.isArray(p.reasons) ? p.reasons.filter((r): r is string => typeof r === "string").map((r) => r.slice(0, 120)).slice(0, 4) : [];
    return { scam: p.scam === true, reasons };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
