// Records taps on Chris's phone number.
//
// Before this, a visitor who came from an ad and then phoned instead of
// filling in the form left no trace: Google Ads saw a click with no result.
// One document-level listener covers every tel: link (header, footer, contact
// bar, contact page, landing pages) without touching each component.
//
// GA4 gets `click_to_call`. Google Ads imports it as a conversion, and an
// imported GA4 conversion is credited only to visits that came from a Google
// ad click, so organic taps do not inflate the ad numbers. PostHog gets
// `phone_tap` with the lead source, so taps from every source stay visible.
// A tap is a call attempt, not a completed call.

import { track } from "./analytics";
import { attributionPayload } from "./attribution";

let installed = false;

function areaOf(anchor: HTMLAnchorElement): string {
  if (anchor.closest("header")) return "header";
  if (anchor.closest("footer")) return "footer";
  // The mobile bar fixed to the bottom of every page (ContactBar.tsx).
  if (anchor.closest('nav[aria-label="Contact Portal"]')) return "contact_bar";
  return "page";
}

function handleClick(e: MouseEvent): void {
  const target = e.target as HTMLElement | null;
  const anchor = target?.closest<HTMLAnchorElement>('a[href^="tel:"]');
  if (!anchor) return;

  const area = areaOf(anchor);
  const page = window.location.pathname;

  if (typeof window.gtag === "function") {
    window.gtag("event", "click_to_call", {
      link_location: area,
      page_path: page,
      transport_type: "beacon",
    });
  }

  track("phone_tap", {
    area,
    page,
    lead_source: attributionPayload().lead_source,
  });
}

export function installPhoneTapTracking(): void {
  if (installed || typeof document === "undefined") return;
  // Capture phase, so a component that stops propagation cannot hide the tap.
  document.addEventListener("click", handleClick, true);
  installed = true;
}
