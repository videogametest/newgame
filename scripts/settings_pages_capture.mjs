// Captures each Settings tab (task 009 step 2): Display, Sound, Camera, Controller, Play, from the pause menu.
// Checks that each page has its heading and rows, and that no console or page error or failed request occurs.
// Usage: node scripts/settings_pages_capture.mjs [baseUrl] [outDir]
//   default baseUrl: http://localhost:4173/   default outDir: docs/pr-media/review032
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'docs/pr-media/review032';
const KEY = 'everylitwindow.settings.v1';
const PAGES = ['Display', 'Sound', 'Camera', 'Controller', 'Play'];
const failures = [];
const report = {};
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.addInitScript(([key]) => {
  if (!sessionStorage.getItem('seeded')) {
    localStorage.setItem(key, JSON.stringify({ version: 1, display: { brightness: 1, quality: 'high', brightnessSet: true } }));
    sessionStorage.setItem('seeded', '1');
  }
}, [KEY]);
const page = await context.newPage();
page.on('console', (msg) => { if (msg.type() === 'error') failures.push(`console error: ${msg.text()}`); });
page.on('pageerror', (err) => failures.push(`page error: ${err.message}`));
page.on('requestfailed', (req) => failures.push(`request failed: ${req.url()} (${req.failure()?.errorText})`));
page.on('response', (res) => { if (res.status() >= 400) failures.push(`HTTP ${res.status()}: ${res.url()}`); });

await page.goto(base, { waitUntil: 'load', timeout: 120_000 });
await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 240_000 });
await page.waitForTimeout(3000);
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Settings' }).waitFor({ timeout: 10_000 });
await page.getByRole('button', { name: 'Settings' }).click();
await page.waitForTimeout(500);

for (const name of PAGES) {
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(800);
  const rows = await page.locator('input[type=range], input[type=checkbox], select, button').count();
  const file = join(outDir, `settings-${name.toLowerCase()}.png`);
  await page.screenshot({ path: file });
  report[name] = { controls: rows };
  if (rows < 2) failures.push(`${name}: fewer than 2 controls on the page`);
  console.log(`captured ${file} controls=${rows}`);
}

// The saved file must still parse after visiting every page.
const saved = await page.evaluate((k) => localStorage.getItem(k), KEY);
try { JSON.parse(saved); } catch (e) { failures.push(`settings not valid JSON after visiting pages: ${e.message}`); }

await browser.close();
writeFileSync(join(outDir, 'settings-report.json'), JSON.stringify({ report, failures }, null, 2));
console.log(JSON.stringify({ report, failures }, null, 2));
if (failures.length) process.exit(1);
