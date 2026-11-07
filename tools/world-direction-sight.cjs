/* Phase 016 follow-up: for every stop, does anything stand between the camera and its board? Prints blockers per stop; saves sight.json. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const URL = 'http://127.0.0.1:5187/';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.route(URL, async (route) => {
    const r = await route.fetch();
    await route.fulfill({ response: r, body: (await r.text()).replace('/src/entry-client.tsx', '/src/scene/world-audit-entry.tsx') });
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('canvas.scene')?.getAttribute('data-train') === 'kenney' && Number(document.querySelector('canvas.scene')?.getAttribute('data-vehicle-kinds')) >= 4, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  const report = await page.evaluate(() => window.__worldSight());
  fs.writeFileSync(path.resolve('artifacts/evidence/world-direction-016/sight.json'), JSON.stringify(report, null, 1));
  for (const r of report) console.log('stop', r.stop, r.blocked.length ? r.blocked.map((b) => `${b.point}:${b.by}@${b.at}/${b.of}`).join(' ') : 'clear');
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
