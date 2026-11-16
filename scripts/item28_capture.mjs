// Item 28: the people of Wick. Built-page checks of who is home, the day's routine, indoors at night, and the
// lit-iff-home windows, through the page's own state (window.__valley.peopleState()).
// FIXTURES, all explicit and recorded in report.fixtures (this is NOT a played return of any household):
//  - progress saves are written from the page's own new game and handed over through sessionStorage (as item 27):
//    "lantern" = first evening finished with the gate lantern lit; "village" = that, plus the Mill freed once and
//    since retaken (held, timesFreed 1) and the Forge freed. No gameplay produces these states yet (queue 18/30/31).
//  - the clock is SET with setTod and frozen; the hero is PLACED with placeAt and the camera TURNED with lookAt.
// Usage: node scripts/item28_capture.mjs [baseUrl] [outDir] [--no-images]
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const [base = 'http://localhost:4193/', out = 'docs/pr-media/item28-wick-people'] = args;
const images = !process.argv.includes('--no-images');
mkdirSync(out, { recursive: true });
const report = { fixtures: [], notes: [], checks: [], failures: [], fallbacks: [], shots: [], snapshots: [] };
const check = (ok, message) => { report.checks.push({ passed: !!ok, message }); if (!ok) report.failures.push(message); };
const fixture = m => report.fixtures.push(m);
const settings = JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' }, play: { textSpeed: 'instant', textSize: 'medium' } });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
let ctx, page;
async function open() {
  ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(settings => {
    if (!localStorage.getItem('item28.seeded')) { localStorage.removeItem('everylitwindow.save'); localStorage.setItem('everylitwindow.settings.v1', settings); localStorage.setItem('item28.seeded', '1'); }
    const fx = sessionStorage.getItem('item28.fixture');
    if (fx) { localStorage.setItem('everylitwindow.save', fx); sessionStorage.removeItem('item28.fixture'); }
  }, settings);
  page = await ctx.newPage();
  page.on('pageerror', e => report.failures.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') report.failures.push(`console: ${m.text()}`); });
  page.on('requestfailed', r => report.failures.push(`${r.url()}: ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
}
const V = (fn, a) => page.evaluate(fn, a);
const people = () => V(() => window.__valley.peopleState());
async function frames(n = 10) {
  await page.evaluate(n => new Promise(r => { let last = window.__valley.state().frame, seen = 0;
    (function s() { const f = window.__valley.state().frame; if (f !== last) { last = f; if (++seen >= n) return r(); } requestAnimationFrame(s); })(); }), n);
}
async function stable() {
  await page.evaluate(() => new Promise((resolve, reject) => {
    let previous = -1, count = 0, frames = 0, last = -1;
    (function sample() { const s = window.__valley.state();
      if (s.frame !== last) { last = s.frame; count = previous === s.chunks ? count + 1 : 0; previous = s.chunks;
        if (count >= 12 && s.drawCalls > 0) return resolve();
        if (++frames > 1200) return reject(new Error('Chunks did not settle')); }
      requestAnimationFrame(sample); })();
  }));
}
async function at(hour) { await V(h => window.__valley.setTod(h), hour); await frames(4); return people(); }
async function snap(name) {
  let settled = true;
  try { await stable(); } catch (e) { settled = false; report.fallbacks.push({ name, method: 'chunks did not settle; draw calls read unsettled', error: String(e) }); }
  const w = await V(() => window.__valley.state());
  check(w.chunks > 0 && w.drawCalls > 0 && w.frame > 0, `${name}: chunks ${w.chunks}, draw calls ${w.drawCalls} positive${settled ? ', settled' : ''}`);
  report.snapshots.push({ name, drawCalls: w.drawCalls, chunks: w.chunks, fps: w.fps, people: await people() });
  if (!images) return;
  try { const path = join(out, `${name}.png`); await page.screenshot({ path, fullPage: true, timeout: 20000 }); report.shots.push(path); }
  catch (error) {
    report.fallbacks.push({ name, method: 'retake once', error: String(error) });
    try { const path = join(out, `${name}.png`); await page.screenshot({ path, fullPage: true, timeout: 30000 }); report.shots.push(path); }
    catch (e2) { report.fallbacks.push({ name, method: 'No substitute image', error: String(e2) }); }
  }
}
const title = () => page.locator('[data-screen="title"]');
async function boot() { await page.waitForFunction(() => window.__valley?.state().frame > 0, null, { timeout: 180000 }); }
async function playing() { await page.waitForFunction(() => !window.__valley.state().title && !window.__valley.state().paused, null, { timeout: 30000 }); }
async function hold() { await V(() => { window.__valley.freeze(true); window.__valley.holdFight(true); }); }
async function handover(kind) {
  await V(kind => {
    const g = window.__valley.savedState();
    g.tutorial = { ...g.tutorial, step: 'done', choice: 'show', opened: true, used: { move: true, look: true, sprint: true }, lantern: { phase: 'done' } };
    if (kind === 'village') {
      g.places = g.places.map(p => p.id === 'mill' ? { ...p, status: 'held', timesFreed: 1, freedDay: 1 }
        : p.id === 'forge' ? { ...p, status: 'freed', timesFreed: 1, freedDay: 1 } : p);
    }
    sessionStorage.setItem('item28.fixture', JSON.stringify(g));
  }, kind);
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await boot();
  await title().getByRole('button', { name: 'Continue', exact: true }).click(); await playing(); await hold(); await frames(10);
}
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const HOUSE = { hesper: 'hesper', maren: 'old_maren', marrins: 'marrin', aldrics: 'aldric', sedges: 'sedge', pikes: 'pike', wains: 'wain',
  kettles: 'kettle', brands: 'brand', oona: 'oona', hollins: 'hollin', tolleys: 'tolley', ashbys: 'ashby', loomises: 'loomis', dunns: 'dunn', rudds: 'rudd' };
const WELL = { x: 77, z: 76 };

try {
  // ---- A fresh game: Hesper's window only; Old Maren present, dark ----
  await open(); await page.goto(base, { waitUntil: 'load', timeout: 120000 }); await boot();
  await title().getByRole('button', { name: 'New game', exact: true }).click(); await playing(); await hold(); await frames(10);
  let p = await at(12);
  check(same(p.home, ['hesper']), `New game: only Hesper home (${p.home})`);
  check(same(p.villagers.map(v => v.name), ['Old Maren']) && same(p.drawn, ['maren:0']), `New game noon: Old Maren the only villager, drawn (${p.drawn})`);
  check(p.lit.length === 0 && p.rendered.length === 0 && p.boards, `Noon: no window lit or rendered, boards up (${p.rendered})`);
  p = await at(22);
  check(same(p.lit, ['hesper']) && same(p.rendered, ['hesper']), `New game 22:00: Hesper's window only, Old Maren in the dark (${p.rendered})`);
  check(p.drawn.length === 0 && p.villagers.every(v => v.activity === 'indoors' && !v.visible), 'Night: Old Maren indoors, not drawn');
  p = await at(3);
  check(same(p.rendered, ['hesper']), `03:00: Hesper's lamp burns until dawn (${p.rendered})`);

  // ---- The first lantern lit: Old Maren's window ----
  fixture('Save "lantern": page\'s own new game with tutorial step done and gate lantern lit (phase done), via sessionStorage.');
  await handover('lantern');
  p = await at(22);
  check(p.home.includes('maren') && same(p.rendered, ['hesper', 'old_maren']) && same(p.lit, p.rendered), `First lantern: Old Maren home, her window lit at 22:00 (${p.rendered})`);
  p = await at(12);
  check(same(p.drawn, ['maren:0']) && p.rendered.length === 0, 'Lantern save noon: Old Maren at her door, windows dark by day');

  // ---- A fuller village: Mill freed once and retaken, Forge freed ----
  fixture('Save "village": lantern save plus Mill held with timesFreed 1 (freed, then retaken) and Forge freed, via sessionStorage.');
  await handover('village');
  await frames(20);
  p = await at(12);
  const expectHome = ['hesper', 'maren', 'marrins', 'sedges', 'brands', 'kettles', 'oona'];
  check(same(p.home, expectHome), `Triggers: Marrins (Mill once freed, now retaken), Sedges and Brands (Forge), then Kettles (3) and Oona (6) by count (${p.home})`);
  const vis = p.villagers.filter(v => v.visible);
  check(vis.length === p.villagers.length && same(p.drawn, vis.map(v => v.id)), `Noon: every present villager drawn (${p.drawn.length}: ${p.drawn})`);
  check(p.villagers.filter(v => v.household !== 'maren').every(v => v.activity === 'working'), 'Noon: all but Old Maren at work');
  check(!p.villagers.some(v => v.household === 'hesper'), 'Hesper is not duplicated: she stays the talking actor');
  check(!p.villagers.some(v => v.name === 'Bracken'), 'Bracken the sheepdog is not drawn as a person');
  const noon = p;
  await snap('noon');
  const a = await at(6.05), b = await at(6.15);
  const moved = a.villagers.filter(v => v.activity === 'walking').filter(v => { const w = b.villagers.find(x => x.id === v.id); return w && Math.hypot(w.x - v.x, w.z - v.z) > 1; });
  check(moved.length >= 3, `06:03 to 06:09: villagers walk to work (${moved.map(v => v.id)})`);
  // Real clock: let the game run a few seconds at 07:00 and see someone move.
  await V(() => window.__valley.setTod(6.05)); await V(() => window.__valley.freeze(false)); await page.waitForTimeout(3000);
  const c = await people(); await hold();
  const realMoved = c.villagers.filter(v => { const w = a.villagers.find(x => x.id === v.id); return w && Math.hypot(w.x - v.x, w.z - v.z) > 0.2; });
  check(c.hour > 6.05 && realMoved.length >= 1, `Running clock (${c.hour.toFixed(3)} h): ${realMoved.length} villagers moved`);
  p = await at(18.25);
  const gathering = p.villagers.filter(v => v.activity === 'gathering');
  check(gathering.length === p.villagers.length - 1 && gathering.every(v => Math.hypot(v.x - WELL.x, v.z - WELL.z) < 5), `Dusk 18:15: all but Old Maren gathered within 5 m of the well (${gathering.length})`);
  check(p.rendered.length === 1 && p.rendered[0] === 'hesper', `Dusk: only Hesper's lamp before 19:00 (${p.rendered})`);
  await V(() => { window.__valley.placeAt(84, 92); window.__valley.lookAt(77, 76); }); await frames(4);
  await snap('dusk-well');
  p = await at(22);
  const homes = p.home.map(h => HOUSE[h]);
  check(p.drawn.length === 0 && p.villagers.every(v => v.activity === 'indoors'), 'Night 22:00: everyone indoors, nobody drawn');
  check(same(p.lit, homes) && same(p.rendered, homes), `22:00: lit and rendered windows are exactly the home households' (${p.rendered})`);
  check(!p.rendered.includes('aldric') && !p.rendered.includes('dunn') && !p.rendered.includes('fairlow'), 'Households not home stay dark; Fairlow dark');
  await V(() => { window.__valley.placeAt(100, 90); window.__valley.lookAt(56, 98); }); await frames(4);
  await snap('night');
  p = await at(2);
  check(same(p.rendered, ['hesper']), `02:00: the others dark in the small hours, Hesper lit (${p.rendered})`);
  // ---- Persistence: the exit save keeps who came home; Continue resumes it ----
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await boot();
  const raw = await V(() => JSON.parse(localStorage.getItem('everylitwindow.save')));
  check(same(raw.households.filter(h => h.home).map(h => h.id), expectHome), `Exit save holds the households home (${raw.households.filter(h => h.home).map(h => h.id)})`);
  await title().getByRole('button', { name: 'Continue', exact: true }).click(); await playing(); await hold(); await frames(10);
  p = await at(12);
  check(same(p.home, expectHome) && same(p.drawn, noon.drawn), 'Continue: same households home, same villagers out at noon');
  await ctx.close();
} catch (error) { report.failures.push(String(error.stack ?? error)); }
finally {
  await browser.close();
  const summary = { failures: report.failures, fallbacks: report.fallbacks, checks: report.checks.length, passed: report.checks.filter(c => c.passed).length,
    drawCalls: report.snapshots.map(s => ({ name: s.name, drawCalls: s.drawCalls, chunks: s.chunks })), shots: report.shots };
  writeFileSync(join(out, images ? 'report.json' : 'report-no-images.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}
if (report.failures.length) process.exitCode = 1;
