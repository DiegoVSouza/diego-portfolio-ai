import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const slugs = ["supportops", "foundation", "agents", "toolkit", "observability", "async", "design-system", "harness"];
const pages = ["", "demo/", "evidence/", "method/", "experience/", "design-system/", ...slugs.map((s) => `projects/${s}/`)];
const paths = [...pages.map((p) => `/${p}`), ...pages.map((p) => `/pt/${p}`)];
const viewports = [{ width: 1000, height: 800 }, { width: 360, height: 740 }];
const evidence = "artifacts/evidence/portfolio-w7";

// The Functions are tested on their own with mocks. Here the page gets the same shapes from a stub, so a missing backend is not a console error.
test.beforeEach(async ({ page }) => {
  if (process.env.PUBLIC_URL) return; // against the deployed site the real Functions answer
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(route.request().url().includes("/runs/") ? { runs: [] } : { state: "asleep", startAvailable: false }) }),
  );
});

for (const viewport of viewports) {
  test(`every route passes axe with contrast, does not overflow, and logs no errors at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(viewport);
    const problems: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" || /Content.Security.Policy|Hydration|hydrat/i.test(m.text())) problems.push(`${page.url()} ${m.text()}`); });
    page.on("pageerror", (e) => problems.push(`${page.url()} pageerror ${e.message}`));
    for (const path of paths) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations.map((v) => `${path} ${v.id}: ${v.nodes[0]?.target}`), path).toEqual([]);
      const wide = await page.evaluate(() => {
        if (document.documentElement.scrollWidth <= window.innerWidth) return [];
        return [...document.querySelectorAll("body *:not(svg *)")]
          .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 0.5)
          .map((e) => `${e.tagName.toLowerCase()}.${String(e.className)}`)
          .slice(0, 6);
      });
      expect(wide, `${path} overflows horizontally`).toEqual([]);
    }
    expect(problems).toEqual([]);
  });
}

test("with JavaScript off, every route still shows its heading, and a case shows its diagram and its list (SEO-001, FLOW-005)", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const path of paths) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
  await page.goto("/projects/supportops/");
  await expect(page.locator(".flow-list")).toBeVisible();
  await expect(page.locator("svg.flow-svg").first()).toBeAttached();
  await context.close();
});

test("English and Portuguese link to each other and set the document language", async ({ page }) => {
  await page.goto("/projects/agents/");
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("en");
  await page.getByRole("link", { name: "PT" }).click();
  await expect(page).toHaveURL(/\/pt\/projects\/agents\/$/);
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("pt-BR");
  await expect(page.getByRole("heading", { level: 2, name: /Galeria de falhas/i })).toBeVisible();
});

test("keyboard: skip link, then a project, then back", async ({ page }) => {
  await page.goto("/");
  await page.bringToFront();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.getByRole("link", { name: "Foundation and live evals" }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/projects\/foundation\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Foundation and live evals" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});

test("the diagram walks through scenes and a failure scenario by keyboard, at both widths", async ({ page }) => {
  for (const width of [1000, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/projects/supportops/");
    // The buttons only act once the page is hydrated; the palette button appears after hydration.
    await page.locator("button.palette-open[data-ready]").waitFor();
    const next = page.getByRole("button", { name: "Next" }).first();
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: /1\/3/ })).toBeVisible();
    await page.getByRole("button", { name: "Approve your own refund" }).first().click();
    await expect(page.getByRole("status").filter({ hasText: /requester tries to approve/i })).toBeVisible();
  }
});

test("the demo page requests nothing from a third party until a site key exists, and wakes nothing (LIVE-004, SEC-001)", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(`${r.method()} ${r.url()}`));
  await page.goto("/demo/");
  await expect(page.getByRole("heading", { level: 1, name: "Live demo" })).toBeVisible();
  await page.waitForTimeout(500);
  const own = new URL(page.url()).origin;
  expect(requests.filter((r) => !r.split(" ")[1]!.startsWith(own))).toEqual([]);
  expect(requests.filter((r) => r.startsWith("POST"))).toEqual([]);
});

test("the home page has the role in the first screen, and a squint screenshot is saved for review", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("AI Engineer");
  mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/home-1280.png` });
  await page.evaluate(() => { document.documentElement.style.filter = "blur(8px) grayscale(1)"; }); // CSSOM: the strict CSP blocks injected <style>
  await page.screenshot({ path: `${evidence}/home-1280-squint.png` });
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/projects/supportops/");
  await page.screenshot({ path: `${evidence}/case-360.png`, fullPage: false });
});
