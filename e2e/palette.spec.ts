import { expect, test } from "@playwright/test";

const ready = (page: import("@playwright/test").Page) => page.locator("button.palette-open[data-ready]").waitFor();

test.beforeEach(async ({ page }) => {
  if (process.env.PUBLIC_URL) return;
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "asleep", startAvailable: false, runs: [] }) }));
});

test("the palette opens with / and with Ctrl+K, filters, and Enter goes to the page", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.keyboard.press("/");
  const dialog = page.getByRole("dialog", { name: "Go to" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("combobox")).toBeFocused();
  await page.keyboard.type("evid");
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Evidence");
  await expect(dialog).toBeHidden();
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("typing a slash in a form field does not open the palette", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.keyboard.press("/");
  await page.keyboard.type("a/b");
  await expect(page.getByRole("combobox")).toHaveValue("a/b");
});

test("arrow keys move the selection and the palette reaches a project in Portuguese", async ({ page }) => {
  await page.goto("/pt/");
  await ready(page);
  await page.keyboard.press("/");
  await expect(page.getByRole("dialog", { name: "Ir para" })).toBeVisible();
  await page.keyboard.type("orquestra");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/pt\/projects\/agents\/$/);
});

test("the footer button opens the palette for a mouse user", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search pages" }).click();
  await expect(page.getByRole("dialog", { name: "Go to" })).toBeVisible();
});

test("the home announces the active project when the scroll changes it", async ({ page }) => {
  await page.goto("/");
  const status = page.locator(".metro [role=status]");
  await expect(page.locator("canvas.scene")).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
  await page.locator("#project-supportops").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.getElementById("project-supportops")!.scrollIntoView({ block: "center" }));
  await expect(status).toContainText(/Project 1 of 8/);
  await page.evaluate(() => document.getElementById("project-harness")!.scrollIntoView({ block: "center" }));
  await expect(status).toContainText(/Project 8 of 8/);
});
