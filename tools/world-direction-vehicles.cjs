/* Phase 016 follow-up: one close shot of every vehicle kind (frozen in place). Usage: node tools/world-direction-vehicles.cjs <tag>
   Reads each fleet mesh's first instance from __worldAudit, parks the free camera 13 units to the side and 6 up, and shoots. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve('artifacts/evidence/world-direction-016', process.argv[2]);
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
  await page.waitForFunction(() => Number(document.querySelector('canvas.scene')?.getAttribute('data-vehicle-kinds')) >= 4, null, { timeout: 60000 });
  await page.addStyleTag({ content: '.hide-cards .stop-card, .hide-cards .districts, .hide-cards .scene-controls, .hide-cards nav, .hide-cards header { visibility: hidden !important; }' });
  const kinds = await page.evaluate(() => window.__worldAudit().objects.filter((o) => /^metro-station|metro-head/.test(o.name)).map((o) => ({ name: o.name, geometry: o.localBounds, first: o.bounds[0] })));
  fs.writeFileSync(path.join(out, 'vehicles.json'), JSON.stringify(kinds, null, 1));
  for (const k of kinds) {
    // The free camera follows the first instance every 25 ms, so the car stays in frame while the traffic runs.
    await page.evaluate(({ name, dx, dy, dz }) => {
      document.documentElement.classList.add('hide-cards');
      clearInterval(window.__follow);
      window.__follow = setInterval(() => {
        const o = window.__worldAudit().objects.find((x) => x.name === name);
        const f = o.bounds[0];
        const c = [0, 1, 2].map((a) => (f.min[a] + f.max[a]) / 2);
        window.__freeCam = { pos: [c[0] + dx, c[1] + dy, c[2] + dz], look: c, fov: 40 };
      }, 25);
    }, { name: k.name, dx: +(process.env.DX ?? 11), dy: +(process.env.DY ?? 4), dz: +(process.env.DZ ?? 8) });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(out, `${k.name}.png`) });
    console.log('shot', k.name);
  }
  console.log(errors.length ? errors : 'no page errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
