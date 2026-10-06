/**
 * Shared by the contact form and the ad landing pages (Chris, 2026-10-04):
 * name, phone, street address and city are required, email is optional, and
 * "How did you hear about us?" is an optional question the visitor answers so
 * Chris never has to.
 */

export const FORM_VERSION = "2";

export const HEARD_ABOUT_OPTIONS = [
  { value: "", label: "Choose one (optional)" },
  { value: "google-search", label: "Google search" },
  { value: "ai-tool", label: "AI tool like ChatGPT" },
  { value: "google-ad", label: "Google ad" },
  { value: "nextdoor", label: "Nextdoor" },
  { value: "instagram-facebook", label: "Instagram or Facebook" },
  { value: "friend-past-customer", label: "Friend or past customer" },
  { value: "saw-a-job", label: "Saw a job or sign" },
  { value: "other", label: "Other" },
];

export function heardAboutLabel(value: string | null | undefined): string {
  return HEARD_ABOUT_OPTIONS.find((o) => o.value && o.value === value)?.label || "";
}

/** True for a US/Canadian number: 10 digits, or 11 starting with 1. */
export function isUsPhone(phone: string): boolean {
  const d = (phone || "").replace(/\D/g, "");
  return d.length === 10 || (d.length === 11 && d.startsWith("1"));
}

/** What the lead row's single address column holds. */
export const fullAddress = (street: string, city: string): string =>
  [street.trim(), city.trim()].filter(Boolean).join(", ");
