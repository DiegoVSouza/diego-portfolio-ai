import { expect, test } from "@playwright/test";

// The fixed menu (home), the metro line (case pages) and the scene buttons sit over the page edges. At the end of the page no footer text may run under them.
test.beforeEach(async ({ page }) => {
  if (process.env.PUBLIC_URL) return;
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "asleep", startAvailable: false, runs: [] }) }));
});

for (const path of ["/", "/projects/toolkit/"]) {
  test(`footer text clears the fixed menu and buttons at the end of ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(path);
    await page.locator("canvas.scene[data-scene='3d']").waitFor({ timeout: 20_000 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY + window.innerHeight)), { timeout: 10_000 }).toBeGreaterThanOrEqual(await page.evaluate(() => document.documentElement.scrollHeight) - 2);
    const overlaps = await page.evaluate(() => {
      const fixed = [".districts", ".metro", ".scene-controls"]
        .map((s) => document.querySelector(s))
        .filter((el): el is Element => Boolean(el))
        .flatMap((el) => [...el.querySelectorAll("li, a, button, p, ul")].map((c) => ({ name: (el.className || el.tagName).toString().split(" ")[0], r: c.getBoundingClientRect() })))
        .filter((x) => x.r.width > 0 && x.r.height > 0);
      const out: string[] = [];
      for (const p of document.querySelectorAll<HTMLElement>("footer p")) {
        const range = document.createRange();
        range.selectNodeContents(p);
        for (const t of range.getClientRects()) {
          if (t.width === 0) continue;
          for (const f of fixed) {
            const hit = t.left < f.r.right && t.right > f.r.left && t.top < f.r.bottom && t.bottom > f.r.top;
            if (hit) out.push(`${(p.textContent ?? "").slice(0, 30)} under ${f.name}`);
          }
        }
      }
      return [...new Set(out)];
    });
    expect(overlaps).toEqual([]);
  });
}
