// Persistence checks on the actual built page. Completed-rest hook tests saving, not a rest playthrough.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const base = process.argv[2] ?? 'http://localhost:4189/';
const out = process.argv[3] ?? 'docs/pr-media/item21-saves';
const fixture = JSON.parse(readFileSync(process.argv[4] ?? '/tmp/item21-fixture.json', 'utf8'));
const images = !process.argv.includes('--no-images');
mkdirSync(out, { recursive: true });
const report = { checks: [], failures: [], fallbacks: [], shots: [], snapshots: [] };
const check = (ok, message) => { report.checks.push({ passed: !!ok, message }); if (!ok) report.failures.push(message); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function ready(page) {
  await page.waitForFunction(() => window.__valley?.state().frame > 0, null, { timeout: 180000 });
  if (await page.evaluate(() => window.__valley.state().title)) {
    const title = page.locator('[data-screen="title"]');
    const resume = title.getByRole('button', { name: 'Continue', exact: true });
    if (await resume.count()) await resume.click();
    else await title.getByRole('button', { name: 'New game', exact: true }).click();
  }
  await page.waitForFunction(() => window.__valley?.state().frame > 0 && window.__valley.state().drawCalls > 0, null, { timeout: 180000 });
  await page.evaluate(() => { window.__valley.freeze(true); window.__valley.holdFight(true); });
  await page.evaluate(() => new Promise((resolve, reject) => {
    let previous = -1, count = 0, frames = 0, lastFrame = -1;
    function sample() {
      const s = window.__valley.state();
      if (lastFrame !== s.frame) { lastFrame = s.frame; count = previous === s.chunks ? count + 1 : 0; previous = s.chunks;
        if (count >= 12) return resolve(); if (++frames > 1200) return reject(new Error('Chunks never stabilized')); }
      requestAnimationFrame(sample);
    } sample();
  }));
}
async function pageIn(context) {
  const page = await context.newPage();
  page.on('pageerror', e => report.failures.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.failures.push(m.text()); });
  page.on('requestfailed', r => report.failures.push(`${r.url()}: ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
  return page;
}
async function shot(page, name) {
  const state = await page.evaluate(() => ({ world: window.__valley.state(), game: window.__valley.savedState() }));
  report.snapshots.push({ name, ...state });
  if (!images) return;
  const path = join(out, `${name}.png`);
  try { await page.screenshot({ path, timeout: 15000 }); report.shots.push(path); }
  catch (e) { report.fallbacks.push({ name, reason: String(e), method: 'no image, no canvas substitute' }); }
}
try {
  const settings = JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' }, sound: { master: 0.37 } });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(({ fixture, settings }) => {
    if (!localStorage.getItem('test.seeded')) { localStorage.setItem('everylitwindow.save', JSON.stringify(fixture));
      localStorage.setItem('everylitwindow.settings.v1', settings); localStorage.setItem('test.seeded', '1'); }
  }, { fixture, settings });
  const page = await pageIn(ctx); await page.goto(base, { waitUntil: 'load', timeout: 120000 }); await ready(page);
  let state = await page.evaluate(() => window.__valley.savedState());
  check(state.hero.hp === 61 && state.hero.maxHp === 140 && state.hero.position.x === 120, 'Loaded hero position and health reach actual game');
  check(state.day === 7 && Math.abs(state.timeOfDay - 22.25) < 0.1, 'Saved clock and day resume');
  check(state.places[0].status === 'freed' && state.places[0].bellSilenced && state.places[0].timesFreed === 1, 'Freed/lit state restored');
  check(state.progression.skills.archery.level === 7 && state.inventory.stored[0].count === 8 && state.purse.stored === 85, 'Progression, carried/stored inventory and crowns restored');
  check(state.notes.length === 1 && state.heardLines[0] === 'overheard.mill.3' && state.speech.lines['overheard.mill.3.0#0'] === 130, 'Notes, heard lines and non-repeat speech survive load');
  check(state.company.length === fixture.company.length && state.openedChests[0] === 'mill_box', 'Company and opened chests restored');
  await shot(page, 'restored');
  const saved = await page.evaluate(() => {
    const v = window.__valley; v.placeAt(122, -2); v.setTod(19.5);
    const ok = v.saveNow('rest'); return { ok, raw: localStorage.getItem('everylitwindow.save'), settings: localStorage.getItem('everylitwindow.settings.v1') };
  });
  check(saved.ok && JSON.parse(saved.raw).hero.position.x === 122 && JSON.parse(saved.raw).timeOfDay === 19.5, 'Completed-rest persistence hook writes actual live hero and clock');
  check(saved.settings === settings && !('settings' in JSON.parse(saved.raw)), 'Saving game leaves settings in their separate key');
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await ready(page);
  state = await page.evaluate(() => window.__valley.savedState());
  check(state.hero.position.x === 122 && state.hero.hp === 61 && Math.abs(state.timeOfDay - 19.5) < 0.1, 'Reload restores newly saved position, health and clock');
  check(state.progression.perks.long_shot.mastery === 35 && state.notes[0].lineId === fixture.notes[0].lineId, 'Reload retains perks, mastery and Notes');
  await shot(page, 'reloaded');
  const settingsAfter = await page.evaluate(() => localStorage.getItem('everylitwindow.settings.v1'));
  check(settingsAfter === settings, 'Reload does not overwrite settings');
  // Force quota failure for the game key only, leaving the healthy saved text untouched.
  const quota = await page.evaluate(() => {
    const before = localStorage.getItem('everylitwindow.save'), original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v) { if (k === 'everylitwindow.save') throw new DOMException('full', 'QuotaExceededError'); return original.call(this, k, v); };
    const ok = window.__valley.saveNow(); return { ok, kept: localStorage.getItem('everylitwindow.save') === before };
  });
  check(!quota.ok && quota.kept, 'Quota failure preserves previous save and reports failure');
  await page.getByText("Couldn't save. Your progress is safe for now, but don't close the page. Copy a debug report from the pause menu.", { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  check(true, 'Quota failure has a visible plain-language notice');
  await ctx.close();
  const bad = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await bad.addInitScript(settings => { localStorage.setItem('everylitwindow.settings.v1', settings); localStorage.setItem('everylitwindow.save', '{broken'); }, settings);
  const damaged = await pageIn(bad); await damaged.goto(base, { waitUntil: 'load', timeout: 120000 }); await ready(damaged);
  check((await damaged.evaluate(() => window.__valley.savedState())).day === 1, 'Damaged JSON falls back to a fresh playable game');
  await damaged.getByText("Your saved game couldn't be read. A new game has started.", { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  check(true, 'Damaged-save recovery shows its one plain line');
  await shot(damaged, 'damaged-save-new-game'); await bad.close();
  const tour = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await tour.addInitScript(({ fixture, settings }) => { localStorage.setItem('everylitwindow.save', JSON.stringify(fixture)); localStorage.setItem('everylitwindow.settings.v1', settings); }, { fixture, settings });
  const capture = await pageIn(tour); const url = new URL(base); url.searchParams.set('tour', '1');
  await capture.goto(String(url), { waitUntil: 'load', timeout: 120000 }); await ready(capture);
  check((await capture.evaluate(() => window.__valley.savedState())).day === 1, 'Tour ignores the personal save');
  check(!(await capture.evaluate(() => window.__valley.saveNow())), 'Tour cannot write over the personal save');
  check(await capture.evaluate(() => JSON.parse(localStorage.getItem('everylitwindow.save')).day) === fixture.day, 'Tour leaves stored progress intact');
  await tour.close();
} catch (e) { report.failures.push(String(e)); }
finally { writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
console.log(JSON.stringify({ checks: report.checks, failures: report.failures, fallbacks: report.fallbacks, shots: report.shots }));
if (report.failures.length) process.exitCode = 1;
