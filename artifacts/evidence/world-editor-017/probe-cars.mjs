import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "msedge", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1300, height: 800 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:5199/atelier.html");
await page.waitForTimeout(3000);
for (const name of ["car-r7.glb", "car-s64.glb"]) {
  await page.selectOption("#pick", { label: name });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `artifacts/evidence/world-editor-017/${name}.png`, clip: { x: 340, y: 0, width: 960, height: 800 } });
}
console.log("errors", errors);
await browser.close();
