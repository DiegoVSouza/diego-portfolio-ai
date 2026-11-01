import { chromium } from "file:///C:/estudo/Golpe/lab/projects/p07/node_modules/@playwright/test/index.mjs";

const url = process.argv[2] ?? "https://diego-portfolio-ai.pages.dev/";
const browser = await chromium.launch({ channel: "msedge", headless: false, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--disable-frame-rate-limit", "--disable-gpu-vsync"] });

async function run(label, { width, height, dpr, cpu }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  if (cpu > 1) await client.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  await page.route("**/api/**", (r) => r.fulfill({ json: { state: "asleep", startAvailable: false, runs: [] } }));
  await page.goto(url, { waitUntil: "networkidle" });
  const canvas = page.locator("canvas.scene[data-scene='3d']");
  await canvas.waitFor({ timeout: 40000 });
  const gpu = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
  await page.waitForTimeout(2500);
  // Count every animation frame while the page is scrolled through all ten stops, a wheel notch at a time (what a person does).
  await page.evaluate(() => {
    window.__frames = [];
    window.__long = [];
    let last = performance.now();
    const tick = (t) => { window.__frames.push(t - last); last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ entryTypes: ["longtask"] });
  });
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const steps = Math.ceil(total / 100);
  for (let i = 0; i < steps; i += 1) { await page.mouse.wheel(0, 100); await page.waitForTimeout(16); }
  await page.waitForTimeout(1200);
  for (let i = 0; i < steps; i += 1) { await page.mouse.wheel(0, -100); await page.waitForTimeout(16); }
  await page.waitForTimeout(800);
  const result = await page.evaluate(() => {
    const f = window.__frames.slice(5).sort((a, b) => a - b);
    const q = (p) => f[Math.min(f.length - 1, Math.floor(f.length * p))];
    const c = document.querySelector("canvas.scene");
    return { frames: f.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: f[f.length - 1], over33: f.filter((x) => x > 33.4).length, over50: f.filter((x) => x > 50).length, fpsMean: 1000 / (f.reduce((s, x) => s + x, 0) / f.length), longTasks: window.__long.length, longMax: Math.max(0, ...window.__long), cpuMs: c.dataset.cpuMs, quality: c.dataset.quality ?? "1 (never lowered)", draws: c.dataset.draws };
  });
  const r = (x) => (typeof x === "number" ? Math.round(x * 10) / 10 : x);
  console.log(label, "|", gpu.slice(0, 70));
  console.log("   ", JSON.stringify(Object.fromEntries(Object.entries(result).map(([k, v]) => [k, r(v)]))));
  await context.close();
}

await run("desktop 1440x900 dpr1", { width: 1440, height: 900, dpr: 1, cpu: 1 });
await run("desktop 1920x1080 dpr1.5", { width: 1920, height: 1080, dpr: 1.5, cpu: 1 });
await run("desktop 1440x900 dpr1, CPU 4x slower", { width: 1440, height: 900, dpr: 1, cpu: 4 });
await run("laptop 1366x768 dpr2, CPU 6x slower", { width: 1366, height: 768, dpr: 2, cpu: 6 });
await browser.close();
