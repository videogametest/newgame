// Task 004 item 7b: Bram's frames in the repo. Tour views road_in (18:00) and family_stones (12:00, 18:00),
// Bram following, then holding. Frames come from the canvas (the compositor screenshot hangs under swiftshader).
// A frame under 40 KB is treated as blank and fails the run, so a white frame is never committed.
// Usage: node scripts/bram_capture.mjs [baseUrl] [outDir]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'docs/pr-media/item7-bram';
const SHOTS = [
  { view: 'road_in', tod: 18, order: 'follow', name: 'road_in-follow-18' },
  { view: 'family_stones', tod: 12, order: 'follow', name: 'family_stones-follow-12' },
  { view: 'family_stones', tod: 18, order: 'follow', name: 'family_stones-follow-18' },
  { view: 'family_stones', tod: 12, order: 'hold', name: 'family_stones-hold-12' },
  { view: 'family_stones', tod: 18, order: 'hold', name: 'family_stones-hold-18' },
];

const failures = [];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => localStorage.setItem('everylitwindow.settings.v1', JSON.stringify({ version: 1, display: { brightness: 1, quality: 'high', brightnessSet: true } })));
page.on('pageerror', (err) => failures.push(`page error: ${err.message}`));
page.on('response', (res) => { if (res.status() >= 400) failures.push(`HTTP ${res.status()}: ${res.url()}`); });

mkdirSync(outDir, { recursive: true });
const url = new URL(base);
url.searchParams.set('tour', '1');
await page.goto(url.toString(), { waitUntil: 'load', timeout: 120_000 });
await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 240_000 });
await page.evaluate(() => window.__valley.freeze(true));
await page.evaluate(() => window.__valley.hideChrome());
await page.addStyleTag({ content: '.panel.prompt { display: none !important; }' });

const report = [];
for (const s of SHOTS) {
  await page.evaluate((n) => window.__valley.tourTo(n), s.view);
  await page.evaluate((h) => window.__valley.setTod(h), s.tod);
  await page.evaluate((o) => window.__valley.setBramOrder(o), s.order);
  await page.evaluate(() => window.__valley.holdFight(true));
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => window.__valley.state());
  const dataUrl = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const file = join(outDir, `${s.name}.png`);
  if (buf.length < 40_000) failures.push(`blank frame ${s.name} (${buf.length} bytes)`);
  else writeFileSync(file, buf);
  report.push({ shot: file, view: s.view, tod: s.tod, order: s.order, x: state.x, z: state.z, yaw: state.yaw, bytes: buf.length });
  console.log(`${s.name}: ${buf.length} bytes, hero=(${state.x.toFixed(1)},${state.z.toFixed(1)})`);
}
writeFileSync(join(outDir, 'state.json'), JSON.stringify(report, null, 2));
await browser.close();
if (failures.length) { console.error('FAILURES:\n' + failures.join('\n')); process.exit(1); }
console.log('bram capture passed');
