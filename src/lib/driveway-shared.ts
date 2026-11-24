/**
 * The few things the Concrete Generator's page and its server functions must
 * agree on. Plain constants only, so both sides can import this file.
 */

/** The product's name, everywhere it is shown or recorded. Change it here and nowhere else. */
export const PRODUCT_NAME = "Concrete Generator 2000";

/** The page's address. Not linked from the site, the sitemap or the nav. */
export const GENERATOR_PATH = "/concrete-generator";

/**
 * Is this a generator submission sent to a Netlify preview address? Those are
 * test leads: stored as junk, never emailed, never merged into a real lead.
 * The live site's own address never matches.
 */
export const isGeneratorTest = (source: unknown, host: string): boolean =>
  typeof source === "string" && source.startsWith(PRODUCT_NAME) && host.endsWith("--portalllc.netlify.app");

export const JOB_TYPES = ["Driveway", "Front steps", "Patio", "Walkway", "Retaining wall"] as const;
export type JobType = (typeof JOB_TYPES)[number];
export const isJobType = (v: unknown): v is JobType => typeof v === "string" && (JOB_TYPES as readonly string[]).includes(v);
