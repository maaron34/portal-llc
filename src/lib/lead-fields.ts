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
  { value: "google-ad", label: "Google ad" },
  { value: "ai-tool", label: "AI tool like ChatGPT" },
  { value: "nextdoor", label: "Nextdoor" },
  { value: "instagram-facebook", label: "Instagram or Facebook" },
  { value: "friend-past-customer", label: "Friend or past customer" },
  { value: "other", label: "Other" },
];

/**
 * The dropdown's own arrow, drawn 16px in from the right edge. A plain <select>
 * puts the browser's arrow flush against the border, which looks off on a wide
 * form (Michael, 2026-10-05).
 */
export const SELECT_ARROW_CLASS =
  "appearance-none pr-10 bg-no-repeat bg-[right_16px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b6b6b%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')]";

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
