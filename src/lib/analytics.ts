import posthog from "posthog-js";

// PostHog project "Portal" (Michael's own PostHog org, kept separate from 10Spot).
// A project API key is public by design: it can send events, never read them.
const POSTHOG_KEY = "phc_t3rMNKyu8e6AggJXVZJqzt36HtRPp6nEqUmLwedZHQTn";
const LIVE_HOST = "buildwithportal.com";

let started = false;

/**
 * Starts PostHog on the live site only. Deploy previews, localhost and the
 * build-time prerender (headless Chromium on localhost) never send events, so
 * campaign numbers count real visitors and nothing PostHog injects can be baked
 * into the prerendered HTML.
 */
export function initAnalytics(): void {
  if (started || typeof window === "undefined") return;
  if (window.location.hostname !== LIVE_HOST) return;
  if (navigator.webdriver) return;
  posthog.init(POSTHOG_KEY, {
    api_host: "https://us.i.posthog.com",
    capture_pageview: "history_change",
    person_profiles: "identified_only",
    session_recording: { maskAllInputs: true },
  });
  started = true;
}

/**
 * Records a named event with properties. Never pass a name, email, phone or
 * address: lead details live in the lead system, not in analytics.
 */
export function track(event: string, properties: Record<string, string | undefined> = {}): void {
  if (!started) return;
  posthog.capture(event, properties);
}
