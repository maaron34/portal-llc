/**
 * Tiny HTML helpers shared by the lead email, the weekly digest and the one-tap
 * pages (Mark as handled, Text back, Reply). Everything is inline-styled on
 * purpose: Gmail strips <style> blocks in enough places (forwards, non-Google
 * accounts in the Gmail app) that a one-column email is safer with the styles on
 * each element. Every lead-supplied string goes through esc().
 */

export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function nl2br(s: string): string {
  return esc(s).replace(/\r?\n/g, "<br>");
}

export const FONT =
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

/** A tappable button that renders in Gmail (web, iOS, Android) and iOS Mail. */
export function button(href: string, label: string, opts: { primary?: boolean } = {}): string {
  const bg = opts.primary ? "#1d4ed8" : "#e5e7eb";
  const fg = opts.primary ? "#ffffff" : "#111827";
  return (
    `<a href="${esc(href)}" style="${FONT}display:inline-block;padding:12px 18px;margin:4px 8px 6px 0;` +
    `background:${bg};color:${fg};text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">` +
    `${esc(label)}</a>`
  );
}

/** A labeled block inside the 600px email table. */
export function section(title: string, inner: string): string {
  return (
    `<tr><td style="padding:14px 0 0 0;">` +
    `<div style="${FONT}font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">${esc(title)}</div>` +
    `<div style="${FONT}font-size:15px;line-height:1.5;color:#111827;">${inner}</div>` +
    `</td></tr>`
  );
}

export function smallNote(inner: string): string {
  return `<div style="${FONT}font-size:13px;line-height:1.5;color:#6b7280;margin-top:4px;">${inner}</div>`;
}

/** Wrap email rows in the single-column layout. `preheader` is the inbox preview line. */
export function emailShell(inner: string, opts: { preheader?: string } = {}): string {
  return (
    `<!doctype html><html><body style="margin:0;padding:0;background:#f9fafb;">` +
    (opts.preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>`
      : "") +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;">` +
    `<tr><td align="center" style="padding:16px;">` +
    `<table role="presentation" width="600" cellspacing="0" cellpadding="0" ` +
    `style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;padding:20px;">${inner}</table>` +
    `</td></tr></table></body></html>`
  );
}

/** A standalone page (the one-tap pages). Mobile-first, no external assets. */
export function page(title: string, inner: string): string {
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">` +
    `<title>${esc(title)}</title></head>` +
    `<body style="margin:0;padding:24px 16px;background:#f9fafb;${FONT}color:#111827;line-height:1.5;">` +
    `<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:20px;">${inner}</div>` +
    `</body></html>`
  );
}

export const htmlResponse = (html: string, status = 200): Response =>
  new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
