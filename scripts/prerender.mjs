/**
 * Post-build prerender script.
 *
 * Spins up `vite preview` on a local port, drives a headless Chromium through
 * every route in public/sitemap.xml, snapshots the fully-hydrated HTML, and
 * writes each route to `dist/{route}/index.html`.
 *
 * Result: GPTBot / ClaudeBot / PerplexityBot / pre-JS Googlebot get the
 * fully-rendered HTML per route (including route-specific schema and FAQs),
 * not the empty React shell.
 *
 * Real users still get a snappy SPA: Netlify serves the prerendered HTML,
 * React hydrates over it, client-side routing takes over.
 *
 * Run via `npm run build` (chains after `vite build`).
 */

import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const distDir = join(projectRoot, "dist");
const sitemapPath = join(projectRoot, "public", "sitemap.xml");

const PREVIEW_PORT = 4179;
const PREVIEW_HOST = `http://localhost:${PREVIEW_PORT}`;

// ---- Parse routes from sitemap.xml ----

function getRoutes() {
  if (!existsSync(sitemapPath)) {
    throw new Error(`sitemap.xml not found at ${sitemapPath}`);
  }
  const xml = readFileSync(sitemapPath, "utf-8");
  const locs = [...xml.matchAll(/<loc>https:\/\/buildwithportal\.com(.*?)<\/loc>/g)];
  const routes = locs.map((m) => {
    const path = m[1] || "/";
    return path === "" ? "/" : path;
  });
  // Deduplicate, just in case
  return [...new Set(routes)];
}

// ---- Vite preview server lifecycle ----

function startPreviewServer() {
  return new Promise((resolveStart, rejectStart) => {
    const server = spawn(
      "npx",
      ["vite", "preview", "--port", String(PREVIEW_PORT), "--strictPort"],
      { cwd: projectRoot, stdio: ["ignore", "pipe", "pipe"] }
    );

    const timeout = setTimeout(() => {
      rejectStart(new Error("Preview server failed to start within 20s"));
    }, 20_000);

    server.stdout.on("data", (data) => {
      const out = data.toString();
      if (out.includes(`localhost:${PREVIEW_PORT}`) || out.includes("ready")) {
        clearTimeout(timeout);
        resolveStart(server);
      }
    });
    server.stderr.on("data", (data) => {
      // Surface errors but don't crash if it's a warning
      process.stderr.write(`[vite preview] ${data}`);
    });
    server.on("error", (err) => {
      clearTimeout(timeout);
      rejectStart(err);
    });
  });
}

function stopPreviewServer(server) {
  return new Promise((resolveStop) => {
    if (!server || server.killed) {
      resolveStop();
      return;
    }
    server.on("close", () => resolveStop());
    server.kill("SIGTERM");
    // Force kill after 3s if it doesn't exit cleanly
    setTimeout(() => {
      if (!server.killed) server.kill("SIGKILL");
      resolveStop();
    }, 3_000);
  });
}

// ---- Per-route prerender ----

async function prerenderRoute(browser, route) {
  const url = `${PREVIEW_HOST}${route}`;
  const page = await browser.newPage();

  try {
    // Load and wait for everything to settle
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });

    // Reveal-on-scroll components use IntersectionObserver and stay opacity:0
    // until the user scrolls them into view. For crawlers, force them visible
    // before snapshotting so the content isn't hidden behind opacity:0.
    await page.evaluate(() => {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
      document.querySelectorAll(".reveal-stagger").forEach((el) => el.classList.add("visible"));
    });

    // Give React's useEffect chain (SEO.tsx schema injection) a beat to settle
    // after any class changes trigger re-renders.
    await page.waitForTimeout(200);

    // Snapshot
    const html = await page.content();

    // Write to dist/{route}/index.html
    const outPath =
      route === "/"
        ? join(distDir, "index.html")
        : join(distDir, route.replace(/^\//, ""), "index.html");

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, "utf-8");

    return { route, bytes: html.length };
  } finally {
    await page.close();
  }
}

// ---- Main ----

async function main() {
  const start = Date.now();
  console.log("[prerender] starting");

  const routes = getRoutes();
  console.log(`[prerender] ${routes.length} routes from sitemap.xml`);

  console.log("[prerender] starting vite preview server...");
  const server = await startPreviewServer();
  console.log(`[prerender] preview server ready at ${PREVIEW_HOST}`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    let successful = 0;
    let failed = 0;
    for (const route of routes) {
      try {
        const { bytes } = await prerenderRoute(browser, route);
        console.log(`[prerender] ✓ ${route.padEnd(35)} ${(bytes / 1024).toFixed(1)}KB`);
        successful++;
      } catch (err) {
        console.error(`[prerender] ✗ ${route.padEnd(35)} ${err.message}`);
        failed++;
      }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[prerender] done in ${elapsed}s — ${successful} ok, ${failed} failed`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    if (browser) await browser.close();
    await stopPreviewServer(server);
  }
}

main().catch((err) => {
  console.error("[prerender] fatal:", err);
  process.exit(1);
});
