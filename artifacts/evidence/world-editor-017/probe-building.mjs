import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "msedge", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
await page.goto("http://localhost:5199/atelier.html");
await page.waitForTimeout(3000);
for (const name of ["building-large.glb", "building-small.glb"]) {
  await page.selectOption("#pick", { label: name });
  await page.waitForTimeout(1500);
  console.log(name, (await page.textContent("#info")).replace(/\n/g, " | "), await page.textContent("#problems"));
  await page.screenshot({ path: `artifacts/evidence/world-editor-017/viewer-${name}.png` });
}
await page.click('[data-mode="palette"]'); await page.waitForTimeout(800);
await page.screenshot({ path: "artifacts/evidence/world-editor-017/viewer-palette.png" });
await browser.close();
