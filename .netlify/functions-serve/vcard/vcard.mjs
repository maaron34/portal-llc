
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// ../../../netlify/functions/vcard.ts
var SUPABASE_URL = "https://tldsueyauxlctrywnfed.supabase.co";
function esc(value) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
var vcard_default = async (request) => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    console.error("SUPABASE_SECRET_KEY env var is missing");
    return new Response("Server config missing", { status: 500 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new Response("Missing or invalid id", { status: 400 });
  }
  let lead = null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${id}&select=name,email,phone,address`,
      { headers: { apikey: secret, Authorization: `Bearer ${secret}` } }
    );
    if (!res.ok) {
      console.error("Supabase vcard lookup failed:", res.status, await res.text());
      return new Response("Lookup failed", { status: 502 });
    }
    const rows = await res.json();
    lead = Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (err) {
    console.error("Supabase vcard fetch threw:", err);
    return new Response("Lookup error", { status: 502 });
  }
  if (!lead) return new Response("Lead not found", { status: 404 });
  const name = (lead.name || "Portal Lead").trim();
  const vcf = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(name)}`,
    lead.phone ? `TEL;TYPE=CELL:${esc(lead.phone.trim())}` : "",
    lead.email ? `EMAIL;TYPE=INTERNET:${esc(lead.email.trim())}` : "",
    lead.address ? `ADR;TYPE=HOME:;;${esc(lead.address.trim())};;;;` : "",
    "NOTE:Portal lead",
    "END:VCARD"
  ].filter(Boolean).join("\r\n") + "\r\n";
  const filename = (name.replace(/[^a-z0-9]+/gi, "_") || "lead") + ".vcf";
  return new Response(vcf, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
};
export {
  vcard_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vbmV0bGlmeS9mdW5jdGlvbnMvdmNhcmQudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogTmV0bGlmeSBGdW5jdGlvbjogcmV0dXJuIGEgdkNhcmQgKC52Y2YpIGZvciBhIGxlYWQgc28gQ2hyaXMgY2FuIG9uZS10YXAgYWRkXG4gKiB0aGVtIHRvIGhpcyBpUGhvbmUgQ29udGFjdHMuIExpbmtlZCBmcm9tIHRoZSBkcmFmdCBlbWFpbCBieSBsZWFkIElEIChzbyBub1xuICogcGVyc29uYWwgZGF0YSBzaXRzIGluIHRoZSBVUkwpLiBSZWFkcyB0aGUgbGVhZCBmcm9tIFN1cGFiYXNlIHdpdGggdGhlIHNlY3JldFxuICoga2V5IChieXBhc3NlcyBSTFMpLiBUaGUgbGVhZCBJRCBpcyBhbiB1bmd1ZXNzYWJsZSBVVUlELCB3aGljaCBnYXRlcyBhY2Nlc3MuXG4gKlxuICogR0VUIC8ubmV0bGlmeS9mdW5jdGlvbnMvdmNhcmQ/aWQ9PHV1aWQ+ICAtPiAgdGV4dC92Y2FyZCBkb3dubG9hZC5cbiAqL1xuXG5jb25zdCBTVVBBQkFTRV9VUkwgPSBcImh0dHBzOi8vdGxkc3VleWF1eGxjdHJ5d25mZWQuc3VwYWJhc2UuY29cIjtcblxudHlwZSBMZWFkQ29udGFjdCA9IHtcbiAgbmFtZT86IHN0cmluZyB8IG51bGw7XG4gIGVtYWlsPzogc3RyaW5nIHwgbnVsbDtcbiAgcGhvbmU/OiBzdHJpbmcgfCBudWxsO1xuICBhZGRyZXNzPzogc3RyaW5nIHwgbnVsbDtcbn07XG5cbi8vIEVzY2FwZSBwZXIgdGhlIHZDYXJkIDMuMCBzcGVjIChiYWNrc2xhc2gsIGNvbW1hLCBzZW1pY29sb24sIG5ld2xpbmUpLlxuZnVuY3Rpb24gZXNjKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWVcbiAgICAucmVwbGFjZSgvXFxcXC9nLCBcIlxcXFxcXFxcXCIpXG4gICAgLnJlcGxhY2UoLzsvZywgXCJcXFxcO1wiKVxuICAgIC5yZXBsYWNlKC8sL2csIFwiXFxcXCxcIilcbiAgICAucmVwbGFjZSgvXFxyP1xcbi9nLCBcIlxcXFxuXCIpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyAocmVxdWVzdDogUmVxdWVzdCk6IFByb21pc2U8UmVzcG9uc2U+ID0+IHtcbiAgY29uc3Qgc2VjcmV0ID0gcHJvY2Vzcy5lbnYuU1VQQUJBU0VfU0VDUkVUX0tFWTtcbiAgaWYgKCFzZWNyZXQpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiU1VQQUJBU0VfU0VDUkVUX0tFWSBlbnYgdmFyIGlzIG1pc3NpbmdcIik7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIlNlcnZlciBjb25maWcgbWlzc2luZ1wiLCB7IHN0YXR1czogNTAwIH0pO1xuICB9XG5cbiAgY29uc3QgaWQgPSBuZXcgVVJMKHJlcXVlc3QudXJsKS5zZWFyY2hQYXJhbXMuZ2V0KFwiaWRcIik7XG4gIC8vIEJhc2ljIFVVSUQgc2hhcGUgY2hlY2sgc28gd2UgZG9uJ3QgZm9yd2FyZCBqdW5rIHRvIHRoZSBEQi5cbiAgaWYgKCFpZCB8fCAhL15bMC05YS1mXXs4fS1bMC05YS1mXXs0fS1bMC05YS1mXXs0fS1bMC05YS1mXXs0fS1bMC05YS1mXXsxMn0kL2kudGVzdChpZCkpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiTWlzc2luZyBvciBpbnZhbGlkIGlkXCIsIHsgc3RhdHVzOiA0MDAgfSk7XG4gIH1cblxuICBsZXQgbGVhZDogTGVhZENvbnRhY3QgfCBudWxsID0gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChcbiAgICAgIGAke1NVUEFCQVNFX1VSTH0vcmVzdC92MS9sZWFkcz9pZD1lcS4ke2lkfSZzZWxlY3Q9bmFtZSxlbWFpbCxwaG9uZSxhZGRyZXNzYCxcbiAgICAgIHsgaGVhZGVyczogeyBhcGlrZXk6IHNlY3JldCwgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3NlY3JldH1gIH0gfVxuICAgICk7XG4gICAgaWYgKCFyZXMub2spIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJTdXBhYmFzZSB2Y2FyZCBsb29rdXAgZmFpbGVkOlwiLCByZXMuc3RhdHVzLCBhd2FpdCByZXMudGV4dCgpKTtcbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJMb29rdXAgZmFpbGVkXCIsIHsgc3RhdHVzOiA1MDIgfSk7XG4gICAgfVxuICAgIGNvbnN0IHJvd3MgPSAoYXdhaXQgcmVzLmpzb24oKSkgYXMgTGVhZENvbnRhY3RbXTtcbiAgICBsZWFkID0gQXJyYXkuaXNBcnJheShyb3dzKSAmJiByb3dzLmxlbmd0aCA/IHJvd3NbMF0gOiBudWxsO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiU3VwYWJhc2UgdmNhcmQgZmV0Y2ggdGhyZXc6XCIsIGVycik7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIkxvb2t1cCBlcnJvclwiLCB7IHN0YXR1czogNTAyIH0pO1xuICB9XG5cbiAgaWYgKCFsZWFkKSByZXR1cm4gbmV3IFJlc3BvbnNlKFwiTGVhZCBub3QgZm91bmRcIiwgeyBzdGF0dXM6IDQwNCB9KTtcblxuICBjb25zdCBuYW1lID0gKGxlYWQubmFtZSB8fCBcIlBvcnRhbCBMZWFkXCIpLnRyaW0oKTtcbiAgY29uc3QgdmNmID1cbiAgICBbXG4gICAgICBcIkJFR0lOOlZDQVJEXCIsXG4gICAgICBcIlZFUlNJT046My4wXCIsXG4gICAgICBgRk46JHtlc2MobmFtZSl9YCxcbiAgICAgIGxlYWQucGhvbmUgPyBgVEVMO1RZUEU9Q0VMTDoke2VzYyhsZWFkLnBob25lLnRyaW0oKSl9YCA6IFwiXCIsXG4gICAgICBsZWFkLmVtYWlsID8gYEVNQUlMO1RZUEU9SU5URVJORVQ6JHtlc2MobGVhZC5lbWFpbC50cmltKCkpfWAgOiBcIlwiLFxuICAgICAgbGVhZC5hZGRyZXNzID8gYEFEUjtUWVBFPUhPTUU6Ozske2VzYyhsZWFkLmFkZHJlc3MudHJpbSgpKX07Ozs7YCA6IFwiXCIsXG4gICAgICBcIk5PVEU6UG9ydGFsIGxlYWRcIixcbiAgICAgIFwiRU5EOlZDQVJEXCIsXG4gICAgXVxuICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgLmpvaW4oXCJcXHJcXG5cIikgKyBcIlxcclxcblwiO1xuXG4gIGNvbnN0IGZpbGVuYW1lID0gKG5hbWUucmVwbGFjZSgvW15hLXowLTldKy9naSwgXCJfXCIpIHx8IFwibGVhZFwiKSArIFwiLnZjZlwiO1xuICByZXR1cm4gbmV3IFJlc3BvbnNlKHZjZiwge1xuICAgIHN0YXR1czogMjAwLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwidGV4dC92Y2FyZDsgY2hhcnNldD11dGYtOFwiLFxuICAgICAgXCJDb250ZW50LURpc3Bvc2l0aW9uXCI6IGBhdHRhY2htZW50OyBmaWxlbmFtZT1cIiR7ZmlsZW5hbWV9XCJgLFxuICAgICAgXCJDYWNoZS1Db250cm9sXCI6IFwibm8tc3RvcmVcIixcbiAgICB9LFxuICB9KTtcbn07XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0FBU0EsSUFBTSxlQUFlO0FBVXJCLFNBQVMsSUFBSSxPQUF1QjtBQUNsQyxTQUFPLE1BQ0osUUFBUSxPQUFPLE1BQU0sRUFDckIsUUFBUSxNQUFNLEtBQUssRUFDbkIsUUFBUSxNQUFNLEtBQUssRUFDbkIsUUFBUSxVQUFVLEtBQUs7QUFDNUI7QUFFQSxJQUFPLGdCQUFRLE9BQU8sWUFBd0M7QUFDNUQsUUFBTSxTQUFTLFFBQVEsSUFBSTtBQUMzQixNQUFJLENBQUMsUUFBUTtBQUNYLFlBQVEsTUFBTSx3Q0FBd0M7QUFDdEQsV0FBTyxJQUFJLFNBQVMseUJBQXlCLEVBQUUsUUFBUSxJQUFJLENBQUM7QUFBQSxFQUM5RDtBQUVBLFFBQU0sS0FBSyxJQUFJLElBQUksUUFBUSxHQUFHLEVBQUUsYUFBYSxJQUFJLElBQUk7QUFFckQsTUFBSSxDQUFDLE1BQU0sQ0FBQyxrRUFBa0UsS0FBSyxFQUFFLEdBQUc7QUFDdEYsV0FBTyxJQUFJLFNBQVMseUJBQXlCLEVBQUUsUUFBUSxJQUFJLENBQUM7QUFBQSxFQUM5RDtBQUVBLE1BQUksT0FBMkI7QUFDL0IsTUFBSTtBQUNGLFVBQU0sTUFBTSxNQUFNO0FBQUEsTUFDaEIsR0FBRyxZQUFZLHdCQUF3QixFQUFFO0FBQUEsTUFDekMsRUFBRSxTQUFTLEVBQUUsUUFBUSxRQUFRLGVBQWUsVUFBVSxNQUFNLEdBQUcsRUFBRTtBQUFBLElBQ25FO0FBQ0EsUUFBSSxDQUFDLElBQUksSUFBSTtBQUNYLGNBQVEsTUFBTSxpQ0FBaUMsSUFBSSxRQUFRLE1BQU0sSUFBSSxLQUFLLENBQUM7QUFDM0UsYUFBTyxJQUFJLFNBQVMsaUJBQWlCLEVBQUUsUUFBUSxJQUFJLENBQUM7QUFBQSxJQUN0RDtBQUNBLFVBQU0sT0FBUSxNQUFNLElBQUksS0FBSztBQUM3QixXQUFPLE1BQU0sUUFBUSxJQUFJLEtBQUssS0FBSyxTQUFTLEtBQUssQ0FBQyxJQUFJO0FBQUEsRUFDeEQsU0FBUyxLQUFLO0FBQ1osWUFBUSxNQUFNLCtCQUErQixHQUFHO0FBQ2hELFdBQU8sSUFBSSxTQUFTLGdCQUFnQixFQUFFLFFBQVEsSUFBSSxDQUFDO0FBQUEsRUFDckQ7QUFFQSxNQUFJLENBQUMsS0FBTSxRQUFPLElBQUksU0FBUyxrQkFBa0IsRUFBRSxRQUFRLElBQUksQ0FBQztBQUVoRSxRQUFNLFFBQVEsS0FBSyxRQUFRLGVBQWUsS0FBSztBQUMvQyxRQUFNLE1BQ0o7QUFBQSxJQUNFO0FBQUEsSUFDQTtBQUFBLElBQ0EsTUFBTSxJQUFJLElBQUksQ0FBQztBQUFBLElBQ2YsS0FBSyxRQUFRLGlCQUFpQixJQUFJLEtBQUssTUFBTSxLQUFLLENBQUMsQ0FBQyxLQUFLO0FBQUEsSUFDekQsS0FBSyxRQUFRLHVCQUF1QixJQUFJLEtBQUssTUFBTSxLQUFLLENBQUMsQ0FBQyxLQUFLO0FBQUEsSUFDL0QsS0FBSyxVQUFVLG1CQUFtQixJQUFJLEtBQUssUUFBUSxLQUFLLENBQUMsQ0FBQyxTQUFTO0FBQUEsSUFDbkU7QUFBQSxJQUNBO0FBQUEsRUFDRixFQUNHLE9BQU8sT0FBTyxFQUNkLEtBQUssTUFBTSxJQUFJO0FBRXBCLFFBQU0sWUFBWSxLQUFLLFFBQVEsZ0JBQWdCLEdBQUcsS0FBSyxVQUFVO0FBQ2pFLFNBQU8sSUFBSSxTQUFTLEtBQUs7QUFBQSxJQUN2QixRQUFRO0FBQUEsSUFDUixTQUFTO0FBQUEsTUFDUCxnQkFBZ0I7QUFBQSxNQUNoQix1QkFBdUIseUJBQXlCLFFBQVE7QUFBQSxNQUN4RCxpQkFBaUI7QUFBQSxJQUNuQjtBQUFBLEVBQ0YsQ0FBQztBQUNIOyIsCiAgIm5hbWVzIjogW10KfQo=
