/* Phase 016: WebGL x HTML card relation at every stop: light cones not on the card layer, one near card, hit-test of its controls, traffic canvas inert. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve('artifacts/evidence/world-direction-016');
const URL = 'http://127.0.0.1:5187/';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.route(URL, async (route) => { const r = await route.fetch(); await route.fulfill({ response: r, body: (await r.text()).replace('/src/entry-client.tsx', '/src/scene/world-audit-entry.tsx') }); });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.__worldAudit === 'function' && Number(document.querySelector('canvas.scene')?.getAttribute('data-vehicle-kinds')) >= 4, null, { timeout: 60000 });
  const rows = [];
  for (let k = 0; k < 10; k++) {
    if (k) {
      await page.keyboard.press('j');
      await page.waitForFunction((n) => document.querySelector('canvas.scene')?.getAttribute('data-shown') === String(n), k, { timeout: 15000 });
      await page.waitForFunction(() => !document.documentElement.dataset.flight, null, { timeout: 15000 });
    }
    await page.waitForTimeout(500);
    const r = await page.evaluate((stop) => {
      const snap = window.__worldAudit();
      const cones = snap.objects.filter((o) => o.name.endsWith('-light-cones'));
      const face = snap.objects.find((o) => o.name === `board-face-${stop}`);
      const near = [...document.querySelectorAll('.stop-card[data-near="1"]')];
      const card = near[0];
      let hit = null;
      if (card) {
        const targets = [...card.querySelectorAll('a, button')];
        hit = targets.map((el) => {
          const b = el.getBoundingClientRect();
          const x = b.left + b.width / 2, y = b.top + b.height / 2;
          const top = document.elementFromPoint(x, y);
          return { text: (el.textContent || '').trim().slice(0, 24), inside: x > 0 && x < innerWidth && y > 0 && y < innerHeight, reaches: !!top && (top === el || el.contains(top)) };
        });
      }
      const traffic = document.querySelector('canvas.scene-traffic');
      return { stop, conesOnCardLayer: cones.filter((o) => o.layers & 2).length, cones: cones.length, paintedFaceVisible: face ? face.visible : null, nearCards: near.length, controls: hit, trafficPointerEvents: traffic ? getComputedStyle(traffic).pointerEvents : null, trafficVisibility: traffic ? traffic.style.visibility : null };
    }, k);
    rows.push(r);
    console.log(JSON.stringify(r));
  }
  fs.writeFileSync(path.join(out, 'cards-check.json'), JSON.stringify(rows, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
