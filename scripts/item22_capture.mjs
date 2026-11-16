// Actual UI flows, isolated synthetic saves. No visual judgement and no canvas fallback.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const base = process.argv[2] ?? 'http://localhost:4190/';
const out = process.argv[3] ?? 'docs/pr-media/item22-title';
const fixture = JSON.parse(readFileSync(process.argv[4] ?? '/tmp/item21-fixture.json', 'utf8'));
const images = !process.argv.includes('--no-images');
mkdirSync(out, { recursive: true });
const report = { checks: [], failures: [], fallbacks: [], shots: [], samples: [] };
const check = (ok, message) => { report.checks.push({ passed: !!ok, message }); if (!ok) report.failures.push(message); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const settings = JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' }, sound: { master: 0.37 } });
const title = page => page.locator('[data-screen="title"]');
async function frames(page, count = 12) {
  await page.evaluate(count => new Promise(resolve => {
    let last = window.__valley.state().frame, seen = 0;
    function step() { const now = window.__valley.state().frame;
      if (last !== now) { last = now; if (++seen >= count) return resolve(); } requestAnimationFrame(step); }
    step();
  }), count);
}
async function ready(page) {
  await page.waitForFunction(() => window.__valley?.state().frame > 0 && window.__valley.state().drawCalls > 0, null, { timeout: 180000 });
}
async function open(raw, customSettings = settings) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(({ raw, settings }) => {
    if (!sessionStorage.getItem('item22.seeded')) {
      if (raw !== null) localStorage.setItem('everylitwindow.save', raw);
      if (settings !== null) localStorage.setItem('everylitwindow.settings.v1', settings);
      sessionStorage.setItem('item22.seeded', '1');
    }
  }, { raw, settings: customSettings });
  const page = await context.newPage();
  page.on('pageerror', e => report.failures.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.failures.push(m.text()); });
  page.on('requestfailed', r => report.failures.push(`${r.url()}: ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(base, { waitUntil: 'load', timeout: 120000 }); await ready(page);
  return { context, page };
}
async function raw(page) { return page.evaluate(() => localStorage.getItem('everylitwindow.save')); }
async function shot(page, name) {
  // Settle chunks by distinct rendered frames, not by browser animation ticks.
  await page.evaluate(() => new Promise((resolve, reject) => {
    let previous = -1, stable = 0, last = -1, n = 0;
    function step() { const s = window.__valley.state();
      if (s.frame !== last) { last = s.frame; stable = s.chunks === previous ? stable + 1 : 0; previous = s.chunks;
        if (stable >= 12) return resolve(); if (++n > 1200) return reject(Error('Chunks never stabilized')); }
      requestAnimationFrame(step);
    } step();
  }));
  report.samples.push({ name, state: await page.evaluate(() => window.__valley.state()) });
  if (images) { const path = join(out, `${name}.png`);
    try { await page.screenshot({ path, timeout: 15000 }); report.shots.push(path); }
    catch(e) { report.fallbacks.push({ name, reason: String(e), method: 'no image; no canvas substitute' }); }
  }
}
try {
  const fresh = await open(null, null); const p = fresh.page;
  check(await title(p).getByRole('heading', { name: 'Every Lit Window', exact: true }).isVisible(), 'Fresh profile opens the title');
  check(await title(p).getByRole('button', { name: 'Continue', exact: true }).count() === 0, 'No Continue without a valid save');
  check(!(await p.locator('body').innerText()).includes('twelve hours'), 'Untimed duration promise is absent');
  const before = await p.evaluate(() => window.__valley.savedState());
  await p.keyboard.press('KeyW'); await p.keyboard.press('Escape'); await frames(p);
  const after = await p.evaluate(() => window.__valley.savedState());
  check(JSON.stringify(before) === JSON.stringify(after), 'Movement and Esc do not step the preview game or clock');
  await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  check(await raw(p) === null, 'Title and page exit create no save');
  await shot(p, 'new-player-title');
  await title(p).getByRole('button', { name: 'New game', exact: true }).click();
  await p.getByRole('button', { name: "That's right.", exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  check(true, 'Fresh New game opens existing first-start brightness picture');
  await p.getByRole('button', { name: "That's right.", exact: true }).click();
  await p.waitForFunction(() => !window.__valley.state().title, null, { timeout: 15000 });
  check(JSON.parse(await raw(p)).day === 1, 'Fresh New game creates the new save');
  await fresh.context.close();

  const initial = JSON.stringify(fixture); const saved = await open(initial); const q = saved.page;
  check(await title(q).getByRole('button', { name: 'Continue', exact: true }).isVisible(), 'Valid save offers Continue');
  await frames(q); await q.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  check(await raw(q) === initial, 'Title preview and exit leave a personal save byte-identical');
  await shot(q, 'returning-player-title');
  await title(q).getByRole('button', { name: 'Settings', exact: true }).click();
  check(await title(q).getByRole('heading', { name: 'Settings', exact: true }).isVisible(), 'Settings works from title');
  await title(q).getByRole('button', { name: 'Controls', exact: true }).click();
  await q.keyboard.press('Escape'); await q.keyboard.press('Escape');
  check(await title(q).getByRole('button', { name: 'Continue', exact: true }).isVisible(), 'Esc backs from title Controls through Settings without starting play');
  await title(q).getByRole('button', { name: 'New game', exact: true }).click();
  check(await title(q).getByText('This will replace your saved game. Start again?', { exact: true }).isVisible(), 'New game with save asks the written confirmation');
  check(await q.evaluate(() => document.activeElement?.textContent) === 'Keep my game', 'Cancellation, not destruction, has default focus');
  await shot(q, 'replace-confirmation');
  await title(q).getByRole('button', { name: 'Keep my game', exact: true }).click();
  check(await raw(q) === initial, 'Keep my game preserves save byte-identically');
  await title(q).getByRole('button', { name: 'Continue', exact: true }).click();
  await q.waitForFunction(() => !window.__valley.state().title);
  await q.evaluate(() => { window.__valley.freeze(true); window.__valley.holdFight(true); });
  const game = await q.evaluate(() => window.__valley.savedState());
  check(game.hero.hp === fixture.hero.hp && game.hero.position.x === fixture.hero.position.x && game.day === fixture.day, 'Continue restores actual hero and day rather than title preview state');
  check(JSON.stringify(game.inventory) === JSON.stringify(fixture.inventory) && JSON.stringify(game.progression) === JSON.stringify(fixture.progression) && JSON.stringify(game.notes) === JSON.stringify(fixture.notes), 'Continue restores inventory, progression and Notes');
  check(await q.evaluate(() => localStorage.getItem('everylitwindow.settings.v1')) === settings, 'Continue preserves separate settings');
  await shot(q, 'continued-game');
  await q.keyboard.press('Escape');
  await q.getByRole('button', { name: 'Return to title', exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await Promise.all([q.waitForNavigation({ waitUntil: 'load', timeout: 120000 }), q.getByRole('button', { name: 'Return to title', exact: true }).click()]);
  await ready(q);
  check(await q.evaluate(() => window.__valley.state().title), 'Pause Return to title saves and returns to title');
  await title(q).getByRole('button', { name: 'New game', exact: true }).click();
  await title(q).getByRole('button', { name: 'Start again', exact: true }).click();
  await q.waitForFunction(() => !window.__valley.state().title);
  const replaced = JSON.parse(await raw(q));
  check(replaced.day === 1 && replaced.notes.length === 0 && replaced.hero.hp === replaced.hero.maxHp, 'Explicit Start again replaces progress with a fresh game');
  check(await q.evaluate(() => localStorage.getItem('everylitwindow.settings.v1')) === settings, 'New game keeps separate settings');
  // A failed Return-to-title save must not reload away the live game.
  await q.evaluate(() => { const old = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if (k === 'everylitwindow.save') throw Error('test quota'); return old.call(this,k,v); }; });
  await q.keyboard.press('Escape');
  await q.getByRole('button', { name: 'Return to title', exact: true }).click();
  await frames(q, 2);
  check(!(await q.evaluate(() => window.__valley.state().title)), 'Failed exit save retains the live session instead of reloading');
  await q.getByText("Couldn't save. Your progress is safe for now, but don't close the page. Copy a debug report from the pause menu.", { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  check(true, 'Failed exit save has a visible notice');
  await saved.context.close();
  const bad = await open('{broken');
  check(await title(bad.page).getByRole('button', { name: 'Continue', exact: true }).count() === 0, 'Damaged save is not offered as Continue');
  check(await raw(bad.page) === '{broken', 'Damaged save is not overwritten on the title');
  await title(bad.page).getByRole('button', { name: 'New game', exact: true }).click();
  await bad.page.getByText("Your saved game couldn't be read. A new game has started.", { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  check(true, 'Starting after damaged save displays recovery line');
  await bad.context.close();
} catch(e) { report.failures.push(String(e)); }
finally { writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
console.log(JSON.stringify(report));
if (report.failures.length) process.exitCode = 1;
