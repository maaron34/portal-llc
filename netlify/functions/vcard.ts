/**
 * Netlify Function: return a vCard (.vcf) for a lead so Chris can one-tap add
 * them to his iPhone Contacts. Linked from the lead email by lead ID (so no
 * personal data sits in the URL). Reads the lead from Supabase with the secret
 * key (bypasses RLS). The lead ID is an unguessable UUID, which gates access.
 *
 * GET /.netlify/functions/vcard?id=<uuid>  ->  text/vcard download.
 */

const SUPABASE_URL = "https://tldsueyauxlctrywnfed.supabase.co";

type LeadContact = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

// Escape per the vCard 3.0 spec (backslash, comma, semicolon, newline).
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export default async (request: Request): Promise<Response> => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    console.error("SUPABASE_SECRET_KEY env var is missing");
    return new Response("Server config missing", { status: 500 });
  }

  const id = new URL(request.url).searchParams.get("id");
  // Basic UUID shape check so we don't forward junk to the DB.
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new Response("Missing or invalid id", { status: 400 });
  }

  let lead: LeadContact | null = null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${id}&select=name,email,phone,address`,
      { headers: { apikey: secret, Authorization: `Bearer ${secret}` } }
    );
    if (!res.ok) {
      console.error("Supabase vcard lookup failed:", res.status, await res.text());
      return new Response("Lookup failed", { status: 502 });
    }
    const rows = (await res.json()) as LeadContact[];
    lead = Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (err) {
    console.error("Supabase vcard fetch threw:", err);
    return new Response("Lookup error", { status: 502 });
  }

  if (!lead) return new Response("Lead not found", { status: 404 });

  const name = (lead.name || "Portal Lead").trim();
  const vcf =
    [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${esc(name)}`,
      lead.phone ? `TEL;TYPE=CELL:${esc(lead.phone.trim())}` : "",
      lead.email ? `EMAIL;TYPE=INTERNET:${esc(lead.email.trim())}` : "",
      lead.address ? `ADR;TYPE=HOME:;;${esc(lead.address.trim())};;;;` : "",
      "NOTE:Portal lead",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\r\n") + "\r\n";

  const filename = (name.replace(/[^a-z0-9]+/gi, "_") || "lead") + ".vcf";
  return new Response(vcf, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
};
