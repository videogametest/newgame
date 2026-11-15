// Captures the patrol-hut fight (task 004 item 8) from the hero's side at 12:00 and 18:00:
// Bram following beside the hero, and Bram holding after the hero steps away.
// No wall clock plays: the clock is frozen and set by window.__valley before each frame.
// Usage: node scripts/hut_fight_capture.mjs [baseUrl] [outDir]
//   default baseUrl: http://localhost:4173/   default outDir: docs/pr-media/hut-fight
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'docs/pr-media/hut-fight';
const HUT = { x: 322, z: -112 };
// Capture positions sit inside the 25 m sim radius of the hut's enemies (about 17 m out), so the fight is live and
// the enemies are in frame. The fight's own spawn (HERO_SPAWN, ~26 m out) is left as it is.
// Hold shot: the hero steps about 4 m back from the hut, on the same line; Bram keeps his order.
const CAPTURE_FOLLOW = { x: 306, z: -103 };
const HERO_AWAY = { x: 303, z: -101 };
// Aim point a few metres toward Bram's side of the hut, so Bram sits in frame and the hut is to the right.
const AIM = { x: 320, z: -106 };
const TIMES = [12, 18];
const SHOTS = [
  { name: 'follow', order: 'follow', at: CAPTURE_FOLLOW },
  { name: 'hold', order: 'hold', at: HERO_AWAY },
];

const failures = [];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
// Skip the first-start brightness check, so its card is not in the frame.
await page.addInitScript(() => localStorage.setItem('everylitwindow.settings.v1', JSON.stringify({ version: 1, display: { brightness: 1, quality: 'high', brightnessSet: true } })));
page.on('console', (msg) => { if (msg.type() === 'error') failures.push(`console error: ${msg.text()}`); });
page.on('pageerror', (err) => failures.push(`page error: ${err.message}`));
page.on('requestfailed', (req) => failures.push(`request failed: ${req.url()} (${req.failure()?.errorText})`));
page.on('response', (res) => { if (res.status() >= 400) failures.push(`HTTP ${res.status()}: ${res.url()}`); });

mkdirSync(outDir, { recursive: true });
await page.goto(base, { waitUntil: 'load', timeout: 120_000 });
await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 240_000 });
await page.evaluate(() => window.__valley.freeze(true));
// Hold the fight too: without this the hero is hit while the frames are taken.
await page.evaluate(() => window.__valley.holdFight(true));
await page.evaluate(() => window.__valley.hideChrome());
// The 'Click to take control' card is not part of the picture.
// The HUD re-shows it each frame, so a style rule (not the attribute) keeps it out of the picture.
await page.addStyleTag({ content: '.panel.prompt { display: none !important; }' });

const report = [];
for (const tod of TIMES) {
  for (const shot of SHOTS) {
    await page.evaluate((h) => window.__valley.setTod(h), tod);
    await page.evaluate((o) => window.__valley.setBramOrder(o), shot.order);
    await page.evaluate((p) => window.__valley.placeAt(p.x, p.z), shot.at);
    await page.evaluate((h) => window.__valley.lookAt(h.x, h.z), AIM);
    await page.waitForTimeout(4000);
    const state = await page.evaluate(() => window.__valley.state());
    const file = join(outDir, `hut-${shot.name}-${tod}.png`);
    await page.locator('canvas').first().screenshot({ path: file });
    report.push({ shot: file, tod, order: shot.order, hero: shot.at, bram: state.bram, drawCalls: state.drawCalls });
    console.log(`captured ${file} hero=(${shot.at.x},${shot.at.z}) bram=(${state.bram.x.toFixed(1)},${state.bram.z.toFixed(1)})`);
  }
}

writeFileSync(join(outDir, 'state.json'), JSON.stringify(report, null, 2));
await browser.close();
if (failures.length) {
  console.error('FAILURES:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('hut fight capture passed');
