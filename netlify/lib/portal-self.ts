/**
 * Who Portal is, so the CRM never mistakes Chris for a customer.
 *
 * On 2026-11-02 Brian Collins wrote to Chris's personal Gmail
 * (chrisfromportal@gmail.com), the message reached the CRM from that address,
 * and it became a new lead named "Chris Hildebrand". Brian's real lead, which
 * held both of Chris's replies, sat beside it, so the CRM said Chris had not
 * answered. Every check that asks "is this the customer?" should first ask
 * "is this Portal?", and this file is the one list.
 *
 * The same list lives in the Python email reader (portal-photo-ingest.py on
 * reggie-macbook, PORTAL_SELF_EMAILS). Change both together.
 */

import { digits10 } from "./lead-links";

/** Every address Chris or Portal sends from, plus the bots that relay Portal mail. */
export const PORTAL_EMAILS = [
  "chrisfromportal@gmail.com",
  "jchrishildebrand@gmail.com",
  "reggie.ministation@gmail.com",
];
export const PORTAL_DOMAIN = "buildwithportal.com";

/** Chris's cell and Portal's business line (QUO). */
export const PORTAL_PHONES = ["2064193880", "2068296396"];

/** Names that mean Chris or the business, never a customer. */
const PORTAL_NAMES = [
  "chris hildebrand",
  "j chris hildebrand",
  "chris",
  "portal",
  "portal llc",
  "portal concrete",
  "portal seattle concrete",
  "portal leads",
];

export function isPortalEmail(email: string | null | undefined): boolean {
  const e = (email || "").trim().toLowerCase();
  if (!e) return false;
  return e.endsWith("@" + PORTAL_DOMAIN) || PORTAL_EMAILS.includes(e);
}

export function isPortalPhone(phone: string | null | undefined): boolean {
  const d = digits10(phone);
  return Boolean(d) && PORTAL_PHONES.includes(d);
}

export function isPortalName(name: string | null | undefined): boolean {
  const n = (name || "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (!n) return false;
  return PORTAL_NAMES.includes(n) || /\bhildebrand\b/.test(n);
}

/** True when a lead row is really Chris or Portal itself. */
export function isPortalLead(lead: { name?: string | null; email?: string | null; phone?: string | null }): boolean {
  return isPortalEmail(lead.email) || isPortalPhone(lead.phone) || isPortalName(lead.name);
}
