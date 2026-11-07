/* Phase 016: free-camera views of the real scene. Usage: node tools/world-direction-view.cjs <tag> <views.json>
   views.json: [{ "name": "station", "pos": [x,y,z], "look": [x,y,z], "fov": 50, "stop": 5, "wait": 400, "cards": false }]
   `stop` jumps the page to that stop first (so the scene time/state match); `cards: false` hides the HTML cards. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const [tag, file] = [process.argv[2], process.argv[3]];
const views = JSON.parse(fs.readFileSync(file, 'utf8'));
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
  await page.addStyleTag({ content: '.hide-cards .stop-card, .hide-cards .districts, .hide-cards .scene-controls, .hide-cards nav, .hide-cards header { visibility: hidden !important; }' });
  for (const v of views) {
    await page.evaluate((view) => {
      document.documentElement.classList.toggle('hide-cards', view.cards === false);
      window.__freeCam = { pos: view.pos, look: view.look, fov: view.fov ?? 58 };
    }, v);
    await page.waitForTimeout(v.wait ?? 500);
    await page.screenshot({ path: path.join(out, `${v.name}.png`) });
    console.log('shot', v.name);
  }
  console.log(errors.length ? errors : 'no page errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
