// Captures the brightness picture (review 031): Hesper's yard at midnight, the hero hidden, the clock stopped.
// One frame per brightness: the canvas, and the full page so the card's place shows.
// Usage: node scripts/picture_capture.mjs [baseUrl] [outDir]   default: http://localhost:4173/ docs/pr-media/review031
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'docs/pr-media/review031';
const BRIGHTNESS = [0.5, 1, 1.5];
const failures = [];
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const report = [];
for (const b of BRIGHTNESS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const raw = JSON.stringify({ display: { brightness: b, brightnessSet: true } });
  await page.addInitScript((r) => localStorage.setItem('everylitwindow.settings.v1', r), raw);
  page.on('console', (msg) => { if (msg.type() === 'error') failures.push(`console error: ${msg.text()}`); });
  page.on('pageerror', (err) => failures.push(`page error: ${err.message}`));
  page.on('requestfailed', (req) => failures.push(`request failed: ${req.url()}`));
  page.on('response', (res) => { if (res.status() >= 400) failures.push(`HTTP ${res.status()}: ${res.url()}`); });
  const url = new URL(base);
  url.searchParams.set('tour', '1');
  await page.goto(url.toString(), { waitUntil: 'load', timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 240_000 });
  await page.evaluate(() => window.__valley.freeze(true));
  await page.evaluate(() => window.__valley.openPicture());
  await page.evaluate(() => window.__valley.hideChrome());
  await page.waitForTimeout(6000);
  const state = await page.evaluate(() => window.__valley.state());
  const mask = await page.evaluate(() => window.__valley.groundMask().join(''));
  const canvasFile = join(outDir, `picture-b${b}.png`);
  const pageFile = join(outDir, `picture-b${b}-page.png`);
  await page.locator('canvas').first().screenshot({ path: canvasFile });
  await page.screenshot({ path: pageFile });
  report.push({ view: 'picture', tod: 0, brightness: b, shot: canvasFile, page: pageFile, groundMask: mask, ...state });
  console.log(`captured ${canvasFile} brightness=${b} x=${state.x.toFixed(1)} z=${state.z.toFixed(1)}`);
  await page.close();
}
writeFileSync(join(outDir, 'picture-state.json'), JSON.stringify(report, null, 2));
await browser.close();
if (failures.length) { console.error('FAILURES:\n' + failures.join('\n')); process.exit(1); }
console.log('picture capture passed');
