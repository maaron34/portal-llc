/**
 * POST /.netlify/functions/gemini-photo-note — look at a lead's photos and write
 * a short, practical triage note (rough area / cubic yards / what's still needed
 * to quote) into leads.gemini_notes. NEVER prices — Chris owns every number; this
 * only helps him read the job faster. Called by the photo-ingest cron after it
 * attaches photos. Gated by the ops passcode.
 *
 * portal-llc holds both keys this needs: OPENROUTER_API_KEY (vision model) and
 * SUPABASE_SECRET_KEY (write the note).
 *
 * Body: { lead_id }   Returns: { note }
 */

const SUPABASE_URL = "https://tldsueyauxlctrywnfed.supabase.co";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "google/gemini-2.5-flash";
const MAX_PHOTOS = 4;

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function authorized(request: Request): boolean {
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const expected = process.env.OPS_PASSCODE;
  return Boolean(expected) && provided === expected;
}

const SYSTEM =
  "You help a concrete contractor triage a job from a customer's photos. In 1-3 " +
  "short sentences: give your rough read of the area (approximate dimensions or " +
  "square footage, and cubic yards of concrete if you can estimate it), the type " +
  "of work it looks like, and what's still needed to quote accurately (a key " +
  "measurement, site access, slope, etc). NEVER state a price or any dollar " +
  "amount. If the photos are unclear, say exactly what to ask the customer for. " +
  "Be concise and practical, like a note jotted between jobs.";

export default async (request: Request): Promise<Response> => {
  if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  const secret = process.env.SUPABASE_SECRET_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;
  if (!secret || !orKey) return json({ error: "Server config missing" }, 500);

  let body: { lead_id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.lead_id || !UUID.test(body.lead_id)) return json({ error: "Missing or invalid lead_id" }, 400);

  const headers = { apikey: secret, Authorization: `Bearer ${secret}` };
  const cur = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${body.lead_id}&select=photos`, { headers });
  if (!cur.ok) return json({ error: "Lead read failed" }, 502);
  const rows = (await cur.json()) as { photos?: string[] }[];
  if (!rows.length) return json({ error: "Lead not found" }, 404);
  const photos = Array.isArray(rows[0].photos) ? rows[0].photos.slice(0, MAX_PHOTOS) : [];
  if (!photos.length) return json({ note: null, reason: "no photos" }, 200);

  const content: unknown[] = [
    { type: "text", text: "Here are the customer's photos for this concrete job. Write the triage note." },
    ...photos.map((url) => ({ type: "image_url", image_url: { url } })),
  ];

  let note = "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${orKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        max_tokens: 250,
        temperature: 0.3,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return json({ error: "Vision model error", detail: (await res.text()).slice(0, 300) }, 502);
    const data = await res.json();
    note = (data?.choices?.[0]?.message?.content || "").toString().trim();
  } catch (err) {
    return json({ error: "Vision request failed", detail: String(err) }, 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!note) return json({ note: null, reason: "empty note" }, 200);

  await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${body.lead_id}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ gemini_notes: note }),
  });
  return json({ note }, 200);
};
