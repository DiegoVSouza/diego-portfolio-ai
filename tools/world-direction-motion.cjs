/* Phase 016: frame-by-frame camera sampling for the real scene (dev server on 127.0.0.1:5187). Writes only to world-direction-016. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const out = path.resolve('artifacts/evidence/world-direction-016');
fs.mkdirSync(out, { recursive: true });
const URL = 'http://127.0.0.1:5187/';

async function open(browser, reducedMotion) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(URL, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace('/src/entry-client.tsx', '/src/scene/world-audit-entry.tsx');
    await route.fulfill({ response, body });
  });
  log('goto');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  log('loaded');
  await page.locator('canvas.scene').waitFor();
  await page.waitForFunction(() => (document.querySelector('canvas.scene')?.getAttribute('data-scene') ?? '').startsWith('3d') && Number(document.querySelector('canvas.scene')?.getAttribute('data-vehicle-kinds')) >= 4 && typeof window.__worldProbe === 'function', null, { timeout: 40000 });
  await page.evaluate(() => {
    window.__frames = [];
    window.__rec = false;
    const loop = () => { if (window.__rec) window.__frames.push(window.__worldProbe()); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  return { context, page, errors };
}
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const start = (page, label) => (log('start', label), page).evaluate((l) => { window.__frames = []; window.__label = l; window.__rec = true; }, label);
const stop = async (page) => { const f = await page.evaluate(() => { window.__rec = false; return window.__frames; }); log('  frames', f.length); return f; };
const settled = (page) => page.waitForFunction(() => !document.documentElement.dataset.flight, null, { timeout: 15000 });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const runs = {};
  // Full-motion context.
  {
    const { context, page, errors } = await open(browser, false);
    const shownIs = (n) => page.waitForFunction((v) => document.querySelector('canvas.scene')?.getAttribute('data-shown') === String(v), n, { timeout: 15000 });
    // Forward, one stop at a time.
    for (let k = 0; k < 9; k++) {
      await start(page, `fwd-${k}-${k + 1}`);
      await page.keyboard.press('j');
      await shownIs(k + 1); await settled(page); await page.waitForTimeout(500);
      runs[`fwd-${k}-${k + 1}`] = await stop(page);
    }
    // Backward.
    for (let k = 9; k > 0; k--) {
      await start(page, `back-${k}-${k - 1}`);
      await page.keyboard.press('k');
      await shownIs(k - 1); await settled(page); await page.waitForTimeout(500);
      runs[`back-${k}-${k - 1}`] = await stop(page);
    }
    // Menu: long jumps (cut) to district 4, then 5, then back to 0.
    for (const [name, li] of [['menu-0-4', 4], ['menu-4-5', 5], ['menu-5-0', 0]]) {
      await start(page, name);
      await page.locator('.districts-list > li').nth(li).locator('> a').click();
      await page.waitForTimeout(2500);
      runs[name] = await stop(page);
    }
    // Manual wheel scrolling down through the whole page, then back up.
    await start(page, 'wheel-down');
    for (let i = 0; i < 160; i++) { await page.mouse.wheel(0, 140); await page.waitForTimeout(40); }
    await page.waitForTimeout(1500);
    runs['wheel-down'] = await stop(page);
    await start(page, 'wheel-up');
    for (let i = 0; i < 160; i++) { await page.mouse.wheel(0, -140); await page.waitForTimeout(40); }
    await page.waitForTimeout(1500);
    runs['wheel-up'] = await stop(page);
    // Keyboard: arrow down (slides layout) then page down.
    await start(page, 'arrow-down');
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(2500);
    runs['arrow-down'] = await stop(page);
    // Solid check for every camera sample, once.
    const all = Object.values(runs).flat();
    const pts = all.map((f) => f.pos);
    const inside = [];
    for (let i = 0; i < pts.length; i += 400) inside.push(...await page.evaluate((p) => window.__worldInside(p), pts.slice(i, i + 400)));
    const flagged = inside.filter((x) => x.inside);
    const insideBy = {};
    for (const x of flagged) insideBy[x.by] = (insideBy[x.by] || 0) + 1;
    runs.__inside = { insideBy, insideMinNearest: flagged.length ? Math.min(...flagged.map((x) => x.nearest)) : null, frames: all.length, checked: inside.length, insideCount: inside.filter((x) => x.inside).length, nearest: Math.min(...inside.map((x) => x.nearest)), samples: inside.map((x, i) => ({ ...x, i })).filter((x) => x.inside || x.nearest < 1.5).slice(0, 80).map((x) => ({ ...x, pos: pts[x.i], label: Object.keys(runs).find((key) => key !== '__inside' && runs[key].includes(all[x.i])) })) };
    runs.__errors = errors;
    await context.close();
    fs.writeFileSync(path.join(out, 'motion-frames.json'), JSON.stringify(runs));
  }
  // Reduced motion.
  {
    const { context, page, errors } = await open(browser, true);
    for (let k = 0; k < 4; k++) {
      await start(page, `reduced-${k}`);
      await page.keyboard.press('j');
      await page.waitForTimeout(1800);
      runs[`reduced-${k}-${k + 1}`] = await stop(page);
    }
    runs.__reducedState = await page.evaluate(() => ({ stage: document.documentElement.dataset.stage, shown: document.querySelector('canvas.scene')?.getAttribute('data-shown'), probe: window.__worldProbe() }));
    runs.__reducedErrors = errors;
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'motion-frames.json'), JSON.stringify(runs));
  console.log('runs', Object.keys(runs).length);
})().catch((e) => { console.error(e); process.exitCode = 1; });
