/**
 * Small Supabase helpers shared by the lead email, the one-tap pages and the
 * weekly digest. Every read and write uses the secret key (RLS has no policies,
 * so nothing else can read rows). The public project URL is safe to hardcode.
 */

export const SUPABASE_URL = "https://tldsueyauxlctrywnfed.supabase.co";
/** The ops dashboard's functions (correspondence-append lives there). */
export const OPS = "https://portal-ops-dashboard.netlify.app/.netlify/functions";
export const OPS_SITE = "https://portal-ops-dashboard.netlify.app";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CorrespondenceEntry = {
  id: string;
  type: "text" | "email" | "voicemail" | "call" | "note" | string;
  direction: "in" | "out";
  at: string;
  from?: string | null;
  to?: string | null;
  body: string;
  source?: string | null;
};

export type LeadRow = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  message: string | null;
  channel: string;
  stage: string;
  first_response_at: string | null;
  photos: string[];
  gemini_notes: string | null;
  correspondence: CorrespondenceEntry[];
  raw: Record<string, unknown>;
};

export const LEAD_SELECT =
  "id,created_at,name,email,phone,address,message,channel,stage,first_response_at,photos,gemini_notes,correspondence,raw";

export const auth = (secret: string) => ({ apikey: secret, Authorization: `Bearer ${secret}` });

/** Coerce the JSON columns to the shapes the code assumes (nulls become empties). */
export function normalizeLead(row: LeadRow): LeadRow {
  row.photos = Array.isArray(row.photos) ? row.photos : [];
  row.correspondence = Array.isArray(row.correspondence) ? row.correspondence : [];
  row.raw = row.raw && typeof row.raw === "object" ? row.raw : {};
  return row;
}

/** Display name for a lead: name, else formatted phone, else email, else the fallback. */
export function leadName(lead: Pick<LeadRow, "name" | "phone" | "email">, fallback = "this lead"): string {
  const name = (lead.name || "").replace(/[\r\n]/g, " ").trim();
  if (name) return name;
  const d = (lead.phone || "").replace(/\D/g, "");
  const ten = d.length === 10 ? d : d.length === 11 && d.startsWith("1") ? d.slice(1) : "";
  if (ten) return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
  return (lead.phone || "").trim() || (lead.email || "").trim() || fallback;
}

/** A string value out of `raw`, or "" when absent / not a string. */
export function rawStr(raw: Record<string, unknown> | null | undefined, key: string): string {
  const v = raw?.[key];
  return typeof v === "string" ? v : "";
}

export async function readLead(secret: string, id: string): Promise<LeadRow | null> {
  if (!UUID.test(id)) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}&select=${LEAD_SELECT}`, {
      headers: auth(secret),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as LeadRow[];
    const row = rows[0];
    return row ? normalizeLead(row) : null;
  } catch {
    return null;
  }
}

/** Patch real columns (never `raw` - use mergeRaw for that). */
export async function patchLead(secret: string, id: string, patch: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...auth(secret), "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Merge keys into `leads.raw` atomically through the merge_raw RPC
 * (portal-ops/supabase/raw-merge.sql). `onlyIfAbsent` keeps any key that is
 * already set, which is how an auto-generated draft never overwrites one Chris
 * saved by hand.
 *
 * Why an RPC: every other writer does a read-modify-write of the whole `raw`
 * object, and this function runs seconds after correspondence-append has
 * stamped raw.stage_at on the same row. A whole-object PATCH from here would
 * erase that stamp. If the RPC has not been created yet (404 from PostgREST),
 * fall back to the read-modify-write so nothing breaks before the SQL is run.
 */
export async function mergeRaw(
  secret: string,
  id: string,
  patch: Record<string, unknown>,
  onlyIfAbsent = false
): Promise<boolean> {
  try {
    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/merge_raw`, {
      method: "POST",
      headers: { ...auth(secret), "Content-Type": "application/json" },
      body: JSON.stringify({ p_lead_id: id, p_patch: patch, p_only_if_absent: onlyIfAbsent }),
    });
    if (rpc.ok) return true;
    if (rpc.status !== 404) {
      console.error("merge_raw failed:", rpc.status, (await rpc.text()).slice(0, 200));
      return false;
    }
    console.warn("merge_raw RPC missing; falling back to read-modify-write");
  } catch (err) {
    console.error("merge_raw threw:", err);
    return false;
  }
  try {
    const cur = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}&select=raw`, { headers: auth(secret) });
    if (!cur.ok) return false;
    const rows = (await cur.json()) as { raw?: Record<string, unknown> }[];
    const raw = rows[0]?.raw && typeof rows[0].raw === "object" ? rows[0].raw : {};
    const merged = onlyIfAbsent ? { ...patch, ...raw } : { ...raw, ...patch };
    return patchLead(secret, id, { raw: merged });
  } catch {
    return false;
  }
}

/**
 * Append timeline entries through the ops dashboard's correspondence-append,
 * which owns the id-dedupe RPC and the new -> contacted stage advance. Same
 * pattern quo-webhook uses. Passcode from OPS_PASSCODE.
 */
export async function appendCorrespondence(
  leadId: string,
  entries: CorrespondenceEntry[]
): Promise<{ ok: boolean; advanced?: boolean }> {
  const passcode = process.env.OPS_PASSCODE || "";
  if (!passcode) return { ok: false };
  try {
    const res = await fetch(`${OPS}/correspondence-append`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${passcode}` },
      body: JSON.stringify({ lead_id: leadId, entries }),
    });
    if (!res.ok) {
      console.error("correspondence-append failed:", res.status, (await res.text()).slice(0, 200));
      return { ok: false };
    }
    const data = (await res.json()) as { advanced?: boolean };
    return { ok: true, advanced: Boolean(data.advanced) };
  } catch (err) {
    console.error("correspondence-append threw:", err);
    return { ok: false };
  }
}
