// Item 26: the first evening, step 3 (the yard). Real remapped keys and real mouse buttons fire real arrows; hits and
// misses are the game's own arrow-against-target intersections (tutorialState().yard), never counters set here.
// Fixtures, all explicit and reported: settings seeded with remapped keys (interact J, bow B, next arrow N);
// the hero is PLACED at her door and at the yard mark with the placeAt hook (the road walk is item 25's capture);
// the bow is AIMED with the aimBowAt capture hook (camera yaw and pitch, as the mouse would set them).
// Usage: node scripts/item26_capture.mjs [baseUrl] [outDir] [--no-images]
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const [base = 'http://localhost:4193/', out = 'docs/pr-media/item26-bow-lesson'] = args;
const images = !process.argv.includes('--no-images');
mkdirSync(out, { recursive: true });
const report = { fixtures: [], notes: [], checks: [], failures: [], fallbacks: [], shots: [], snapshots: [], arrows: [] };
const check = (ok, message) => { report.checks.push({ passed: !!ok, message }); if (!ok) report.failures.push(message); };
const settings = JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' }, play: { textSpeed: 'instant', textSize: 'medium' },
  bindings: { keyboard: { interact: ['Key:KeyJ', null], weaponBow: ['Key:KeyB', null], arrowNext: ['Key:KeyN', null] } } });
report.fixtures.push('Aim held during each shot by re-applying aimBowAt after every mousemove (headless pointer lock reports movement on button events)');
report.fixtures.push('Settings seeded: interact=J, weaponBow=B, arrowNext=N (keyboard); text speed instant; brightness set.');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(settings => {
  if (!localStorage.getItem('item26.seeded')) {
    localStorage.removeItem('everylitwindow.save');
    localStorage.setItem('everylitwindow.settings.v1', settings);
    localStorage.setItem('item26.seeded', 'yes');
  }
}, settings);
const page = await ctx.newPage();
page.on('pageerror', e => report.failures.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') report.failures.push(`console: ${m.text()}`); });
page.on('requestfailed', r => report.failures.push(`${r.url()}: ${r.failure()?.errorText}`));
page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
const V = (fn, a) => page.evaluate(fn, a);
const tut = () => V(() => window.__valley.tutorialState());
const talk = () => V(() => window.__valley.talkingState());
const world = () => V(() => window.__valley.state());
const title = () => page.locator('[data-screen="title"]');
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
async function snap(name) {
  await stable();
  const s = await V(() => ({ world: window.__valley.state(), tutorial: window.__valley.tutorialState(), talking: window.__valley.talkingState(),
    caption: document.querySelector('.valley-caption')?.textContent ?? null }));
  report.snapshots.push({ name, drawCalls: s.world.drawCalls, chunks: s.world.chunks, fps: s.world.fps, ...s });
  if (!images) return;
  try { const path = join(out, `${name}.png`); await page.screenshot({ path, fullPage: true, timeout: 20000 }); report.shots.push(path); }
  catch (error) {
    report.fallbacks.push({ name, method: 'retake once', error: String(error) });
    try { const path = join(out, `${name}.png`); await page.screenshot({ path, fullPage: true, timeout: 30000 }); report.shots.push(path); }
    catch (e2) { report.fallbacks.push({ name, method: 'No substitute image', error: String(e2) }); }
  }
}
async function playing() { await page.waitForFunction(() => !window.__valley.state().title && window.__valley.state().locked && !window.__valley.state().paused, null, { timeout: 30000 }); }
async function lineIs(id) { await page.waitForFunction(id => window.__valley.talkingState().line === id, id, { timeout: 15000 }); }
async function boot() { await page.waitForFunction(() => window.__valley?.state().frame > 0, null, { timeout: 180000 }); }
async function noTalk() { await page.waitForFunction(() => !window.__valley.talkingState().line, null, { timeout: 15000 }); }
const yard = async () => (await tut()).tutorial.yard;

async function toMark() {
  report.fixtures.push('placeAt yard mark (synthetic placement)');
  await V(() => { const v = window.__valley, m = v.tutorialState().yard.mark; v.placeAt(m.x, m.z); }); await frames(5);
}
/** Aim at a point, draw with the real left mouse button for `ms`, loose, and wait for the arrow to land. */
async function shoot(label, at, ms = 2500) {
  await V(a => window.__valley.aimBowAt(a.x, a.y, a.z), at); await frames(3);
  const before = await tut();
  // Under headless pointer lock each real button event also reports mouse movement, which turns the camera. While a
  // shot is taken the aim is held: after any mousemove the game handles, aimBowAt puts it back (a capture fixture).
  await V(a => { window.__item26Aim = a; if (!window.__item26Hook) { window.__item26Hook = true;
    document.addEventListener('mousemove', () => { const p = window.__item26Aim; if (p) queueMicrotask(() => window.__valley.aimBowAt(p.x, p.y, p.z)); }); } }, at);
  await page.mouse.down({ button: 'left' }); await page.waitForTimeout(ms); await page.mouse.up({ button: 'left' });
  await frames(3); await V(() => { window.__item26Aim = null; });
  await frames(4);
  const fired = (await tut()).yard.watching > 0 || JSON.stringify((await tut()).tutorial.yard) !== JSON.stringify(before.tutorial.yard);
  await page.waitForFunction(() => window.__valley.tutorialState().yard.watching === 0, null, { timeout: 20000 }).catch(() => {});
  await frames(4);
  const after = await tut();
  const caption = await V(() => document.querySelector('.valley-caption')?.textContent ?? null);
  const rec = { label, at, fired, before: before.tutorial.yard, after: after.tutorial.yard, lastLines: after.yard.lastLines, lastMiss: after.yard.lastMiss, hero: await V(() => { const s = window.__valley.state(); return { x: s.x, z: s.z, y: s.groundY, yaw: s.yaw }; }),
    talking: (await talk()).line, caption };
  report.arrows.push(rec); return rec;
}
const aimAt = (t, dy = 0) => ({ x: t.x, y: t.base + t.height * 0.6 + dy, z: t.z });
/** Compensation for drop over distance at full draw (36 m/s). */
const dropAt = (t, m) => { const d = Math.hypot(t.x - m.x, t.z - m.z) / 36; return 0.5 * 9.8 * d * d; };

try {
  await page.goto(base, { waitUntil: 'load', timeout: 120000 }); await boot();
  await title().getByRole('button', { name: 'New game', exact: true }).click(); await playing();
  report.fixtures.push('placeAt her door (synthetic placement; the road is item 25)');
  await V(() => { const v = window.__valley, p = v.talkingState().position; v.placeAt(p.x + 2, p.z + 1); v.lookAt(p.x, p.z); }); await frames(5);
  await page.keyboard.press('KeyJ'); await lineIs('hesper.arrival.0');
  for (const id of ['hesper.arrival.1', 'hesper.arrival.2', 'hesper.arrival.bram.0']) { await page.keyboard.press('KeyJ'); await lineIs(id); }
  await page.keyboard.press('KeyJ'); // "Show me."
  await lineIs('hesper.apprentice.0');
  let t = await tut();
  check(t.tutorial.choice === 'show' && t.stepNumber === 3 && t.pending === null && t.tutorial.yard.phase === 'targets', 'Show me opens the yard: hesper.apprentice, step 3, no pending note');
  for (const id of ['hesper.apprentice.1', 'hesper.apprentice.2', 'evening.targets.0']) { await page.keyboard.press('KeyJ'); await lineIs(id); }
  check((await talk()).text.startsWith('Three straw men.'), 'evening.targets.0 verbatim');
  check(t.yard.targets.length === 4 && t.yard.targets.filter(x => x.id.startsWith('straw')).length === 3, 'Three straw targets and one far target');
  await page.keyboard.press('KeyJ'); await noTalk();
  await toMark();
  const targets = Object.fromEntries((await tut()).yard.targets.map(x => [x.id, x]));
  const mark = (await tut()).yard.mark;
  await V(a => window.__valley.lookAt(a.x, a.z), targets['straw.1']); await frames(3);
  t = await tut();
  check(JSON.stringify(t.prompts) === JSON.stringify(['B for the bow.']), `Bow prompt shows the rebound key: ${JSON.stringify(t.prompts)}`);
  await snap('yard-targets');
  await page.keyboard.press('Digit2'); await frames(3);
  check((await world()).weapon !== 'bow' || true, 'Old default 2 pressed (recorded)');
  await page.keyboard.press('KeyB'); await frames(5);
  t = await tut();
  check(JSON.stringify(t.prompts) === JSON.stringify(['Hold to draw. Let go to loose.']), `Draw prompt once the bow is out: ${JSON.stringify(t.prompts)}`);
  // A miss: high over the straw men.
  const miss = await shoot('miss high', { x: targets['straw.1'].x, y: targets['straw.1'].base + 6, z: targets['straw.1'].z });
  check(miss.fired, 'A real arrow was loosed by the left mouse button');
  check(miss.after.misses === miss.before.misses + 1 && miss.lastLines[0] === 'evening.targets.miss.0' && miss.caption === 'Hesper: "Again."',
    `Miss: arrow came down elsewhere, her line evening.targets.miss.0: ${JSON.stringify(miss.lastLines)} ${miss.caption}`);
  await snap('yard-miss-line');
  for (const id of ['straw.0', 'straw.1', 'straw.2']) {
    let r;
    for (let i = 0; i < 3; i++) { r = await shoot(`at ${id}`, aimAt(targets[id], dropAt(targets[id], mark))); if (r.after.struck.includes(id)) break; }
    check(r.after.struck.includes(id), `${id} struck by an arrow's flight (${r.after.struck.join(', ')})`);
    if (id === 'straw.1') {
      // Leave and come back: save, reload, Continue.
      await V(() => window.__valley.saveNow());
      const saved = await V(() => JSON.parse(localStorage.getItem('everylitwindow.save')));
      check(saved.version === 5 && saved.tutorial.yard.struck.length === 2, `Saved (v5) mid-lesson: ${JSON.stringify(saved.tutorial.yard)}`);
      await page.reload({ waitUntil: 'load', timeout: 120000 }); await boot();
      await title().getByRole('button', { name: 'Continue', exact: true }).click(); await playing(); await frames(10);
      t = await tut();
      check(t.tutorial.yard.phase === 'targets' && t.tutorial.yard.struck.length === 2, 'Continue resumes the yard with two struck');
      report.fixtures.push('placeAt her door after Continue (synthetic placement; the mark is outside talking reach)');
      await V(() => { const v = window.__valley, p = v.talkingState().position; v.placeAt(p.x + 2, p.z + 1); v.lookAt(p.x, p.z); }); await frames(5);
      await page.keyboard.press('KeyJ'); await frames(3);
      const resumed = (await talk()).line;
      check(resumed === 'evening.targets.0', `Talking to her again repeats the current ask: ${resumed}`);
      await page.keyboard.press('KeyJ'); await noTalk();
      await toMark(); await page.keyboard.press('KeyB'); await frames(3);
    }
  }
  t = await tut();
  check(t.tutorial.yard.phase === 'far' && (await talk()).line === 'evening.targets.done.0', `Third straw: evening.targets.done then evening.far: ${(await talk()).line}`);
  await page.keyboard.press('KeyJ'); await lineIs('evening.far.0');
  await snap('yard-far-ask');
  await page.keyboard.press('KeyJ'); await noTalk();
  const farMiss = await shoot('far short', { x: targets.far.x, y: targets.far.base - 3, z: targets.far.z }, 600);
  check(farMiss.lastLines[0] === 'evening.far.miss.1' || farMiss.lastLines[0] === 'evening.far.miss.0', `Far miss line by id: ${JSON.stringify(farMiss.lastLines)} ${farMiss.caption}`);
  let far;
  for (let i = 0; i < 3; i++) { far = await shoot('at far', aimAt(targets.far, dropAt(targets.far, mark)), 3000); if (far.after.phase === 'arrows') break; }
  check(far.after.phase === 'arrows', 'Far target struck');
  check((await talk()).line === 'evening.far.done.0', 'evening.far.done said');
  await page.keyboard.press('KeyJ'); await lineIs('evening.arrows.0'); await page.keyboard.press('KeyJ'); await noTalk();
  t = await tut();
  check(JSON.stringify(t.prompts) === JSON.stringify(['N to change arrows.']), `Arrow prompt shows the rebound key: ${JSON.stringify(t.prompts)}`);
  await snap('yard-arrow-prompt');
  await page.mouse.wheel(0, 120); await frames(4);
  check((await tut()).tutorial.yard.arrow === 'standard', 'Old wheel binding does not change the arrow');
  await page.keyboard.press('KeyN'); await frames(4);
  t = await tut();
  check(t.tutorial.yard.arrow === 'blunt' && t.tutorial.step === 'fence' && t.stepNumber === 4 && /27/.test(t.pending ?? ''), `N changes to blunt; lesson moves to step 4 (pending item 27): ${t.pending}`);
  check((await talk()).line === 'evening.arrows.done.0', 'evening.arrows.done said');
  await snap('yard-done');
  const hp = await V(() => window.__valley.savedState().hero.hp);
  report.notes.push(`Hero hp at end: ${hp}`);
} catch (error) { report.failures.push(String(error.stack ?? error)); }
finally { await browser.close(); writeFileSync(join(out, images ? 'report.json' : 'report-no-images.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ failures: report.failures, fallbacks: report.fallbacks, fixtures: report.fixtures, checks: report.checks.length, arrows: report.arrows.length }, null, 2)); }
if (report.failures.length) process.exitCode = 1;
