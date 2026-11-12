// Captures the valley (default route) at fixed times of day, and records the valley state for each shot.
// No wall clock plays: the clock is frozen and set by window.__valley.setTod before each frame.
// Usage: node scripts/valley_capture.mjs [baseUrl] [outDir]
//   default baseUrl: http://localhost:4173/   default outDir: docs/pr-media/valley
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'docs/pr-media/valley';
const TIMES = [
  { name: 'arrival-dusk-19', tod: 19 },
  { name: 'noon-12', tod: 12 },
  { name: 'noon-sun-12', tod: 12, aim: 'sun' },
  { name: 'night-0', tod: 0 },
  { name: 'night-moon-2', tod: 2, aim: 'moon' },
  { name: 'dawn-6', tod: 6 },
];

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
await page.goto(base, { waitUntil: 'load', timeout: 120_000 });
await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 240_000 });
await page.evaluate(() => window.__valley.freeze(true));

const report = [];
for (const t of TIMES) {
  await page.evaluate((tod) => window.__valley.setTod(tod), t.tod);
  if (t.aim) await page.evaluate((body) => window.__valley.aimAt(body), t.aim);
  // Let the terrain chunks build and the frame settle.
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => window.__valley.state());
  const file = join(outDir, `${t.name}.png`);
  await page.locator('canvas').first().screenshot({ path: file });
  report.push({ shot: file, ...state });
  console.log(`captured ${file} ${JSON.stringify(state)}`);
}

writeFileSync(join(outDir, 'state.json'), JSON.stringify(report, null, 2));
await browser.close();
if (failures.length) {
  console.error('FAILURES:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('valley capture passed');
