import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// A diagram node opens its explanation as a modal the visitor sees, not as a card below the diagram.
test.beforeEach(async ({ page }) => {
  if (process.env.PUBLIC_URL) return;
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "asleep", startAvailable: false, runs: [] }) }));
});

for (const [width, height] of [[1280, 800], [390, 800]] as const) {
  test(`a diagram node opens a centred modal that closes with Escape, the button and the veil, at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/projects/agents/#flow");
    await page.locator("button.palette-open[data-ready]").waitFor();
    const flow = page.locator(".flow").first();
    await flow.scrollIntoViewIfNeeded();
    const node = flow.locator("[data-node]:visible").first();
    await node.scrollIntoViewIfNeeded();
    await node.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    // It is in document.body, not inside the diagram, and nothing is left below the diagram.
    expect(await dialog.evaluate((el) => el.closest(".flow") === null && el.closest(".modal-veil")!.parentElement === document.body)).toBe(true);
    await expect(flow.locator(".flow-detail")).toHaveCount(0);
    // It is fully inside the viewport and centred.
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
    expect(box.y + box.height).toBeLessThanOrEqual(height + 0.5);
    expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(width * 0.1);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(node).toBeFocused();

    await node.focus();
    await page.keyboard.press("Enter");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);

    await node.focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await page.mouse.click(2, 2); // the dimmed veil, outside the card
    await expect(dialog).toHaveCount(0);
  });
}
