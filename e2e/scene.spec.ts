import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const evidence = "artifacts/evidence/portfolio-w7b";

test.beforeEach(async ({ page }) => {
  if (process.env.PUBLIC_URL) return;
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "asleep", startAvailable: false, runs: [] }) }));
});

function watch(page: import("@playwright/test").Page) {
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" || /Content.Security.Policy|Hydration|hydrat/i.test(m.text())) problems.push(m.text()); });
  page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));
  return problems;
}

test("SCENE-001/002/004: the 3d scene starts under the CSP, is hidden from assistive technology and takes no pointer events", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  await expect(canvas).toHaveClass(/on/);
  await expect(canvas).toHaveAttribute("aria-hidden", "true");
  expect(await canvas.evaluate((e) => getComputedStyle(e).pointerEvents)).toBe("none");
  // The scroll drives the camera: the active project changes along the page.
  const first = await canvas.getAttribute("data-active");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(async () => canvas.getAttribute("data-active")).not.toBe(first);
  // The renderer issued draw calls for the first frame: the scene is not empty.
  const draws = Number(await canvas.getAttribute("data-draws"));
  mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/home-3d.png` });
  writeFileSync(`${evidence}/home-3d.json`, JSON.stringify({ drawCallsFirstFrame: draws, quality: await canvas.getAttribute("data-quality") }));
  expect(draws).toBeGreaterThan(10);
  expect(problems).toEqual([]);
});

test("SCENE-003: under reduced motion the scene is static and offers no motion toggle", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const problems = watch(page);
  await page.goto("/");
  await expect(page.locator("canvas.scene")).toHaveAttribute("data-scene", "3d-static", { timeout: 20_000 });
  // No light trail, scrap or other instance is left stacked at the origin.
  await expect(page.locator("canvas.scene")).toHaveAttribute("data-at-origin", "0");
  await expect(page.getByRole("button", { name: /^Motion$/ })).toHaveCount(0);
  expect(problems).toEqual([]);
  await context.close();
});

test("SCENE-001: without WebGL the level 1 background stays, with no error", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (/webgl/.test(type)) return null;
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest) as never;
    } as never;
  });
  const page = await context.newPage();
  const problems = watch(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-bg", "2d");
  await expect(page.locator("canvas.scene")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  expect(problems).toEqual([]);
  await context.close();
});

test("a case page holds the camera at its own project and does not scroll the scene", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/projects/agents/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  await expect(canvas).toHaveAttribute("data-active", "2");
  await page.waitForTimeout(300);
  mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/case-agents-3d.png` });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(canvas).toHaveAttribute("data-active", "2");
  await expect(page.getByRole("button", { name: /^Motion$/ })).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("the scene stays off pages that do not use it", async ({ page }) => {
  await page.goto("/evidence/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.locator("canvas.scene")).toHaveCount(0);
});

test("a portrait screen keeps the level 1 background and mounts no canvas", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await context.newPage();
  const problems = watch(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.locator("canvas.scene")).toHaveCount(0);
  expect(problems).toEqual([]);
  await context.close();
});

test("static frame of the contact section (scene S5)", async ({ page }) => {
  await page.goto("/");
  const section = page.locator('section[aria-labelledby="contact-h"]');
  await expect(section).toBeVisible();
  mkdirSync(evidence, { recursive: true });
  await section.screenshot({ path: `${evidence}/contact.png` });
});

test("the half-tone pass is on by default, the h key and the button turn it off, and the choice is remembered", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  await expect(canvas).toHaveAttribute("data-halftone", "on");
  const button = page.getByRole("button", { name: "Halftone" });
  await expect(button).toHaveAttribute("aria-pressed", "true");
  mkdirSync(evidence, { recursive: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${evidence}/home-halftone.png` });
  await page.keyboard.press("h");
  await expect(canvas).toHaveAttribute("data-halftone", "off");
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.locator("canvas.scene")).toHaveAttribute("data-halftone", "off", { timeout: 20_000 });
  await page.getByRole("button", { name: "Halftone" }).click();
  await expect(page.locator("canvas.scene")).toHaveAttribute("data-halftone", "on");
  expect(problems).toEqual([]);
});

test("SCENE-003: the RGB split fires only after a selection settles, and never under reduced motion", async ({ page, browser }) => {
  await page.goto("/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(canvas).toHaveAttribute("data-split-seen", "1", { timeout: 10_000 });
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const calm = await context.newPage();
  await calm.goto("/");
  await expect(calm.locator("canvas.scene")).toHaveAttribute("data-scene", "3d-static", { timeout: 20_000 });
  await calm.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await calm.waitForTimeout(800);
  await expect(calm.locator("canvas.scene")).not.toHaveAttribute("data-split-seen", "1");
  await context.close();
});
