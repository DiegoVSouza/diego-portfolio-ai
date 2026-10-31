// Renders public/og.png (1200x630) in real Chrome from the design tokens and the Anton font. Run when the headline changes.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const tokens = readFileSync(join(root, "node_modules/colagem-ui/src/tokens.css"), "utf8");
const token = (name) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)?.[1];
const [ink, paper, red, mut] = ["ink", "paper", "red", "mut"].map(token);
const font = pathToFileURL(join(root, "node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2")).href;

const html = `<!doctype html><style>
@font-face { font-family: Anton; src: url("${font}"); }
body { margin: 0; width: 1200px; height: 630px; background: ${ink}; color: ${paper}; font-family: Anton, Impact, sans-serif; position: relative; overflow: hidden; }
.bar { position: absolute; left: 0; top: 0; bottom: 0; width: 28px; background: ${red}; }
.slab { position: absolute; left: 60px; top: 150px; width: 520px; height: 230px; background: ${red}; transform: skewX(-18deg) rotate(-2deg); }
h1 { position: absolute; left: 84px; top: 96px; margin: 0; font-weight: 400; font-size: 118px; line-height: 1.02; text-transform: uppercase; max-width: 1040px; }
p { position: absolute; left: 88px; bottom: 70px; margin: 0; font-size: 36px; letter-spacing: .06em; text-transform: uppercase; color: ${mut}; }
</style><div class="bar"></div><div class="slab"></div><h1>AI Engineer building agents you can verify</h1><p>Diego Souza · live demo · evidence · code</p>`;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(async () => {
  // eslint-disable-next-line no-undef
  await document.fonts.ready;
});
writeFileSync(join(root, "public/og.png"), await page.screenshot({ type: "png" }));
await browser.close();
console.log("og: public/og.png written");
