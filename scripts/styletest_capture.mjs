// Captures the style test (?styletest=1) as PNGs for review. No wall clock plays: each frame is drawn by
// window.__styletestSet({ tod, view }) and then screenshotted.
// Usage: node scripts/styletest_capture.mjs [baseUrl] [outDir]
//   default baseUrl: http://localhost:4173/   default outDir: docs/pr-media/styletest/rework
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'docs/pr-media/styletest/rework';
const ITEM_IDS = ['house-a', 'house-b', 'house-c', 'mill', 'forge', 'well', 'watch', 'scenery'];

const shots = [
  ...[12, 18.7, 23].map((t) => ({ name: `row-front-${t}`, tod: t, view: 'row-front' })),
  { name: 'row-quarter-23', tod: 23, view: 'row-quarter' },
  ...ITEM_IDS.flatMap((id) => [18.7, 23].map((t) => ({ name: `item-${id}-${t}`, tod: t, view: `item:${id}` }))),
  { name: 'people-front-12', tod: 12, view: 'people-front' },
  { name: 'people-quarter-23', tod: 23, view: 'people-quarter' },
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
const url = new URL(base);
url.searchParams.set('styletest', '1');
await page.goto(url.toString(), { waitUntil: 'load', timeout: 120_000 });
await page.waitForFunction(() => window.__styletestReady === true, null, { timeout: 240_000 });

for (const s of shots) {
  await page.evaluate((st) => window.__styletestSet({ tod: st.tod, view: st.view }), s);
  await page.waitForTimeout(150);
  const file = join(outDir, `${s.name}.png`);
  await page.locator('canvas').first().screenshot({ path: file });
  console.log(`captured ${file}`);
}

await browser.close();
if (failures.length) {
  console.error(`Capture finished with ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Captured ${shots.length} frames to ${outDir}`);
