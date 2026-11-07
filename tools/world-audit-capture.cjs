const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const out = path.resolve('artifacts/evidence/world-audit-015');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Vite's empty development root is intentionally mounted as a client-only audit, not hydrated.
  await page.route('http://127.0.0.1:5187/', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace('/src/entry-client.tsx', '/src/scene/world-audit-entry.tsx');
    await route.fulfill({ response, body });
  });
  await page.goto('http://127.0.0.1:5187/', { waitUntil: 'networkidle' });
  const canvas = page.locator('canvas.scene');
  await canvas.waitFor();
  await page.waitForFunction(() => document.querySelector('canvas.scene')?.getAttribute('data-scene') === '3d' && Number(document.querySelector('canvas.scene')?.getAttribute('data-vehicle-kinds')) >= 4 && typeof window.__worldAudit === 'function', null, { timeout: 30000 });
  const stops = [];
  for (let k = 0; k < 10; k++) {
    if (k) {
      await page.keyboard.press('j');
      if (k === 2 || k === 7) {
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(out, `flight-${k}-early.png`) });
        await page.waitForTimeout(450);
        await page.screenshot({ path: path.join(out, `flight-${k}-middle.png`) });
      }
      await page.waitForFunction((n) => document.querySelector('canvas.scene')?.getAttribute('data-shown') === String(n), k, { timeout: 15000 });
      await page.waitForFunction(() => !document.documentElement.dataset.flight, null, { timeout: 15000 });
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `stop-${k}.png`) });
    const snapshot = await page.evaluate(() => window.__worldAudit());
    const face = snapshot.objects.find((object) => object.name === `board-face-${k}`);
    if (!face || face.visible) throw new Error(`painted face remained visible under card ${k}`);
    if (snapshot.objects.some((object) => object.name.endsWith('-light-cones') && (object.layers & 2))) {
      throw new Error('floodlight cones are rendered over the HTML card');
    }
    fs.writeFileSync(path.join(out, `world-${k}.json`), JSON.stringify(snapshot, null, 2));
    stops.push({ stop: k, camera: snapshot.camera, meshes: snapshot.objects.length });
    console.log('captured stop', k);
  }
  fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify({ stops, errors }, null, 2));
  await browser.close();
  if (errors.length) throw new Error(errors.join('\n'));
})().catch((e) => { console.error(e); process.exitCode = 1; });
