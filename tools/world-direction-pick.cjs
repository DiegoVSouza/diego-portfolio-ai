const { chromium } = require('@playwright/test');
const URL='http://127.0.0.1:5187/';
(async()=>{
  const browser=await chromium.launch({channel:'chrome'});
  const page=await (await browser.newContext({viewport:{width:1280,height:800}})).newPage();
  await page.route(URL,async(route)=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('/src/entry-client.tsx','/src/scene/world-audit-entry.tsx')});});
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('canvas.scene')?.getAttribute('data-train')==='kenney'&&Number(document.querySelector('canvas.scene')?.getAttribute('data-vehicle-kinds'))>=4,null,{timeout:60000});
  for(let k=1;k<=3;k++){await page.keyboard.press('j');await page.waitForFunction((n)=>document.querySelector('canvas.scene')?.getAttribute('data-shown')===String(n),k,{timeout:15000});await page.waitForFunction(()=>!document.documentElement.dataset.flight,null,{timeout:15000});}
  await page.waitForTimeout(800);
  for (const [x,y] of [[1200,350],[1190,400],[1210,300],[1240,330]]) console.log(x,y,JSON.stringify(await page.evaluate(([a,b])=>window.__worldPick(a,b),[x,y])));
  await browser.close();
})();
