import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

/** Phase 011: the menu names what the camera shows, and a far jump cuts instead of flying past every stop. */
const evidence = "artifacts/evidence/city-fixes-011";
mkdirSync(evidence, { recursive: true });

test("the menu follows the camera, and a jump of several stops cuts instead of passing the stops in between", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  await page.evaluate(() => {
    const seen: number[] = [];
    (window as unknown as { __shown: number[] }).__shown = seen;
    window.addEventListener("scene-shown", (e) => seen.push((e as CustomEvent<number>).detail));
  });
  // District 4 (Craft) is several stops away from the arrival.
  await page.locator(".districts-list > li").nth(4).locator("> a").click();
  await expect.poll(() => canvas.getAttribute("data-shown"), { timeout: 8000 }).not.toBe("0");
  const shown = await page.evaluate(() => (window as unknown as { __shown: number[] }).__shown);
  // Every stop the camera showed on the way: only the target (a cut), never the stops in between.
  expect(shown).toHaveLength(1);
  const target = shown[0]!;
  expect(target).toBeGreaterThan(2);
  // The highlighted district is the one that holds the stop on screen.
  await expect(page.locator(".districts-list > li.on")).toHaveCount(1);
  await expect(page.locator(".districts-list > li.on .d-n")).toHaveText("05");
  await page.screenshot({ path: `${evidence}/menu-cut.png` });
  // One step still flies: the camera shows the next stop.
  await page.keyboard.press("j");
  await expect.poll(() => canvas.getAttribute("data-shown"), { timeout: 8000 }).toBe(String(target + 1));
});

test("the street goes on past the last stop and the scene still draws", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  await page.keyboard.press("6");
  await expect.poll(() => canvas.getAttribute("data-shown"), { timeout: 8000 }).not.toBe("0");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${evidence}/last-stop.png` });
  expect(Number(await canvas.getAttribute("data-at-origin"))).toBe(0);
});
