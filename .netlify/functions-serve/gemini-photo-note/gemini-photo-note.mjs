
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// ../../../netlify/functions/gemini-photo-note.ts
var SUPABASE_URL = "https://tldsueyauxlctrywnfed.supabase.co";
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var GEMINI_MODEL = process.env.GEMINI_MODEL || "google/gemini-2.5-flash";
var MAX_PHOTOS = 4;
var json = (body, status) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function authorized(request) {
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const expected = process.env.OPS_PASSCODE;
  return Boolean(expected) && provided === expected;
}
var SYSTEM = "You help a concrete contractor triage a job from a customer's photos. In 1-3 short sentences: give your rough read of the area (approximate dimensions or square footage, and cubic yards of concrete if you can estimate it), the type of work it looks like, and what's still needed to quote accurately (a key measurement, site access, slope, etc). NEVER state a price or any dollar amount. If the photos are unclear, say exactly what to ask the customer for. Be concise and practical, like a note jotted between jobs.";
var gemini_photo_note_default = async (request) => {
  if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  const secret = process.env.SUPABASE_SECRET_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;
  if (!secret || !orKey) return json({ error: "Server config missing" }, 500);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.lead_id || !UUID.test(body.lead_id)) return json({ error: "Missing or invalid lead_id" }, 400);
  const headers = { apikey: secret, Authorization: `Bearer ${secret}` };
  const cur = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${body.lead_id}&select=photos`, { headers });
  if (!cur.ok) return json({ error: "Lead read failed" }, 502);
  const rows = await cur.json();
  if (!rows.length) return json({ error: "Lead not found" }, 404);
  const photos = Array.isArray(rows[0].photos) ? rows[0].photos.slice(0, MAX_PHOTOS) : [];
  if (!photos.length) return json({ note: null, reason: "no photos" }, 200);
  const content = [
    { type: "text", text: "Here are the customer's photos for this concrete job. Write the triage note." },
    ...photos.map((url) => ({ type: "image_url", image_url: { url } }))
  ];
  let note = "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25e3);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${orKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        max_tokens: 250,
        temperature: 0.3,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content }]
      }),
      signal: controller.signal
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
    body: JSON.stringify({ gemini_notes: note })
  });
  return json({ note }, 200);
};
export {
  gemini_photo_note_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vbmV0bGlmeS9mdW5jdGlvbnMvZ2VtaW5pLXBob3RvLW5vdGUudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogUE9TVCAvLm5ldGxpZnkvZnVuY3Rpb25zL2dlbWluaS1waG90by1ub3RlIFx1MjAxNCBsb29rIGF0IGEgbGVhZCdzIHBob3RvcyBhbmQgd3JpdGVcbiAqIGEgc2hvcnQsIHByYWN0aWNhbCB0cmlhZ2Ugbm90ZSAocm91Z2ggYXJlYSAvIGN1YmljIHlhcmRzIC8gd2hhdCdzIHN0aWxsIG5lZWRlZFxuICogdG8gcXVvdGUpIGludG8gbGVhZHMuZ2VtaW5pX25vdGVzLiBORVZFUiBwcmljZXMgXHUyMDE0IENocmlzIG93bnMgZXZlcnkgbnVtYmVyOyB0aGlzXG4gKiBvbmx5IGhlbHBzIGhpbSByZWFkIHRoZSBqb2IgZmFzdGVyLiBDYWxsZWQgYnkgdGhlIHBob3RvLWluZ2VzdCBjcm9uIGFmdGVyIGl0XG4gKiBhdHRhY2hlcyBwaG90b3MuIEdhdGVkIGJ5IHRoZSBvcHMgcGFzc2NvZGUuXG4gKlxuICogcG9ydGFsLWxsYyBob2xkcyBib3RoIGtleXMgdGhpcyBuZWVkczogT1BFTlJPVVRFUl9BUElfS0VZICh2aXNpb24gbW9kZWwpIGFuZFxuICogU1VQQUJBU0VfU0VDUkVUX0tFWSAod3JpdGUgdGhlIG5vdGUpLlxuICpcbiAqIEJvZHk6IHsgbGVhZF9pZCB9ICAgUmV0dXJuczogeyBub3RlIH1cbiAqL1xuXG5jb25zdCBTVVBBQkFTRV9VUkwgPSBcImh0dHBzOi8vdGxkc3VleWF1eGxjdHJ5d25mZWQuc3VwYWJhc2UuY29cIjtcbmNvbnN0IFVVSUQgPSAvXlswLTlhLWZdezh9LVswLTlhLWZdezR9LVswLTlhLWZdezR9LVswLTlhLWZdezR9LVswLTlhLWZdezEyfSQvaTtcbmNvbnN0IEdFTUlOSV9NT0RFTCA9IHByb2Nlc3MuZW52LkdFTUlOSV9NT0RFTCB8fCBcImdvb2dsZS9nZW1pbmktMi41LWZsYXNoXCI7XG5jb25zdCBNQVhfUEhPVE9TID0gNDtcblxuY29uc3QganNvbiA9IChib2R5OiB1bmtub3duLCBzdGF0dXM6IG51bWJlcik6IFJlc3BvbnNlID0+XG4gIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeShib2R5KSwgeyBzdGF0dXMsIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSB9KTtcblxuZnVuY3Rpb24gYXV0aG9yaXplZChyZXF1ZXN0OiBSZXF1ZXN0KTogYm9vbGVhbiB7XG4gIGNvbnN0IHByb3ZpZGVkID0gKHJlcXVlc3QuaGVhZGVycy5nZXQoXCJhdXRob3JpemF0aW9uXCIpIHx8IFwiXCIpLnJlcGxhY2UoL15CZWFyZXJcXHMrL2ksIFwiXCIpO1xuICBjb25zdCBleHBlY3RlZCA9IHByb2Nlc3MuZW52Lk9QU19QQVNTQ09ERTtcbiAgcmV0dXJuIEJvb2xlYW4oZXhwZWN0ZWQpICYmIHByb3ZpZGVkID09PSBleHBlY3RlZDtcbn1cblxuY29uc3QgU1lTVEVNID1cbiAgXCJZb3UgaGVscCBhIGNvbmNyZXRlIGNvbnRyYWN0b3IgdHJpYWdlIGEgam9iIGZyb20gYSBjdXN0b21lcidzIHBob3Rvcy4gSW4gMS0zIFwiICtcbiAgXCJzaG9ydCBzZW50ZW5jZXM6IGdpdmUgeW91ciByb3VnaCByZWFkIG9mIHRoZSBhcmVhIChhcHByb3hpbWF0ZSBkaW1lbnNpb25zIG9yIFwiICtcbiAgXCJzcXVhcmUgZm9vdGFnZSwgYW5kIGN1YmljIHlhcmRzIG9mIGNvbmNyZXRlIGlmIHlvdSBjYW4gZXN0aW1hdGUgaXQpLCB0aGUgdHlwZSBcIiArXG4gIFwib2Ygd29yayBpdCBsb29rcyBsaWtlLCBhbmQgd2hhdCdzIHN0aWxsIG5lZWRlZCB0byBxdW90ZSBhY2N1cmF0ZWx5IChhIGtleSBcIiArXG4gIFwibWVhc3VyZW1lbnQsIHNpdGUgYWNjZXNzLCBzbG9wZSwgZXRjKS4gTkVWRVIgc3RhdGUgYSBwcmljZSBvciBhbnkgZG9sbGFyIFwiICtcbiAgXCJhbW91bnQuIElmIHRoZSBwaG90b3MgYXJlIHVuY2xlYXIsIHNheSBleGFjdGx5IHdoYXQgdG8gYXNrIHRoZSBjdXN0b21lciBmb3IuIFwiICtcbiAgXCJCZSBjb25jaXNlIGFuZCBwcmFjdGljYWwsIGxpa2UgYSBub3RlIGpvdHRlZCBiZXR3ZWVuIGpvYnMuXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIChyZXF1ZXN0OiBSZXF1ZXN0KTogUHJvbWlzZTxSZXNwb25zZT4gPT4ge1xuICBpZiAoIWF1dGhvcml6ZWQocmVxdWVzdCkpIHJldHVybiBqc29uKHsgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfSwgNDAxKTtcbiAgaWYgKHJlcXVlc3QubWV0aG9kICE9PSBcIlBPU1RcIikgcmV0dXJuIGpzb24oeyBlcnJvcjogXCJQT1NUIG9ubHlcIiB9LCA0MDUpO1xuXG4gIGNvbnN0IHNlY3JldCA9IHByb2Nlc3MuZW52LlNVUEFCQVNFX1NFQ1JFVF9LRVk7XG4gIGNvbnN0IG9yS2V5ID0gcHJvY2Vzcy5lbnYuT1BFTlJPVVRFUl9BUElfS0VZO1xuICBpZiAoIXNlY3JldCB8fCAhb3JLZXkpIHJldHVybiBqc29uKHsgZXJyb3I6IFwiU2VydmVyIGNvbmZpZyBtaXNzaW5nXCIgfSwgNTAwKTtcblxuICBsZXQgYm9keTogeyBsZWFkX2lkPzogc3RyaW5nIH07XG4gIHRyeSB7XG4gICAgYm9keSA9IGF3YWl0IHJlcXVlc3QuanNvbigpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4ganNvbih7IGVycm9yOiBcIkludmFsaWQgSlNPTlwiIH0sIDQwMCk7XG4gIH1cbiAgaWYgKCFib2R5LmxlYWRfaWQgfHwgIVVVSUQudGVzdChib2R5LmxlYWRfaWQpKSByZXR1cm4ganNvbih7IGVycm9yOiBcIk1pc3Npbmcgb3IgaW52YWxpZCBsZWFkX2lkXCIgfSwgNDAwKTtcblxuICBjb25zdCBoZWFkZXJzID0geyBhcGlrZXk6IHNlY3JldCwgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3NlY3JldH1gIH07XG4gIGNvbnN0IGN1ciA9IGF3YWl0IGZldGNoKGAke1NVUEFCQVNFX1VSTH0vcmVzdC92MS9sZWFkcz9pZD1lcS4ke2JvZHkubGVhZF9pZH0mc2VsZWN0PXBob3Rvc2AsIHsgaGVhZGVycyB9KTtcbiAgaWYgKCFjdXIub2spIHJldHVybiBqc29uKHsgZXJyb3I6IFwiTGVhZCByZWFkIGZhaWxlZFwiIH0sIDUwMik7XG4gIGNvbnN0IHJvd3MgPSAoYXdhaXQgY3VyLmpzb24oKSkgYXMgeyBwaG90b3M/OiBzdHJpbmdbXSB9W107XG4gIGlmICghcm93cy5sZW5ndGgpIHJldHVybiBqc29uKHsgZXJyb3I6IFwiTGVhZCBub3QgZm91bmRcIiB9LCA0MDQpO1xuICBjb25zdCBwaG90b3MgPSBBcnJheS5pc0FycmF5KHJvd3NbMF0ucGhvdG9zKSA/IHJvd3NbMF0ucGhvdG9zLnNsaWNlKDAsIE1BWF9QSE9UT1MpIDogW107XG4gIGlmICghcGhvdG9zLmxlbmd0aCkgcmV0dXJuIGpzb24oeyBub3RlOiBudWxsLCByZWFzb246IFwibm8gcGhvdG9zXCIgfSwgMjAwKTtcblxuICBjb25zdCBjb250ZW50OiB1bmtub3duW10gPSBbXG4gICAgeyB0eXBlOiBcInRleHRcIiwgdGV4dDogXCJIZXJlIGFyZSB0aGUgY3VzdG9tZXIncyBwaG90b3MgZm9yIHRoaXMgY29uY3JldGUgam9iLiBXcml0ZSB0aGUgdHJpYWdlIG5vdGUuXCIgfSxcbiAgICAuLi5waG90b3MubWFwKCh1cmwpID0+ICh7IHR5cGU6IFwiaW1hZ2VfdXJsXCIsIGltYWdlX3VybDogeyB1cmwgfSB9KSksXG4gIF07XG5cbiAgbGV0IG5vdGUgPSBcIlwiO1xuICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIDI1MDAwKTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChcImh0dHBzOi8vb3BlbnJvdXRlci5haS9hcGkvdjEvY2hhdC9jb21wbGV0aW9uc1wiLCB7XG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7b3JLZXl9YCwgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbW9kZWw6IEdFTUlOSV9NT0RFTCxcbiAgICAgICAgbWF4X3Rva2VuczogMjUwLFxuICAgICAgICB0ZW1wZXJhdHVyZTogMC4zLFxuICAgICAgICBtZXNzYWdlczogW3sgcm9sZTogXCJzeXN0ZW1cIiwgY29udGVudDogU1lTVEVNIH0sIHsgcm9sZTogXCJ1c2VyXCIsIGNvbnRlbnQgfV0sXG4gICAgICB9KSxcbiAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXG4gICAgfSk7XG4gICAgaWYgKCFyZXMub2spIHJldHVybiBqc29uKHsgZXJyb3I6IFwiVmlzaW9uIG1vZGVsIGVycm9yXCIsIGRldGFpbDogKGF3YWl0IHJlcy50ZXh0KCkpLnNsaWNlKDAsIDMwMCkgfSwgNTAyKTtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICBub3RlID0gKGRhdGE/LmNob2ljZXM/LlswXT8ubWVzc2FnZT8uY29udGVudCB8fCBcIlwiKS50b1N0cmluZygpLnRyaW0oKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIGpzb24oeyBlcnJvcjogXCJWaXNpb24gcmVxdWVzdCBmYWlsZWRcIiwgZGV0YWlsOiBTdHJpbmcoZXJyKSB9LCA1MDIpO1xuICB9IGZpbmFsbHkge1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgfVxuXG4gIGlmICghbm90ZSkgcmV0dXJuIGpzb24oeyBub3RlOiBudWxsLCByZWFzb246IFwiZW1wdHkgbm90ZVwiIH0sIDIwMCk7XG5cbiAgYXdhaXQgZmV0Y2goYCR7U1VQQUJBU0VfVVJMfS9yZXN0L3YxL2xlYWRzP2lkPWVxLiR7Ym9keS5sZWFkX2lkfWAsIHtcbiAgICBtZXRob2Q6IFwiUEFUQ0hcIixcbiAgICBoZWFkZXJzOiB7IC4uLmhlYWRlcnMsIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBnZW1pbmlfbm90ZXM6IG5vdGUgfSksXG4gIH0pO1xuICByZXR1cm4ganNvbih7IG5vdGUgfSwgMjAwKTtcbn07XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0FBYUEsSUFBTSxlQUFlO0FBQ3JCLElBQU0sT0FBTztBQUNiLElBQU0sZUFBZSxRQUFRLElBQUksZ0JBQWdCO0FBQ2pELElBQU0sYUFBYTtBQUVuQixJQUFNLE9BQU8sQ0FBQyxNQUFlLFdBQzNCLElBQUksU0FBUyxLQUFLLFVBQVUsSUFBSSxHQUFHLEVBQUUsUUFBUSxTQUFTLEVBQUUsZ0JBQWdCLG1CQUFtQixFQUFFLENBQUM7QUFFaEcsU0FBUyxXQUFXLFNBQTJCO0FBQzdDLFFBQU0sWUFBWSxRQUFRLFFBQVEsSUFBSSxlQUFlLEtBQUssSUFBSSxRQUFRLGVBQWUsRUFBRTtBQUN2RixRQUFNLFdBQVcsUUFBUSxJQUFJO0FBQzdCLFNBQU8sUUFBUSxRQUFRLEtBQUssYUFBYTtBQUMzQztBQUVBLElBQU0sU0FDSjtBQVFGLElBQU8sNEJBQVEsT0FBTyxZQUF3QztBQUM1RCxNQUFJLENBQUMsV0FBVyxPQUFPLEVBQUcsUUFBTyxLQUFLLEVBQUUsT0FBTyxlQUFlLEdBQUcsR0FBRztBQUNwRSxNQUFJLFFBQVEsV0FBVyxPQUFRLFFBQU8sS0FBSyxFQUFFLE9BQU8sWUFBWSxHQUFHLEdBQUc7QUFFdEUsUUFBTSxTQUFTLFFBQVEsSUFBSTtBQUMzQixRQUFNLFFBQVEsUUFBUSxJQUFJO0FBQzFCLE1BQUksQ0FBQyxVQUFVLENBQUMsTUFBTyxRQUFPLEtBQUssRUFBRSxPQUFPLHdCQUF3QixHQUFHLEdBQUc7QUFFMUUsTUFBSTtBQUNKLE1BQUk7QUFDRixXQUFPLE1BQU0sUUFBUSxLQUFLO0FBQUEsRUFDNUIsUUFBUTtBQUNOLFdBQU8sS0FBSyxFQUFFLE9BQU8sZUFBZSxHQUFHLEdBQUc7QUFBQSxFQUM1QztBQUNBLE1BQUksQ0FBQyxLQUFLLFdBQVcsQ0FBQyxLQUFLLEtBQUssS0FBSyxPQUFPLEVBQUcsUUFBTyxLQUFLLEVBQUUsT0FBTyw2QkFBNkIsR0FBRyxHQUFHO0FBRXZHLFFBQU0sVUFBVSxFQUFFLFFBQVEsUUFBUSxlQUFlLFVBQVUsTUFBTSxHQUFHO0FBQ3BFLFFBQU0sTUFBTSxNQUFNLE1BQU0sR0FBRyxZQUFZLHdCQUF3QixLQUFLLE9BQU8sa0JBQWtCLEVBQUUsUUFBUSxDQUFDO0FBQ3hHLE1BQUksQ0FBQyxJQUFJLEdBQUksUUFBTyxLQUFLLEVBQUUsT0FBTyxtQkFBbUIsR0FBRyxHQUFHO0FBQzNELFFBQU0sT0FBUSxNQUFNLElBQUksS0FBSztBQUM3QixNQUFJLENBQUMsS0FBSyxPQUFRLFFBQU8sS0FBSyxFQUFFLE9BQU8saUJBQWlCLEdBQUcsR0FBRztBQUM5RCxRQUFNLFNBQVMsTUFBTSxRQUFRLEtBQUssQ0FBQyxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsRUFBRSxPQUFPLE1BQU0sR0FBRyxVQUFVLElBQUksQ0FBQztBQUN0RixNQUFJLENBQUMsT0FBTyxPQUFRLFFBQU8sS0FBSyxFQUFFLE1BQU0sTUFBTSxRQUFRLFlBQVksR0FBRyxHQUFHO0FBRXhFLFFBQU0sVUFBcUI7QUFBQSxJQUN6QixFQUFFLE1BQU0sUUFBUSxNQUFNLCtFQUErRTtBQUFBLElBQ3JHLEdBQUcsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLE1BQU0sYUFBYSxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUU7QUFBQSxFQUNwRTtBQUVBLE1BQUksT0FBTztBQUNYLFFBQU0sYUFBYSxJQUFJLGdCQUFnQjtBQUN2QyxRQUFNLFVBQVUsV0FBVyxNQUFNLFdBQVcsTUFBTSxHQUFHLElBQUs7QUFDMUQsTUFBSTtBQUNGLFVBQU0sTUFBTSxNQUFNLE1BQU0saURBQWlEO0FBQUEsTUFDdkUsUUFBUTtBQUFBLE1BQ1IsU0FBUyxFQUFFLGVBQWUsVUFBVSxLQUFLLElBQUksZ0JBQWdCLG1CQUFtQjtBQUFBLE1BQ2hGLE1BQU0sS0FBSyxVQUFVO0FBQUEsUUFDbkIsT0FBTztBQUFBLFFBQ1AsWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsVUFBVSxDQUFDLEVBQUUsTUFBTSxVQUFVLFNBQVMsT0FBTyxHQUFHLEVBQUUsTUFBTSxRQUFRLFFBQVEsQ0FBQztBQUFBLE1BQzNFLENBQUM7QUFBQSxNQUNELFFBQVEsV0FBVztBQUFBLElBQ3JCLENBQUM7QUFDRCxRQUFJLENBQUMsSUFBSSxHQUFJLFFBQU8sS0FBSyxFQUFFLE9BQU8sc0JBQXNCLFNBQVMsTUFBTSxJQUFJLEtBQUssR0FBRyxNQUFNLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRztBQUN2RyxVQUFNLE9BQU8sTUFBTSxJQUFJLEtBQUs7QUFDNUIsWUFBUSxNQUFNLFVBQVUsQ0FBQyxHQUFHLFNBQVMsV0FBVyxJQUFJLFNBQVMsRUFBRSxLQUFLO0FBQUEsRUFDdEUsU0FBUyxLQUFLO0FBQ1osV0FBTyxLQUFLLEVBQUUsT0FBTyx5QkFBeUIsUUFBUSxPQUFPLEdBQUcsRUFBRSxHQUFHLEdBQUc7QUFBQSxFQUMxRSxVQUFFO0FBQ0EsaUJBQWEsT0FBTztBQUFBLEVBQ3RCO0FBRUEsTUFBSSxDQUFDLEtBQU0sUUFBTyxLQUFLLEVBQUUsTUFBTSxNQUFNLFFBQVEsYUFBYSxHQUFHLEdBQUc7QUFFaEUsUUFBTSxNQUFNLEdBQUcsWUFBWSx3QkFBd0IsS0FBSyxPQUFPLElBQUk7QUFBQSxJQUNqRSxRQUFRO0FBQUEsSUFDUixTQUFTLEVBQUUsR0FBRyxTQUFTLGdCQUFnQixtQkFBbUI7QUFBQSxJQUMxRCxNQUFNLEtBQUssVUFBVSxFQUFFLGNBQWMsS0FBSyxDQUFDO0FBQUEsRUFDN0MsQ0FBQztBQUNELFNBQU8sS0FBSyxFQUFFLEtBQUssR0FBRyxHQUFHO0FBQzNCOyIsCiAgIm5hbWVzIjogW10KfQo=
