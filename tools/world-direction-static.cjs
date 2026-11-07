/* Phase 016: world snapshots over one train cycle (moving objects with oriented bounds) + static boxes. Dev server on 127.0.0.1:5187. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve('artifacts/evidence/world-direction-016');
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
  await page.waitForFunction(() => document.querySelector('canvas.scene')?.getAttribute('data-scene') === '3d' && Number(document.querySelector('canvas.scene')?.getAttribute('data-vehicle-kinds')) >= 4 && document.querySelector('canvas.scene')?.getAttribute('data-train') === 'kenney' && typeof window.__worldAudit === 'function', null, { timeout: 60000 });
  const first = await page.evaluate(() => window.__worldAudit());
  const MOVING = /^(fleet-|wheels-|metro-)/;
  const slim = (s) => s.objects.filter((o) => MOVING.test(o.name)).map((o) => ({ name: o.name, local: o.localBounds, matrices: o.bounds.map((b) => b.matrix) }));
  const statics = { railLength: first.railLength, poses: first.poses, path: first.path, footprints: first.footprints, boxes: first.boxes, cameraNear: first.cameraNear, cameraFar: first.cameraFar,
    other: first.objects.filter((o) => !MOVING.test(o.name)).map((o) => ({ name: o.name, geometry: o.geometry, count: o.bounds.length, local: o.localBounds, bounds: o.bounds.length <= 3 ? o.bounds.map((b) => ({ min: b.min, max: b.max })) : undefined })) };
  const samples = [];
  // 30 snapshots, 2.1 s apart: more than one 60 s train cycle, and traffic well past its own period.
  for (let i = 0; i < 30; i++) {
    const s = await page.evaluate(() => ({ t: performance.now(), snap: window.__worldAudit() }));
    samples.push({ t: s.t, moving: slim(s.snap) });
    await page.waitForTimeout(2100);
  }
  fs.writeFileSync(path.join(out, 'world-static.json'), JSON.stringify(statics));
  fs.writeFileSync(path.join(out, 'world-moving.json'), JSON.stringify({ samples, errors }));
  console.log('boxes', statics.boxes.length, 'samples', samples.length, 'errors', errors.length);
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
