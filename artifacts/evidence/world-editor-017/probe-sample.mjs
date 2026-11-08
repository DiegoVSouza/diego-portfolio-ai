import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "msedge", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1300, height: 800 } });
await page.goto("http://localhost:5199/atelier.html");
await page.waitForTimeout(3000);
for (const name of ["building-sample-013.glb", "building-large.glb"]) {
  await page.selectOption("#pick", { label: name });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `artifacts/evidence/world-editor-017/viewer-${name}.png`, clip: { x: 340, y: 0, width: 960, height: 800 } });
}
await browser.close();
