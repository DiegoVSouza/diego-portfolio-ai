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

test("the cards hang in different places: every stop is reachable and drawn, saved as evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  for (let k = 1; k <= 9; k += 1) {
    await page.keyboard.press("j");
    await expect.poll(() => canvas.getAttribute("data-shown"), { timeout: 8000 }).toBe(String(k));
    // A key is ignored while a flight lasts, so wait for it to end before the next press.
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.flight ?? ""), { timeout: 8000 }).toBe("");
    await expect(page.locator(".stop-card[data-near='1']")).toHaveCount(1, { timeout: 8000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${evidence}/stop-${k}.png` });
  }
  expect(Number(await canvas.getAttribute("data-at-origin"))).toBe(0);
});

test("the wheel leaves the last card even when its text scrolls, once the text is at its top", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const canvas = page.locator("canvas.scene");
  await expect(canvas).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  await page.keyboard.press("6");
  await expect.poll(() => canvas.getAttribute("data-shown"), { timeout: 8000 }).toBe("9");
  // Make the last card's text longer than the card, so it scrolls on its own.
  await page.evaluate(() => {
    const sc = document.querySelector<HTMLElement>("#s-terminal .sc")!;
    sc.style.setProperty("overflow-y", "auto", "important");
    sc.style.setProperty("max-height", "200px", "important");
    const filler = document.createElement("div");
    filler.style.height = "600px";
    filler.style.flex = "none";
    sc.append(filler);
  });
  const box = (await page.locator("#s-terminal .sc").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 40);
  // Scrolling down moves the text; scrolling up at the top moves to the previous stop.
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => document.querySelector("#s-terminal .sc")!.scrollTop), { timeout: 4000 }).toBeGreaterThan(0);
  await page.evaluate(() => { document.querySelector("#s-terminal .sc")!.scrollTop = 0; });
  await page.mouse.wheel(0, -120);
  await expect.poll(() => canvas.getAttribute("data-shown"), { timeout: 8000 }).toBe("8");
});
