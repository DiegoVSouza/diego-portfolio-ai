/* Phase 016 follow-up: each stop with the HTML cards hidden, to read the 3D alone. Usage: node tools/world-direction-nocards.cjs <tag> */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve('artifacts/evidence/world-direction-016', process.argv[2] || 'nocards');
fs.mkdirSync(out, { recursive: true });
const URL = 'http://127.0.0.1:5187/';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('canvas.scene')?.getAttribute('data-train') === 'kenney' && Number(document.querySelector('canvas.scene')?.getAttribute('data-vehicle-kinds')) >= 4, null, { timeout: 60000 });
  await page.addStyleTag({ content: '.hide-cards .stop-card, .hide-cards .districts, .hide-cards .scene-controls, .hide-cards nav, .hide-cards header { visibility: hidden !important; }' });
  await page.waitForTimeout(800);
  for (let k = 0; k < 10; k++) {
    if (k) {
      await page.keyboard.press('j');
      await page.waitForFunction((n) => document.querySelector('canvas.scene')?.getAttribute('data-shown') === String(n), k, { timeout: 15000 });
      await page.waitForFunction(() => !document.documentElement.dataset.flight, null, { timeout: 15000 });
    }
    await page.evaluate(() => document.documentElement.classList.add('hide-cards'));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, `stop-${k}.png`) });
    await page.evaluate(() => document.documentElement.classList.remove('hide-cards'));
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
