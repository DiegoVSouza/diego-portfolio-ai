import { expect, test } from "@playwright/test";

const ready = (page: import("@playwright/test").Page) => page.locator("button.palette-open[data-ready]").waitFor();

test.beforeEach(async ({ page }) => {
  if (process.env.PUBLIC_URL) return;
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "asleep", startAvailable: false, runs: [] }) }));
});

/**
 * FLOW success criterion 1: from the home page, using only the primary action, a visitor reaches Contact after the three
 * stops of every project, without opening a menu.
 */
for (const lang of ["en", "pt"] as const) {
  test(`the trail walks from the home page through 8 projects to contact (${lang})`, async ({ page }) => {
    const labels =
      lang === "en"
        ? { start: "Start the tour", flow: "Next: the interactive flow", readme: "Next: the README, explained", nextProject: /^Next project: /, contact: "Last stop: contact" }
        : { start: "Começar o tour", flow: "Próximo: o fluxo interativo", readme: "Próximo: o README, explicado", nextProject: /^Próximo projeto: /, contact: "Última parada: contato" };
    await page.goto(lang === "en" ? "/" : "/pt/");
    await ready(page);
    await page.getByRole("main").getByRole("link", { name: labels.start }).click();
    const visited: string[] = [];
    for (let project = 1; project <= 8; project += 1) {
      await expect(page).toHaveURL(/\/projects\/[a-z-]+\/#demo$|\/projects\/[a-z-]+\/$/);
      visited.push(new URL(page.url()).pathname);
      await expect(page.getByRole("navigation", { name: lang === "en" ? "Stops of this project" : "Paradas deste projeto" })).toContainText(lang === "en" ? `Project ${project} of 8` : `Projeto ${project} de 8`);
      await page.getByRole("link", { name: labels.flow }).click();
      await expect(page).toHaveURL(/#flow$/);
      await page.getByRole("link", { name: labels.readme }).click();
      await expect(page).toHaveURL(/#readme$/);
      if (project < 8) await page.getByRole("link", { name: labels.nextProject }).click();
      else await page.getByRole("link", { name: labels.contact }).click();
    }
    expect(new Set(visited).size).toBe(8);
    await expect(page.getByRole("heading", { level: 2, name: lang === "en" ? "Contact" : "Contato" })).toBeVisible();
  });
}
