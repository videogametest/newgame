// Captures every tour view (?tour=1, src/core/world/tour.ts) at 18:00 and 12:00, one frame per view and time.
// The clock is frozen and set by window.__valley before each frame; nothing plays in real time.
// Each shot also records the ground share (sampled screen points that are not sky) in state.json.
// Usage: node scripts/tour_capture.mjs [baseUrl] [outDir] [viewNames comma-separated] [tods comma-separated]
//   default baseUrl: http://localhost:4173/   default outDir: docs/pr-media/tour
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'docs/pr-media/tour';
const only = process.argv[4] ? process.argv[4].split(',') : null;
const TODS = process.argv[5] ? process.argv[5].split(',').map(Number) : [18, 12];

const failures = [];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (msg) => { if (msg.type() === 'error') failures.push(`console error: ${msg.text()}`); });
page.on('pageerror', (err) => failures.push(`page error: ${err.message}`));
page.on('requestfailed', (req) => failures.push(`request failed: ${req.url()} (${req.failure()?.errorText})`));
page.on('response', (res) => { if (res.status() >= 400) failures.push(`HTTP ${res.status()}: ${res.url()}`); });

mkdirSync(outDir, { recursive: true });
const url = new URL(base);
url.searchParams.set('tour', '1');
await page.goto(url.toString(), { waitUntil: 'load', timeout: 120_000 });
await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 240_000 });
await page.evaluate(() => window.__valley.freeze(true));

const names = await page.evaluate(() => window.__valley.tourNames());
const views = only ? names.filter((n) => only.includes(n)) : names;
const report = [];
for (const name of views) {
  const placed = await page.evaluate((n) => window.__valley.tourTo(n), name);
  if (!placed) throw new Error(`tour view not found: ${name}`);
  for (const tod of TODS) {
    await page.evaluate((h) => window.__valley.setTod(h), tod);
    // Let the terrain chunks build and the frame settle.
    await page.waitForTimeout(4000);
    const state = await page.evaluate(() => window.__valley.state());
    const share = await page.evaluate(() => window.__valley.groundShare());
    const file = join(outDir, `${name}-${tod}.png`);
    await page.locator('canvas').first().screenshot({ path: file });
    report.push({ view: name, tod, shot: file, groundShare: Number(share.toFixed(3)), ...state });
    console.log(`captured ${file} ground=${share.toFixed(3)} x=${state.x.toFixed(1)} z=${state.z.toFixed(1)}`);
  }
}

writeFileSync(join(outDir, 'state.json'), JSON.stringify(report, null, 2));
await browser.close();
if (failures.length) {
  console.error('FAILURES:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('tour capture passed');
