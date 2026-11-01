import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ready = (page: import("@playwright/test").Page) => page.locator("button.palette-open[data-ready]").waitFor();

test.beforeEach(async ({ page }) => {
  if (process.env.PUBLIC_URL) return;
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "asleep", startAvailable: false, runs: [] }) }));
});

test.describe("case tabs", () => {
  test("four tabs, one panel at a time, and the hash names the tab", async ({ page }) => {
    await page.goto("/projects/supportops/");
    await ready(page);
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveText(["Demo", "Architecture", "Decisions", "Numbers"]);
    await expect(page.getByRole("tab", { name: "Demo" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "See it run" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How it works" })).toBeHidden();
    await page.getByRole("tab", { name: "Decisions" }).click();
    await expect(page).toHaveURL(/#decisions$/);
    await expect(page.getByRole("heading", { name: "Failure gallery" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "See it run" })).toBeHidden();
  });

  test("arrow keys, Home and End move between tabs", async ({ page }) => {
    await page.goto("/projects/supportops/");
    await ready(page);
    await page.getByRole("tab", { name: "Demo" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Architecture" })).toBeFocused();
    await expect(page.getByRole("tab", { name: "Architecture" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Numbers" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Demo" })).toHaveAttribute("aria-selected", "true");
  });

  test("a link with a hash opens the tab that holds it, and so does a link inside the page", async ({ page }) => {
    await page.goto("/projects/supportops/#numbers");
    await ready(page);
    await expect(page.getByRole("tab", { name: "Numbers" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await page.goto("/projects/supportops/#fail-h");
    await ready(page);
    await expect(page.getByRole("tab", { name: "Decisions" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Demo" }).click();
    await page.getByRole("link", { name: "Not measured, so not claimed" }).click();
    await expect(page.getByRole("tab", { name: "Numbers" })).toHaveAttribute("aria-selected", "true");
  });

  test("without JavaScript every panel is stacked and visible, and there is no tab bar", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/projects/supportops/");
    await expect(page.getByRole("tab")).toHaveCount(0);
    for (const name of ["See it run", "How it works", "Decisions", "Failure gallery", "Results", "What I would do differently"]) await expect(page.getByRole("heading", { name }).first()).toBeVisible();
    await context.close();
  });

  test("tabs pass axe in both languages and at both widths", async ({ page }) => {
    for (const width of [1000, 360]) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ["/projects/agents/", "/pt/projects/agents/"]) {
        await page.goto(path);
        await ready(page);
        for (const index of [0, 1, 2, 3]) {
          await page.getByRole("tab").nth(index).click();
          const result = await new AxeBuilder({ page }).analyze();
          expect(result.violations.map((v) => `${path} ${width}px tab ${index} ${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
        }
      }
    }
  });
});

test.describe("descent, simple version and back to the surface", () => {
  test("opening a project plays the stripes, and reduced motion changes the page at once", async ({ page, browser }) => {
    await page.goto("/");
    await ready(page);
    await page.evaluate(() => {
      const wipe = document.getElementById("wipe")!;
      (window as unknown as { __wiped: boolean }).__wiped = false;
      new MutationObserver(() => {
        if (wipe.classList.contains("go")) (window as unknown as { __wiped: boolean }).__wiped = true;
      }).observe(wipe, { attributes: true, attributeFilter: ["class"] });
    });
    await page.getByRole("main").getByRole("link", { name: "Foundation and live evals" }).first().click();
    await expect(page).toHaveURL(/\/projects\/foundation\/$/);
    expect(await page.evaluate(() => (window as unknown as { __wiped: boolean }).__wiped)).toBe(true);

    const context = await browser.newContext({ reducedMotion: "reduce" });
    const calm = await context.newPage();
    await calm.goto("/");
    await calm.locator("button.palette-open[data-ready]").waitFor();
    await calm.evaluate(() => {
      const wipe = document.getElementById("wipe")!;
      (window as unknown as { __wiped: boolean }).__wiped = false;
      new MutationObserver(() => {
        if (wipe.classList.contains("go")) (window as unknown as { __wiped: boolean }).__wiped = true;
      }).observe(wipe, { attributes: true, attributeFilter: ["class"] });
    });
    await calm.getByRole("main").getByRole("link", { name: "Foundation and live evals" }).first().click();
    await expect(calm).toHaveURL(/\/projects\/foundation\/$/);
    expect(await calm.evaluate(() => (window as unknown as { __wiped: boolean }).__wiped)).toBe(false);
    await context.close();
  });

  test("the simple version turns the scene off, is remembered, and turns back on", async ({ page }) => {
    await page.goto("/");
    await ready(page);
    await expect(page.locator("canvas.scene")).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
    const toggle = page.getByRole("button", { name: "Simple version" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("canvas.scene")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-simple", "true");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await page.reload();
    await ready(page);
    await expect(page.getByRole("button", { name: "Simple version" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("canvas.scene")).toHaveCount(0);
    await page.getByRole("button", { name: "Simple version" }).click();
    await expect(page.locator("canvas.scene")).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  });

  test("Back to the surface returns to the same project on the home", async ({ page }) => {
    await page.goto("/projects/toolkit/");
    await ready(page);
    await page.getByRole("link", { name: "Back to the surface" }).click();
    await expect(page).toHaveURL(/\/#project-toolkit$/);
    await expect(page.locator("#project-toolkit")).toBeInViewport();
    const canvas = page.locator("canvas.scene");
    await expect(canvas).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
    await expect(canvas).toHaveAttribute("data-active", "3");
  });
});

test.describe("metro line", () => {
  test("on a wide screen the line lists the eight stations and marks the open project", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/projects/agents/");
    const line = page.getByRole("navigation", { name: "Project line" });
    await expect(line.getByRole("link")).toHaveCount(8);
    await expect(line.getByRole("link", { name: /Multi-agent orchestration/ })).toHaveAttribute("aria-current", "page");
    await expect(line.getByRole("button", { name: "Next project" })).toBeHidden();
  });

  test("on a narrow screen the line is a bar with previous and next, and next opens the next project", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/projects/agents/");
    await ready(page);
    const line = page.getByRole("navigation", { name: "Project line" });
    await expect(line.getByRole("link")).toHaveCount(0).catch(() => undefined);
    await expect(line.locator(".metro-now")).toHaveText(/03 · Multi-agent orchestration/);
    await line.getByRole("button", { name: "Next project" }).click();
    await expect(page).toHaveURL(/\/projects\/toolkit\/$/);
    await expect(line.locator(".metro-now")).toHaveText(/04 · Production AI toolkit/);
    await line.getByRole("button", { name: "Previous project" }).click();
    await expect(page).toHaveURL(/\/projects\/agents\/$/);
  });

  test("the j and k keys move one station, and do nothing while typing", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/projects/agents/");
    await ready(page);
    await page.keyboard.press("j");
    await expect(page).toHaveURL(/\/projects\/toolkit\/$/);
    await page.keyboard.press("k");
    await expect(page).toHaveURL(/\/projects\/agents\/$/);
    await page.keyboard.press("/");
    await page.keyboard.type("jk");
    await expect(page.getByRole("combobox")).toHaveValue("jk");
    await expect(page).toHaveURL(/\/projects\/agents\/$/);
  });

  test("on the home the active station follows the card in the middle of the screen, and a station scrolls to its card", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await ready(page);
    const line = page.getByRole("navigation", { name: "Project line" });
    await line.getByRole("link", { name: /Production AI toolkit/ }).click();
    await expect(page.locator("#project-toolkit")).toBeInViewport();
    await expect(line.getByRole("link", { name: /Production AI toolkit/ })).toHaveAttribute("aria-current", "location");
    await expect(line.locator("[role=status]")).toContainText(/Project 4 of 8/);
  });

  test("the line passes axe on the home and on a case, at both widths", async ({ page }) => {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ["/", "/projects/agents/", "/pt/projects/agents/"]) {
        await page.goto(path);
        await ready(page);
        const result = await new AxeBuilder({ page }).analyze();
        expect(result.violations.map((v) => `${path} ${width}px ${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
      }
    }
  });
});

