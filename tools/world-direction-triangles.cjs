/* Phase 016 follow-up: dump every mesh's world-space triangles (instanced meshes skipped unless INSTANCED=1) to
   artifacts/evidence/world-direction-016/triangles/<id>.json plus index.json. Dev server on 127.0.0.1:5187. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve('artifacts/evidence/world-direction-016/triangles');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
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
  await page.waitForTimeout(1500);
  const list = await page.evaluate((skip) => window.__worldTriangles(skip), !process.env.INSTANCED);
  const index = [];
  for (const m of list) {
    fs.writeFileSync(path.join(out, `${m.id}.json`), JSON.stringify(m));
    index.push({ id: m.id, name: m.name, parent: m.parent, instance: m.instance, verts: m.positions.length / 3, tris: (m.index ? m.index.length : m.positions.length / 3) / 3 });
  }
  fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(index));
  console.log('meshes', index.length, 'triangles', index.reduce((a, b) => a + b.tris, 0));
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
