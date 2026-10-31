import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ids = ["p00", "p01", "p02", "p03", "p04", "p05", "p06"];
const viewports = [{ width: 1280, height: 800 }, { width: 360, height: 740 }];

for (const viewport of viewports) {
  test(`home and every project page pass axe at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const csp: string[] = [];
    page.on("console", (m) => { if (/Content.Security.Policy/i.test(m.text())) csp.push(m.text()); });
    for (const route of ["", ...ids.map((id) => `#/${id}`)]) {
      await page.goto(`/${route}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations.map((v) => `${route || "home"} ${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `${route || "home"} overflows horizontally`).toBe(false);
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
