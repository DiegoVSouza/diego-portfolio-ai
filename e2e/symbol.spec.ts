import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const slugs = ["supportops", "foundation", "agents", "toolkit", "observability", "async", "design-system", "harness"];

test.beforeEach(async ({ page }) => {
  if (process.env.PUBLIC_URL) return;
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "asleep", startAvailable: false, runs: [] }) }));
});

for (const [width, height, minSize] of [[1280, 800, 120], [390, 800, 56]] as const) {
  test(`each case page shows its project symbol, clear of the title, at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const slug of slugs) {
      await page.goto(`/projects/${slug}/`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const symbol = page.locator(`.case-symbol[data-symbol="${slug}"]`);
      await expect(symbol, slug).toBeVisible();
      await expect(symbol.locator("svg")).toHaveCount(1);
      const s = (await symbol.boundingBox())!;
      expect(s.width, slug).toBeGreaterThanOrEqual(minSize);
      // The heading box spans the column and text wraps around the float, so compare the symbol with the lines of text, not the box.
      const overlap = await page.evaluate((sym) => {
        const range = document.createRange();
        range.selectNodeContents(document.querySelector("h1")!);
        return [...range.getClientRects()].some((t) => t.width > 0 && t.left < sym.x + sym.width && t.right > sym.x && t.top < sym.y + sym.height && t.bottom > sym.y);
      }, s);
      expect(overlap, `${slug}: the symbol overlaps the title text`).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${slug} overflows`).toBe(true);
    }
  });
}

test("the symbol is decorative: hidden from assistive technology and free of axe violations", async ({ page }) => {
  await page.goto("/projects/agents/");
  await expect(page.locator(".case-symbol")).toHaveAttribute("aria-hidden", "true");
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
});
