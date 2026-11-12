// Capture only: stands the hero at three river spots at noon and saves a frame of each.
// Usage: node scripts/river_capture.mjs [baseUrl] [outDir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'docs/pr-media/rivers';
const VIEWS = [
  { name: 'ford', stand: [120, -2], look: [142, -12] },
  { name: 'falls', stand: [-300, -6], look: [-330, -30] },
  { name: 'mill-bridge', stand: [-160, 60], look: [-178, 40] },
];

const failures = [];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (err) => failures.push(`page error: ${err.message}`));
page.on('requestfailed', (req) => failures.push(`request failed: ${req.url()}`));
page.on('response', (res) => { if (res.status() >= 400) failures.push(`HTTP ${res.status()}: ${res.url()}`); });
mkdirSync(outDir, { recursive: true });
await page.goto(base, { waitUntil: 'load', timeout: 120_000 });
await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 240_000 });
await page.evaluate(() => window.__valley.freeze(true));
await page.evaluate(() => window.__valley.setTod(12));
for (const v of VIEWS) {
  await page.evaluate(([x, z]) => window.__valley.placeAt(x, z), v.stand);
  await page.evaluate(([x, z]) => window.__valley.lookAt(x, z), v.look);
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => window.__valley.state());
  await page.locator('canvas').first().screenshot({ path: join(outDir, `${v.name}.png`) });
  console.log(`captured ${v.name} ${JSON.stringify({ groundY: state.groundY, x: state.x, z: state.z })}`);
}
await browser.close();
if (failures.length) { console.error('FAILURES:\n' + failures.join('\n')); process.exit(1); }
console.log('river capture passed');
