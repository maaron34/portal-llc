// ChatGPT Ads Measurement Pixel (https://developers.openai.com/ads/measurement-pixel).
// Inert until VITE_OPENAI_PIXEL_ID is set in the Netlify build environment.

const PIXEL_ID = (import.meta.env.VITE_OPENAI_PIXEL_ID as string | undefined)?.trim();
const SDK_URL = "https://bzrcdn.openai.com/sdk/oaiq.min.js";

type Oaiq = ((...args: unknown[]) => void) & { q?: unknown[][] };

export function initOpenAIPixel(): void {
  if (!PIXEL_ID || typeof window === "undefined" || window.oaiq) return;
  const q: Oaiq = (...args: unknown[]) => {
    q.q!.push(args);
  };
  q.q = [];
  window.oaiq = q;
  const js = document.createElement("script");
  js.async = true;
  js.src = SDK_URL;
  document.head.appendChild(js);
  window.oaiq("init", { pixelId: PIXEL_ID });
}

// Standard lead event; the pixel's automatic advanced matching handles user data.
export function trackOpenAILead(): void {
  if (typeof window !== "undefined" && window.oaiq) {
    window.oaiq("measure", "lead_created", { type: "customer_action" });
  }
}
