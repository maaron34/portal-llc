// Lightweight first-touch lead attribution.
//
// Captures UTM params, ad click IDs (gclid/fbclid), referrer, and the landing
// page on first load and persists them to sessionStorage so they survive
// client-side navigation (e.g. an ad lands on /lp/driveways?utm_... and the
// visitor then submits from /contact). Exposes a flat, non-empty payload to
// merge into Web3Forms submissions (so the lead email shows the source) and,
// later, the Make webhook.

const STORAGE_KEY = "portal_attribution";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

type UtmKey = (typeof UTM_KEYS)[number];

export type Attribution = Partial<Record<UtmKey, string>> & {
  referrer?: string;
  landing_page?: string;
  captured_at?: string;
};

function readFromUrl(): Attribution {
  const params = new URLSearchParams(window.location.search);
  const attr: Attribution = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) attr[key] = value;
  }
  attr.referrer = document.referrer || "direct";
  attr.landing_page = window.location.pathname + window.location.search;
  return attr;
}

function hasAttributionSignal(attr: Attribution): boolean {
  // A meaningful first touch = any UTM/click ID, or a real (non-direct) referrer.
  return (
    UTM_KEYS.some((key) => attr[key]) ||
    (!!attr.referrer && attr.referrer !== "direct")
  );
}

/**
 * Capture first-touch attribution. Call once on app mount.
 * First touch wins: if a prior capture already carries a real signal (UTM,
 * click ID, or a non-direct referrer), keep it rather than overwriting it on a
 * later full page load. (A pure-direct capture can still be upgraded if the
 * visitor later reloads on a UTM-tagged URL.)
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing && hasAttributionSignal(JSON.parse(existing) as Attribution)) return;
    const attr = readFromUrl();
    attr.captured_at = new Date().toISOString();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attr));
  } catch {
    // sessionStorage blocked (private mode, etc.) — capture is best-effort.
  }
}

function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Attribution;
  } catch {
    // fall through to a live read
  }
  return readFromUrl();
}

/** Human-readable one-liner for the lead notification email. */
export function leadSourceSummary(attr: Attribution): string {
  if (attr.utm_source) {
    return [attr.utm_source, attr.utm_medium, attr.utm_campaign]
      .filter(Boolean)
      .join(" / ");
  }
  if (attr.gclid) return "Google Ads (gclid)";
  if (attr.fbclid) return "Meta Ads (fbclid)";
  if (attr.referrer && attr.referrer !== "direct") {
    try {
      return `Referral: ${new URL(attr.referrer).hostname}`;
    } catch {
      return `Referral: ${attr.referrer}`;
    }
  }
  return "Direct / Organic";
}

/**
 * Flat, non-empty fields to merge into a Web3Forms payload (and, later, the
 * Make webhook). Always includes a readable `lead_source`; omits empty UTM
 * fields so the lead email stays clean for direct/organic traffic.
 */
export function attributionPayload(): Record<string, string> {
  const attr = getAttribution();
  const payload: Record<string, string> = {
    lead_source: leadSourceSummary(attr),
  };
  for (const key of UTM_KEYS) {
    if (attr[key]) payload[key] = attr[key] as string;
  }
  // Emitted as `http_referrer` (not `referrer`) so it can never be confused
  // with Refer.tsx's `referrer_name`/`referrer_phone` (the referral-program
  // person) when a downstream reader or the Make webhook maps the fields.
  if (attr.referrer) payload.http_referrer = attr.referrer;
  if (attr.landing_page) payload.landing_page = attr.landing_page;
  return payload;
}
