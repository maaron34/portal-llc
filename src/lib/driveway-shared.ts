/**
 * The few things the Driveway Generator's page and its server functions must
 * agree on. Plain constants only, so both sides can import this file.
 */

/** The product's name, everywhere it is shown or recorded. Change it here and nowhere else. */
export const PRODUCT_NAME = "Driveway Generator 2000";

/** The page's address. Not linked from the site, the sitemap or the nav. */
export const GENERATOR_PATH = "/driveway-generator";

export const JOB_TYPES = ["Driveway", "Front steps", "Patio", "Walkway", "Retaining wall"] as const;
export type JobType = (typeof JOB_TYPES)[number];
export const isJobType = (v: unknown): v is JobType => typeof v === "string" && (JOB_TYPES as readonly string[]).includes(v);
