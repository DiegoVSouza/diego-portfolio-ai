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

test("the home is wide and has no project sidebar", async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".metro-stations")).toHaveCount(0);
  const wrap = await page.locator("main.wrap").boundingBox();
  expect(wrap!.width).toBeGreaterThan(1200);
  // Two columns of cards on a wide screen.
  const cards = page.locator("ul.grid > li");
  const a = await cards.nth(0).boundingBox();
  const b = await cards.nth(1).boundingBox();
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(160);
  // The tests of a project are tucked in an accordion that opens on click.
  const tests = page.locator(".disclosure", { hasText: "Tests and evidence" }).first();
  await expect(tests).not.toHaveAttribute("open", "");
  await tests.locator("summary").click();
  await expect(tests).toHaveAttribute("open", "");
  await expect(tests.locator(".proof-mini li").first()).toBeVisible();
});

test("travelling: the camera swings between two projects, is head-on at a station, and the page leans with it", async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  const travel = async () => Math.abs(Number(await canvas.getAttribute("data-travel")));
  // The scene's own station for a project (cards in one row have stations a little apart).
  const centre = (slug: string) => page.evaluate((s) => Number(document.getElementById(`project-${s}`)!.dataset.stationY) - window.innerHeight / 2, slug);
  // At a station the camera looks straight at the project.
  await page.evaluate((y) => window.scrollTo(0, y), await centre("foundation"));
  await expect.poll(travel, { timeout: 8000 }).toBeLessThan(0.1);
  // Half way to the next station it has swung out.
  const from = await centre("foundation");
  const to = await centre("agents");
  const events = await page.evaluate(() => {
    (window as unknown as { __turns: number[] }).__turns = [];
    window.addEventListener("scene:travel", (e) => (window as unknown as { __turns: number[] }).__turns.push((e as CustomEvent<{ yaw: number }>).detail.yaw));
    return true;
  });
  expect(events).toBe(true);
  await page.evaluate((y) => window.scrollTo(0, y), (from + to) / 2);
  await expect.poll(travel, { timeout: 8000 }).toBeGreaterThan(0.25);
  // A panel on the page leans (rotationY) while the camera is swung out.
  const lean = await page.locator("main.wrap > section").nth(1).evaluate((el) => getComputedStyle(el).transform);
  expect(lean).not.toBe("none");
  expect(await page.evaluate(() => (window as unknown as { __turns: number[] }).__turns.length)).toBeGreaterThan(0);
  // And it settles again at the next station.
  await page.evaluate((y) => window.scrollTo(0, y), to);
  await expect.poll(travel, { timeout: 8000 }).toBeLessThan(0.1);
});

test("travelling under reduced motion: no swing, no events, the scroll still reaches every project", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await mockApi(page);
  await page.goto("/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", /3d/, { timeout: 20_000 });
  await page.evaluate(() => {
    (window as unknown as { __turns: number }).__turns = 0;
    window.addEventListener("scene:travel", () => ((window as unknown as { __turns: number }).__turns += 1));
    const a = document.getElementById("project-foundation")!.getBoundingClientRect().top + window.scrollY;
    const b = document.getElementById("project-agents")!.getBoundingClientRect().top + window.scrollY;
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
  // Twelve skyline towers come from the building models, and the fleet has a truck, a moto and two cars.
  await expect(canvas).toHaveAttribute("data-landmarks", "12");
  await expect.poll(async () => Number(await canvas.getAttribute("data-vehicle-kinds")), { timeout: 15_000 }).toBe(4);
  // One metro station per project (eight), built from the Modular Underground Metro pieces.
  await expect.poll(async () => Number(await canvas.getAttribute("data-stations")), { timeout: 15_000 }).toBe(8);
  // No model fell back to a generated one: a fallback logs a warning.
  expect(problems.filter((p) => /did not load/.test(p))).toEqual([]);
  // Nothing sits at the origin (the known stacking bug) and the scene is not empty.
  await expect(canvas).toHaveAttribute("data-at-origin", "0");
});
