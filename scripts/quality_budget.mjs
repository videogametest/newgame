// Draw calls and fps in the arrival view at each quality level (task 009 step 2c).
// Reads drawCalls only after state().chunks stops rising (Greg's rule). Headless SwiftShader: fps is relative only.
// Usage: node scripts/quality_budget.mjs [baseUrl]   default http://localhost:4173/
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4173/';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];
for (const quality of ['low', 'medium', 'high']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const raw = JSON.stringify({ version: 1, display: { brightness: 1, quality, brightnessSet: true } });
  await page.addInitScript((r) => localStorage.setItem('everylitwindow.settings.v1', r), raw);
  const url = new URL(base);
  url.searchParams.set('tour', '1');
  await page.goto(url.toString(), { waitUntil: 'load', timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 240_000 });
  await page.evaluate(() => window.__valley.freeze(true));
  await page.evaluate(() => window.__valley.hideChrome());
  await page.evaluate(() => window.__valley.tourTo('arrival'));
  await page.evaluate(() => window.__valley.setTod(18));
  let last = -1;
  let stable = 0;
  for (let i = 0; i < 80 && stable < 3; i++) {
    await page.waitForTimeout(3000);
    const chunks = await page.evaluate(() => window.__valley.state().chunks);
    stable = chunks === last ? stable + 1 : 0;
    last = chunks;
  }
  await page.waitForTimeout(2000);
  const s = await page.evaluate(() => window.__valley.state());
  results.push({ quality, chunks: s.chunks, drawCalls: s.drawCalls, fps: s.fps, stable: stable >= 3 });
  console.log(JSON.stringify(results[results.length - 1]));
  await page.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
