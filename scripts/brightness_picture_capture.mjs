// Captures the brightness picture (review 031): the hesper_door view at midnight with the card along the bottom.
// Phase 1 (first start): frames at brightness 0.5, 1 and 1.5, then "That's right." saves brightnessSet.
// Phase 2 (Display): from play, Esc -> Settings -> "Set brightness again". The baseline is read from play
// before the picture opens, so the restore check compares against the real state. Closing must return the
// clock, hero and camera, and the pause menu must come back on Settings.
// Usage: node scripts/brightness_picture_capture.mjs [baseUrl] [outDir]
//   default baseUrl: http://localhost:4173/   default outDir: docs/pr-media/review031
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'docs/pr-media/review031';
const KEY = 'everylitwindow.settings.v1';
const failures = [];
const report = {};
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});

async function newPage(brightnessSet) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(([key, set]) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(key, JSON.stringify({ version: 1, display: { brightness: 1, quality: 'high', brightnessSet: set } }));
      sessionStorage.setItem('seeded', '1');
    }
  }, [KEY, brightnessSet]);
  const page = await context.newPage();
  page.on('console', (msg) => { if (msg.type() === 'error') failures.push(`console error: ${msg.text()}`); });
  page.on('pageerror', (err) => failures.push(`page error: ${err.message}`));
  page.on('requestfailed', (req) => failures.push(`request failed: ${req.url()} (${req.failure()?.errorText})`));
  page.on('response', (res) => { if (res.status() >= 400) failures.push(`HTTP ${res.status()}: ${res.url()}`); });
  await page.goto(base, { waitUntil: 'load', timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 240_000 });
  return page;
}

const slider = (page) => page.locator('input[type=range]:visible').first();
async function setBrightness(page, b) {
  await slider(page).evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, b);
  await page.waitForTimeout(2500);
}
async function frames(page, prefix) {
  for (const b of [0.5, 1, 1.5]) {
    await setBrightness(page, b);
    const file = join(outDir, `${prefix}-${b}.png`);
    await page.screenshot({ path: file });
    const s = await page.evaluate(() => window.__valley.state());
    const exposure = await page.evaluate(() => window.__valley.exposure());
    report[`${prefix}_b${b}`] = { tod: s.tod, exposure };
    console.log(`captured ${file} tod=${s.tod} exposure=${exposure.exposure}`);
  }
}

// Phase 1: first start.
const first = await newPage(false);
await first.getByText('Move the slider until you can only just see the figure in the yard.').waitFor({ timeout: 60_000 });
await first.waitForTimeout(4000);
await frames(first, 'picture');
await first.getByRole('button', { name: "That's right." }).click();
await first.waitForTimeout(2000);
const firstSaved = await first.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
report.firstStartSaved = firstSaved.display;
if (!firstSaved.display.brightnessSet) failures.push('first start: brightnessSet not saved');
if (await first.getByText('Move the slider until you can only just see the figure in the yard.').count()) failures.push('first start: card still shown after close');
await first.screenshot({ path: join(outDir, 'after-close.png') });
await first.context().close();

// Phase 2: Display path, from play.
const page = await newPage(true);
await page.waitForTimeout(4000);
const play = await page.evaluate(() => window.__valley.state());
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Settings' }).waitFor({ timeout: 10_000 });
await page.getByRole('button', { name: 'Settings' }).click();
const baseline = await page.evaluate(() => window.__valley.state());
report.baseline = { tod: baseline.tod, x: baseline.x, z: baseline.z, paused: baseline.paused };
await page.getByRole('button', { name: 'Set brightness again' }).click();
await page.getByText('Move the slider until you can only just see the figure in the yard.').waitFor({ timeout: 30_000 });
await page.waitForTimeout(3000);
const during = await page.evaluate(() => window.__valley.state());
report.during = { tod: during.tod, x: during.x, z: during.z };
if (Math.abs(during.tod - 0) > 0.01) failures.push(`picture clock not at midnight: ${during.tod}`);
if (Math.abs(during.x - baseline.x) < 0.5 && Math.abs(during.z - baseline.z) < 0.5) failures.push('picture did not move the hero to hesper_door');
await page.screenshot({ path: join(outDir, 'display-picture.png') });
await page.getByRole('button', { name: "That's right." }).click();
await page.waitForTimeout(2500);
const after = await page.evaluate(() => window.__valley.state());
report.afterClose = { tod: after.tod, x: after.x, z: after.z, paused: after.paused };
if (Math.abs(after.tod - baseline.tod) > 0.01) failures.push(`clock not restored: ${baseline.tod} -> ${after.tod}`);
if (Math.abs(after.x - baseline.x) > 0.01 || Math.abs(after.z - baseline.z) > 0.01) failures.push('hero not restored');
// Two Back buttons exist in the DOM (Settings and Controls); only the visible one counts.
const menuBack = await page.getByRole('button', { name: 'Back', exact: true }).locator('visible=true').count() > 0;
const settingsHeading = await page.getByRole('heading', { name: 'Settings' }).isVisible();
report.menuOnSettings = { backButton: menuBack, heading: settingsHeading };
if (!menuBack || !settingsHeading) failures.push('pause menu did not return to Settings');
await page.screenshot({ path: join(outDir, 'display-after-close.png') });
void play;

writeFileSync(join(outDir, 'picture-report.json'), JSON.stringify({ report, failures }, null, 2));
console.log(JSON.stringify({ report, failures }, null, 2));
await browser.close();
