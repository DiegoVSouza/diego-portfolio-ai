import { expect, test } from "@playwright/test";

// A hovered link or button keeps its contrast. The bug this guards: a global hover colour (paper) turned footer links paper-on-paper (1.0)
// and paper-on-red (4.06). Contrast is computed from the real computed colours after the hover transition.
test.beforeEach(async ({ page }) => {
  if (process.env.PUBLIC_URL) return;
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "asleep", startAvailable: false, runs: [] }) }));
});

const ratioOf = (el: Element): number => {
  const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
  const lum = ([r = 0, g = 0, b = 0]: number[]) => {
    const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  let node: Element | null = el;
  let bg: number[] = [255, 255, 255];
  while (node) {
    const c = parse(getComputedStyle(node).backgroundColor);
    if ((c[3] ?? 1) > 0.5) { bg = c; break; }
    node = node.parentElement;
  }
  const a = lum(parse(getComputedStyle(el).color));
  const b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

for (const path of ["/", "/projects/agents/"]) {
  test(`hovered links and buttons keep a contrast of 4.5 on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    await page.locator("footer").waitFor();
    const targets = page.locator("footer a, .tldr a, .chapter-head a, .trio a, .langs a, .btn-secondary, main a[href]");
    const count = Math.min(await targets.count(), 40);
    const low: string[] = [];
    for (let i = 0; i < count; i++) {
      const el = targets.nth(i);
      if (!(await el.isVisible())) continue;
      await el.scrollIntoViewIfNeeded();
      await el.hover({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(260);
      const ratio = await el.evaluate(ratioOf);
      if (ratio < 4.5) low.push(`${(await el.textContent())?.trim().slice(0, 24)} ${ratio.toFixed(2)}`);
    }
    expect(low).toEqual([]);
  });
}
