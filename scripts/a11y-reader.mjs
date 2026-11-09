// AI "screen reader" pass: drives Microsoft Edge via Playwright and reports what an
// assistive-technology user would encounter (accessibility tree, heading outline,
// landmarks, keyboard tab order with accessible names, axe-core violations).
// This is an automated review. It is NOT a substitute for a human screen-reader session.
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.env.BASE_URL ?? "http://localhost:44173";
const OUT = "artifacts/evidence/a11y-reader";
// Default: every URL in the built sitemap, so the list cannot drift from the real routes.
const sitemapRoutes = [...readFileSync("dist/sitemap.xml", "utf8").matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map((m) => m[1]);
const ROUTES = process.env.ROUTES ? process.env.ROUTES.split(",") : sitemapRoutes;
const MAX_TABS = 80;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const version = browser.version();
const report = { tool: "playwright+msedge", browserVersion: version, base: BASE, date: new Date().toISOString(), routes: [] };
let md = `# Automated accessibility-reader review\n\nBrowser: Microsoft Edge ${version} via Playwright. Automated review; **not** a human screen-reader session.\n\n`;

for (const route of ROUTES) {
  const page = await browser.newPage();
  const entry = { route };
  try {
    const resp = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
    entry.status = resp?.status();
    entry.title = await page.title();
    entry.lang = await page.evaluate(() => document.documentElement.lang);
    entry.ariaSnapshot = await page.locator("body").ariaSnapshot();
    entry.headings = await page.evaluate(() =>
      [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({ level: +h.tagName[1], text: h.textContent.trim().slice(0, 80) })));
    entry.landmarks = await page.evaluate(() =>
      [...document.querySelectorAll("header,nav,main,footer,aside,[role=banner],[role=navigation],[role=main],[role=contentinfo],[role=complementary],[role=region][aria-label]")]
        .map((e) => ({ tag: e.tagName.toLowerCase(), role: e.getAttribute("role"), label: e.getAttribute("aria-label") })));
    entry.imagesWithoutAlt = await page.evaluate(() => [...document.querySelectorAll("img:not([alt])")].map((i) => i.src.slice(-60)));
    // axe runs on the untouched page: tabbing through the stages changes which stage is visible.
    await page.evaluate(axeSource);
    const axe = await page.evaluate(() => axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] }));
    entry.axeViolations = axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
    // keyboard walk
    const stops = [];
    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press("Tab");
      const s = await page.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body) return null;
        const name = e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") && document.getElementById(e.getAttribute("aria-labelledby"))?.textContent || e.textContent || e.getAttribute("title") || e.getAttribute("alt") || "";
        const r = e.getBoundingClientRect();
        return { tag: e.tagName.toLowerCase(), role: e.getAttribute("role"), name: name.trim().replace(/\s+/g, " ").slice(0, 60), visible: r.width > 0 && r.height > 0 };
      });
      if (!s) break;
      if (stops.length && JSON.stringify(stops[0]) === JSON.stringify(s) && i > 1) break;
      stops.push(s);
    }
    entry.tabStops = stops;
    entry.unnamedStops = stops.filter((s) => !s.name);
    entry.invisibleStops = stops.filter((s) => !s.visible);
  } catch (e) {
    entry.error = String(e).slice(0, 300);
  }
  await page.close();
  report.routes.push(entry);
  const h1s = (entry.headings ?? []).filter((h) => h.level === 1).length;
  const jumps = (entry.headings ?? []).filter((h, i, a) => i && h.level > a[i - 1].level + 1).length;
  md += `## ${route}\n- status ${entry.status ?? "ERR"}, title "${entry.title ?? ""}", lang "${entry.lang ?? ""}"\n- h1 count ${h1s}, heading level jumps ${jumps}, landmarks ${entry.landmarks?.length ?? 0}\n- tab stops ${entry.tabStops?.length ?? 0}, unnamed ${entry.unnamedStops?.length ?? 0}, invisible ${entry.invisibleStops?.length ?? 0}, images without alt ${entry.imagesWithoutAlt?.length ?? 0}\n- axe violations: ${entry.axeViolations?.length ? entry.axeViolations.map((v) => `${v.id}(${v.impact},${v.nodes})`).join(", ") : entry.error ? "ERROR " + entry.error : "none"}\n\n`;
}
await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
writeFileSync(`${OUT}/report.md`, md);
console.log(md);
