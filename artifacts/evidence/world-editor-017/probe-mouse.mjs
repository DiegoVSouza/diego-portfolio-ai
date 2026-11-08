import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "msedge", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
await page.goto("http://localhost:5199/atelier.html");
await page.click("#tab-world");
await page.waitForFunction(() => document.querySelector("#world-status")?.textContent?.startsWith("ready"), null, { timeout: 120000 });
await page.waitForTimeout(1500);
const cam = () => page.evaluate(() => document.querySelector("#world").contentWindow.__freeCam.pos.map((v) => Math.round(v)));
const out = { start: await cam() };
await page.mouse.move(900, 450); await page.mouse.down(); await page.mouse.move(1100, 380, { steps: 10 }); await page.mouse.up();
await page.waitForTimeout(500);
out.afterDrag = await cam();
await page.mouse.move(900, 450); await page.mouse.wheel(0, -600);
await page.waitForTimeout(500);
out.afterWheel = await cam();
// click on a proxy: project the first tower to screen
out.picked = await page.evaluate(async () => {
  const w = document.querySelector("#world").contentWindow; const e = w.__worldEditor; e.select("tower", "t0.3"); e.focus(); e.select("tower", null); return e.selected();
});
await page.waitForTimeout(1200);
await page.mouse.click(920, 450);
await page.waitForTimeout(500);
out.afterClick = await page.textContent("#world-sel");
await page.screenshot({ path: "artifacts/evidence/world-editor-017/mouse.png" });
console.log(JSON.stringify(out));
await browser.close();
