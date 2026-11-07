/* Phase 016: screenshots of the real scene at every stop and at mid-flight frames. Output: artifacts/evidence/world-direction-016/<tag>/ */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const tag = process.argv[2] || 'shots';
const out = path.resolve('artifacts/evidence/world-direction-016', tag);
fs.mkdirSync(out, { recursive: true });
const URL = 'http://127.0.0.1:5187/';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(URL, async (route) => {
    const r = await route.fetch();
    await route.fulfill({ response: r, body: (await r.text()).replace('/src/entry-client.tsx', '/src/scene/world-audit-entry.tsx') });
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('canvas.scene')?.getAttribute('data-train') === 'kenney' && Number(document.querySelector('canvas.scene')?.getAttribute('data-vehicle-kinds')) >= 4, null, { timeout: 60000 });
  await page.waitForTimeout(800);
  for (let k = 0; k < 10; k++) {
    if (k) {
      await page.keyboard.press('j');
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(out, `flight-${k - 1}-${k}.png`) });
      await page.waitForFunction((n) => document.querySelector('canvas.scene')?.getAttribute('data-shown') === String(n), k, { timeout: 15000 });
      await page.waitForFunction(() => !document.documentElement.dataset.flight, null, { timeout: 15000 });
    }
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, `stop-${k}.png`) });
  }
  console.log('done', errors.length ? errors : 'no page errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
