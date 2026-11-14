// Captures the brightness picture (task 009 step 2c, review 031) at 0.5, 1 and 1.5.
// Each frame loads with brightnessSet false, so the picture opens on its own at Hesper's door at midnight with the
// hero hidden. It waits for the terrain chunks to stop rising, then writes two shots: the canvas alone (the picture)
// and the whole page (the picture with the card).
// Usage: node scripts/brightness_capture.mjs [baseUrl] [outDir] [brightnesses comma-separated]
//   default baseUrl: http://localhost:4173/   default outDir: docs/pr-media/brightness   default values: 0.5,1,1.5
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'docs/pr-media/brightness';
const values = process.argv[4] ? process.argv[4].split(',').map(Number) : [0.5, 1, 1.5];
const CARD_TEXT = 'Move the slider until you can only just see the figure in the yard.';

const failures = [];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
mkdirSync(outDir, { recursive: true });
const report = [];

for (const b of values) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const raw = JSON.stringify({ display: { brightness: b, brightnessSet: false } });
  await page.addInitScript((r) => localStorage.setItem('everylitwindow.settings.v1', r), raw);
  page.on('console', (msg) => { if (msg.type() === 'error') failures.push(`console error: ${msg.text()}`); });
  page.on('pageerror', (err) => failures.push(`page error: ${err.message}`));
  page.on('requestfailed', (req) => failures.push(`request failed: ${req.url()} (${req.failure()?.errorText})`));
  page.on('response', (res) => { if (res.status() >= 400) failures.push(`HTTP ${res.status()}: ${res.url()}`); });

  await page.goto(base, { waitUntil: 'load', timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 240_000 });
  await page.waitForSelector(`text=${CARD_TEXT}`, { timeout: 60_000 });

  // Wait for the terrain chunks to stop rising (two equal readings one second apart).
  let last = -1;
  for (let i = 0; i < 90; i++) {
    const n = await page.evaluate(() => window.__valley.state().chunks);
    if (n === last) break;
    last = n;
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => window.__valley.state());
  const canvasFile = join(outDir, `brightness-${b}-canvas.png`);
  const pageFile = join(outDir, `brightness-${b}-page.png`);
  await page.locator('canvas').first().screenshot({ path: canvasFile });
  await page.screenshot({ path: pageFile });
  report.push({ brightness: b, canvas: canvasFile, page: pageFile, chunks: state.chunks, drawCalls: state.drawCalls });
  console.log(`captured brightness ${b}: ${pageFile} (chunks ${state.chunks}, draw calls ${state.drawCalls})`);
  await page.close();
}

writeFileSync(join(outDir, 'state.json'), JSON.stringify(report, null, 2));
await browser.close();
if (failures.length) {
  console.error(`Capture reported ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
