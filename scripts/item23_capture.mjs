// Real built-page interaction; the starting cleared place is an explicit synthetic queue-18 stub.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const [base = 'http://localhost:4191/', out = 'docs/pr-media/item23-lantern', fixturePath = '/tmp/item23-fixture.json'] = process.argv.slice(2);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')), images = !process.argv.includes('--no-images');
mkdirSync(out, { recursive: true });
const report = { fixture: 'Synthetic cleared place; queue 18 producer absent. No keyboard combat playthrough.', checks: [], failures: [], fallbacks: [], shots: [], snapshots: [] };
const check = (ok, message) => { report.checks.push({ passed: !!ok, message }); if (!ok) report.failures.push(message); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function stable(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    let previous = -1, count = 0, frames = 0, lastFrame = -1;
    function sample() {
      const s = window.__valley.state();
      if (lastFrame !== s.frame) { lastFrame = s.frame; count = previous === s.chunks ? count + 1 : 0; previous = s.chunks;
        if (count >= 12 && s.drawCalls > 0) return resolve(); if (++frames > 1200) return reject(new Error('Chunks did not settle')); }
      requestAnimationFrame(sample);
    } sample();
  }));
}
async function start(page) {
  await page.waitForFunction(() => window.__valley?.state().frame > 0, null, { timeout: 180000 });
  if (await page.evaluate(() => window.__valley.state().title)) await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.waitForFunction(() => !window.__valley.state().title && !window.__valley.state().paused && window.__valley.state().frame > 0, null, { timeout: 20000 });
  await page.evaluate(() => { const v = window.__valley; v.freeze(true); v.holdFight(true); const p = v.lanternState().position; v.lookAt(p.x - 14, p.z - 5); });
  await stable(page);
}
async function snap(page, name) {
  await stable(page);
  report.snapshots.push({ name, ...await page.evaluate(() => ({ world: window.__valley.state(), lantern: window.__valley.lanternState(), game: window.__valley.savedState() })) });
  if (!images) return;
  try { const path = join(out, `${name}.png`); await page.screenshot({ path, timeout: 20000 }); report.shots.push(path); }
  catch (error) { report.fallbacks.push({ name, method: 'No substitute image', error: String(error) }); }
}
async function context(sound) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(({ fixture, sound }) => {
    if (!localStorage.getItem('test.seeded')) {
      localStorage.setItem('everylitwindow.save', JSON.stringify(fixture.game));
      localStorage.setItem('everylitwindow.settings.v1', JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' } }));
      localStorage.setItem('everylitwindow.sound.v1', JSON.stringify(sound));
      localStorage.setItem('test.seeded', 'yes');
    }
  }, { fixture, sound });
  const page = await ctx.newPage();
  page.on('pageerror', e => report.failures.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.failures.push(m.text()); });
  page.on('requestfailed', r => report.failures.push(`${r.url()}: ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(base, { waitUntil: 'load', timeout: 120000 }); await start(page);
  return { ctx, page };
}
try {
  const { ctx, page } = await context({ master: 0.8, music: 0, effects: 1, muted: false });
  let lamp = await page.evaluate(() => window.__valley.lanternState());
  check(lamp.available && !lamp.windowOn && !lamp.windowRendered && lamp.lanternIntensity === 0, 'Cleared fixture has an available unlit lantern, no recovered window');
  check(lamp.windowHouse === 'marrin', 'Actual nearest recovery pane belongs to the Marrins');
  await snap(page, 'cleared');
  // Real remappable action input, not the capture interaction hook, drives this first ritual.
  await page.evaluate(() => window.__valley.holdFight(false));
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__valley.savedState().places[0].status === 'freed', null, { timeout: 20000 });
  await page.evaluate(() => window.__valley.holdFight(true));
  await page.waitForFunction(() => window.__valley.lanternState().cue === 'caption');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('everylitwindow.save')));
  check(saved.places[0].status === 'freed' && saved.places[0].timesFreed === 1 && saved.places[0].freedDay === saved.day, 'Actual E input captures once and autosaves immediately');
  await page.getByText('The Mill is free.', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  check(true, 'Muted music uses the authored visible freed caption');
  lamp = await page.evaluate(() => window.__valley.lanternState());
  check(lamp.windowOn && lamp.windowRendered && lamp.lanternIntensity > 0, 'Actual nighttime window pane and landmark light turn on');
  check(!await page.evaluate(() => window.__valley.interactLantern()), 'A second interaction cannot recapture or replay the cue');
  await snap(page, 'lit');
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await start(page);
  lamp = await page.evaluate(() => window.__valley.lanternState());
  check(lamp.windowRendered && lamp.lanternIntensity > 0 && lamp.cue === 'none', 'Continue reconstructs the lit landmark and window without replaying music');
  check((await page.evaluate(() => window.__valley.savedState())).places[0].timesFreed === 1, 'Continue keeps the capture count');
  await page.evaluate(house => { const v = window.__valley; v.placeAt(house.x, house.z - 10); v.lookAt(house.x, house.z); v.setTod(22); }, fixture.house);
  await snap(page, 'wick-night');
  await page.evaluate(() => window.__valley.setTod(12)); await stable(page);
  check(!await page.evaluate(() => window.__valley.lanternState().windowRendered), 'Recovered window switches off during daylight');
  await ctx.close();
  const audible = await context({ master: 0.8, music: 0.5, effects: 1, muted: false });
  check(await audible.page.evaluate(() => window.__valley.interactLantern()), 'Sound-enabled fixture accepts the same ritual');
  await audible.page.waitForFunction(() => window.__valley.lanternState().cue !== 'loading', null, { timeout: 60000 });
  check(await audible.page.evaluate(() => window.__valley.lanternState().cue === 'harp'), 'Existing CC0 harp samples decode and written score schedules in real Web Audio (not a listening check)');
  await audible.ctx.close();
} catch (error) { report.failures.push(String(error.stack ?? error)); }
finally { await browser.close(); writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); }
if (report.failures.length) process.exitCode = 1;
