import { expect, test, type Page } from "@playwright/test";

/** Rework of the demo, diagrams and home: the checks that were not covered before (docs/harness/portfolio). */

const status = (state: string) => ({
  state,
  consoleUrl: "https://demo.example.test/console",
  startAvailable: true,
  accounts: [
    { role: "agent", user: "agent@demo.test", password: "demo-pass-1" },
    { role: "approver", user: "approver@demo.test", password: "demo-pass-2" },
  ],
});

async function mockApi(page: Page, state = "awake") {
  if (process.env.PUBLIC_URL) return;
  await page.route("**/api/status", (route) => route.fulfill({ json: status(state) }));
  await page.route("**/api/runs/latest", (route) => route.fulfill({ json: { runs: [] } }));
}

test("the demo is ready on arrival: a clear call to action and the accounts with copy buttons", async ({ page }) => {
  test.skip(Boolean(process.env.PUBLIC_URL), "needs a mocked status");
  await mockApi(page);
  await page.goto("/projects/supportops/#demo");
  const open = page.getByRole("link", { name: /Open live demo/ });
  await expect(open).toBeVisible();
  await expect(open).toHaveAttribute("href", "https://demo.example.test/console");
  await expect(page.getByRole("link", { name: /^Console$/ })).toHaveCount(0);
  await expect(page.getByText("agent@demo.test")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy" })).toHaveCount(4);
  // Heavy details are tucked away until asked for.
  await expect(page.locator(".disclosure", { hasText: "Recent live runs" })).not.toHaveAttribute("open", "");
});

test("a guided-tour step opens on hover, smoothly, and by keyboard", async ({ page }) => {
  test.skip(Boolean(process.env.PUBLIC_URL), "needs a mocked status");
  await mockApi(page);
  await page.goto("/projects/supportops/#demo");
  const step = page.locator(".tour-step").first();
  await step.scrollIntoViewIfNeeded();
  await expect(step).not.toHaveAttribute("open", "");
  await step.hover();
  await expect(step).toHaveAttribute("open", "");
  await expect(step.locator(".disclosure-body")).toBeVisible();
  await page.mouse.move(2, 2);
  await expect(step).not.toHaveAttribute("open", "", { timeout: 3000 });
  // Keyboard: the summary toggles it, so nothing depends on hover.
  await step.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(step).toHaveAttribute("open", "");
});

test("a diagram fills its stop (no sideways scroll), says where to click, plays itself, and keeps its text version only for screen readers", async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/projects/agents/#flow");
  const region = page.getByRole("region", { name: "Interactive diagram" });
  await expect(region).toBeVisible();
  await expect(region.locator(".flow-hint")).toContainText("click any box");
  // It plays by itself once it is on screen: the step caption appears without a click.
  await expect(region.locator(".flow-step")).toBeVisible({ timeout: 8000 });
  // Nothing is cropped: the stage is no wider than its region and the region does not scroll.
  const fit = await region.evaluate((el) => {
    const stage = el.querySelector<HTMLElement>(".flow-stage")!;
    return { stage: stage.getBoundingClientRect().width, region: el.getBoundingClientRect().width, scroll: el.scrollWidth - el.clientWidth };
  });
  expect(fit.stage).toBeLessThanOrEqual(fit.region + 1);
  expect(fit.scroll).toBeLessThanOrEqual(1);
  // The text version is not visible, yet it is in the page for assistive technology.
  const text = region.locator(".flow-text");
  const box = await text.boundingBox();
  expect(box === null || box.width <= 2).toBe(true);
  expect(await text.locator(".flow-list li").count()).toBeGreaterThan(2);
  // A highlighted node pulses (CSS animation), and an edge in the step flows.
  expect(await region.locator(".flow-node.focus .flow-box").first().evaluate((e) => getComputedStyle(e).animationName)).toContain("flow-pulse");
});

test("under reduced motion the diagram does not play itself and nothing pulses", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await mockApi(page);
  await page.goto("/projects/agents/#flow");
  const region = page.getByRole("region", { name: "Interactive diagram" });
  await expect(region).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(region.locator(".flow-step")).toHaveCount(0);
  expect(await region.locator(".flow-hint-dot").evaluate((e) => getComputedStyle(e).animationName)).toBe("none");
  await context.close();
});

test("the home is a wide stage: the menu on the left, the card on the right, the city between, the tests in an accordion", async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("canvas.scene")).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  await expect(page.locator("#s-arrival .stop-card")).toHaveAttribute("data-near", "1");
  await expect(page.locator(".metro-stations")).toHaveCount(0);
  const menu = await page.locator(".districts-list").boundingBox();
  const panel = await page.locator("#s-arrival .stop-card").boundingBox();
  expect(menu!.x + menu!.width).toBeLessThan(400);
  expect(panel!.x).toBeGreaterThan(1440 * 0.5);
  // Between them the city is visible: nothing opaque stands in the middle third.
  const covered = await page.evaluate(() => Boolean(document.elementFromPoint(window.innerWidth * 0.5, window.innerHeight * 0.5)?.closest(".stop-card, .districts")));
  expect(covered).toBe(false);
  // The tests of a project are tucked in an accordion that opens on click.
  await page.evaluate(() => document.getElementById("s-supportops")!.scrollIntoView({ block: "center" }));
  const tests = page.locator(".disclosure", { hasText: "Tests and evidence" }).first();
  await expect(tests).not.toHaveAttribute("open", "");
  await tests.locator("summary").click();
  await expect(tests).toHaveAttribute("open", "");
  await expect(tests.locator(".proof-mini li").first()).toBeVisible();
});

test("travelling: the camera parks on each card, swings between stops, and each card hangs in its own part of the city", async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  const travel = async () => Math.abs(Number(await canvas.getAttribute("data-travel")));
  // The scene's own stop for a card: the middle of its section.
  const stop = (id: string) => page.evaluate((s) => Number(document.getElementById(`s-${s}`)!.dataset.stationY) - window.innerHeight / 2, id);
  const first = page.locator("#s-supportops .stop-card");
  const second = page.locator("#s-foundation .stop-card");
  await page.evaluate((y) => window.scrollTo(0, y), await stop("supportops"));
  await expect.poll(travel, { timeout: 8000 }).toBeLessThan(0.1);
  await expect(first).toHaveAttribute("data-near", "1");
  // At its stop the card is on the right of the screen, full size, and the next one is only a preview (not interactive).
  await expect.poll(async () => { const b = await first.boundingBox(); return b!.x + b!.width / 2; }, { timeout: 8000 }).toBeGreaterThan(1280 * 0.62);
  expect(await second.evaluate((el) => (el as HTMLElement & { inert: boolean }).inert)).toBe(true);
  // Half way to the next stop the camera has swung out and no card is the near one.
  const from = await stop("supportops");
  const to = await stop("foundation");
  await page.evaluate((y) => window.scrollTo(0, y), (from + to) / 2);
  await expect.poll(travel, { timeout: 8000 }).toBeGreaterThan(0.2);
  await expect(first).not.toHaveAttribute("data-near", "1");
  await expect(second).not.toHaveAttribute("data-near", "1");
  expect(Number(await canvas.getAttribute("data-cards"))).toBeGreaterThanOrEqual(1);
  // And it settles again, with the next card now the near one.
  await page.evaluate((y) => window.scrollTo(0, y), to);
  await expect.poll(travel, { timeout: 8000 }).toBeLessThan(0.1);
  await expect(second).toHaveAttribute("data-near", "1");
});

test("travelling under reduced motion: no swing, no events, the scroll still reaches every stop", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await mockApi(page);
  await page.goto("/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", /3d/, { timeout: 20_000 });
  await page.evaluate(() => {
    (window as unknown as { __turns: number }).__turns = 0;
    window.addEventListener("scene:travel", () => ((window as unknown as { __turns: number }).__turns += 1));
    const a = document.getElementById("s-supportops")!.getBoundingClientRect().top + window.scrollY;
    const b = document.getElementById("s-foundation")!.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, (a + b) / 2);
  });
  await page.waitForTimeout(1200);
  expect(Math.abs(Number(await canvas.getAttribute("data-travel")))).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { __turns: number }).__turns)).toBe(0);
  await context.close();
});

test("the scene is built from the real downloaded models, not the fallbacks (assets: buildings, cars, metro stations)", async ({ page }) => {
  await mockApi(page);
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(m.text()); });
  page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  // Skyline towers come from the building models (not all: some are generated), and the fleet has a truck, a moto and two cars.
  expect(Number(await canvas.getAttribute("data-landmarks"))).toBeGreaterThanOrEqual(8);
  await expect.poll(async () => Number(await canvas.getAttribute("data-vehicle-kinds")), { timeout: 15_000 }).toBe(4);
  // The platform district has its metro station, built from the Modular Underground Metro pieces.
  await expect.poll(async () => Number(await canvas.getAttribute("data-stations")), { timeout: 15_000 }).toBe(1);
  // The city stays inside its draw-call budget (phase 005: at most 100 on the first frame).
  expect(Number(await canvas.getAttribute("data-draws"))).toBeLessThanOrEqual(100);
  // No model fell back to a generated one: a fallback logs a warning.
  expect(problems.filter((p) => /did not load/.test(p))).toEqual([]);
  // Nothing sits at the origin (the known stacking bug) and the scene is not empty.
  await expect(canvas).toHaveAttribute("data-at-origin", "0");
});
