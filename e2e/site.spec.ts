import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const ids = ["p00", "p01", "p02", "p03", "p04", "p05", "p06"];
const viewports = [{ width: 1280, height: 800 }, { width: 360, height: 740 }];
const evidence = "artifacts/evidence/portfolio-001";

for (const viewport of viewports) {
  test(`home and every project page pass axe (with contrast) at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const csp: string[] = [];
    page.on("console", (m) => { if (/Content.Security.Policy/i.test(m.text())) csp.push(m.text()); });
    for (const route of ["", ...ids.map((id) => `#/${id}`)]) {
      await page.goto(`/${route}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations.map((v) => `${route || "home"} ${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
      const wide = await page.evaluate(() => {
        if (document.documentElement.scrollWidth <= window.innerWidth) return [];
        return [...document.querySelectorAll("body *:not(svg *)")]
          .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 0.5)
          .map((e) => `${e.tagName.toLowerCase()}.${String(e.className)}`)
          .slice(0, 6);
      });
      expect(wide, `${route || "home"} overflows horizontally`).toEqual([]);
    }
    expect(csp).toEqual([]);
  });
}

test("keyboard reaches a project and back", async ({ page }) => {
  await page.goto("/");
  await page.bringToFront();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.getByRole("link", { name: "SupportOps Platform" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "SupportOps Platform" })).toBeVisible();
  await page.getByRole("link", { name: /All projects/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Projects" })).toBeVisible();
});

test("reduced motion stops ambient animation and the page still reads", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const names = await page.evaluate(() => [...document.querySelectorAll(".band-track")].map((e) => getComputedStyle(e).animationName));
  expect(names).toEqual(["none"]);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("squint screenshots for the owner (DS-006, human review pending)", async ({ page }) => {
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const [name, route] of [["home", ""], ["p05", "#/p05"]] as const) {
    await page.goto(`/${route}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${evidence}/${name}.png` });
    await page.evaluate(() => { document.documentElement.style.filter = "blur(10px)"; }); // CSSOM: the strict CSP blocks injected <style>
    await page.screenshot({ path: `${evidence}/${name}-squint.png` });
  }
});
