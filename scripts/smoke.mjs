// Smoke test: loads the built game, starts a battle, and fails on any console error, page error, or failed request.
// Usage: node scripts/smoke.mjs [baseUrl]   (default: the vite preview server on http://localhost:4173/)
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4173/';
const failures = [];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

page.on('console', (msg) => {
  if (msg.type() === 'error') failures.push(`console error: ${msg.text()}`);
});
page.on('pageerror', (err) => failures.push(`page error: ${err.message}`));
page.on('requestfailed', (req) => failures.push(`request failed: ${req.url()} (${req.failure()?.errorText})`));
page.on('response', (res) => {
  if (res.status() >= 400) failures.push(`HTTP ${res.status()}: ${res.url()}`);
});

await page.goto(base, { waitUntil: 'load', timeout: 120_000 });
// Wait for the boot overlay to finish loading assets.
await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, { timeout: 180_000 }).catch(() => {});
// The first click starts audio and asks for pointer lock; the battle then runs.
await page.click('canvas', { timeout: 60_000 });
await page.waitForTimeout(5000);

const hasCanvas = await page.$('canvas');
if (!hasCanvas) failures.push('no canvas on the page');

await browser.close();

if (failures.length) {
  console.error(`Smoke test FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Smoke test passed: ${base}`);
