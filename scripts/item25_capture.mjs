// Item 25: the first evening, steps 1 and 2. Actual remapped keyboard input on a fresh New game; the walk is real
// key-held movement. If the walk cannot reach her door in the time allowed, the hero is placed there with the
// placeAt test hook and the report says so (synthetic placement, not a walked road).
// Usage: node scripts/item25_capture.mjs [baseUrl] [outDir] [--no-images]
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const [base = 'http://localhost:4193/', out = 'docs/pr-media/item25-first-evening'] = args;
const images = !process.argv.includes('--no-images');
mkdirSync(out, { recursive: true });
const report = { notes: [], checks: [], failures: [], fallbacks: [], shots: [], snapshots: [] };
const check = (ok, message) => { report.checks.push({ passed: !!ok, message }); if (!ok) report.failures.push(message); };
const settings = JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' }, play: { textSpeed: 'instant', textSize: 'medium' },
  bindings: { keyboard: { moveForward: ['Key:KeyO', null], sprint: ['Key:KeyL', null], interact: ['Key:KeyJ', null] } } });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(settings => {
  if (!localStorage.getItem('item25.seeded')) {
    localStorage.removeItem('everylitwindow.save');
    localStorage.setItem('everylitwindow.settings.v1', settings);
    localStorage.setItem('item25.seeded', 'yes');
  }
}, settings);
const page = await ctx.newPage();
page.on('pageerror', e => report.failures.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') report.failures.push(`console: ${m.text()}`); });
page.on('requestfailed', r => report.failures.push(`${r.url()}: ${r.failure()?.errorText}`));
page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
const V = fn => page.evaluate(fn);
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
  const s = await V(() => ({ world: window.__valley.state(), tutorial: window.__valley.tutorialState(), talking: window.__valley.talkingState() }));
  report.snapshots.push({ name, drawCalls: s.world.drawCalls, chunks: s.world.chunks, ...s });
  if (!images) return;
  try { const path = join(out, `${name}.png`); await page.screenshot({ path, timeout: 20000 }); report.shots.push(path); }
  catch (error) { report.fallbacks.push({ name, method: 'No substitute image', error: String(error) }); }
}
async function hold(keys, ms) { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k); await frames(2); }
async function playing() { await page.waitForFunction(() => !window.__valley.state().title && window.__valley.state().locked && !window.__valley.state().paused, null, { timeout: 30000 }); }
async function lineIs(id) { await page.waitForFunction(id => window.__valley.talkingState().line === id, id, { timeout: 15000 }); }
async function boot() { await page.waitForFunction(() => window.__valley?.state().frame > 0, null, { timeout: 180000 }); }
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
async function door() { const h = (await talk()).position; return h; }
async function walkToDoor(budgetMs) {
  const h = await door(); const t0 = Date.now(); const trace = []; report.walkTrace = trace;
  trace.push({ ms: 0, metres: dist(await world(), h) });
  await page.keyboard.down('KeyO'); await page.keyboard.down('KeyL');
  try {
    while (Date.now() - t0 < budgetMs) {
      await V(() => { const v = window.__valley, p = v.talkingState().position; v.lookAt(p.x, p.z); });
      await page.waitForTimeout(250);
      const s = await world(); const m = dist(s, h);
      if (trace.length === 0 || Date.now() - t0 - trace[trace.length - 1].ms >= 5000) trace.push({ ms: Date.now() - t0, metres: m, fps: s.fps });
      if (m <= 2.6) break;
      const back = trace.length > 3 ? trace[trace.length - 4] : null;
      if (back && back.metres - m < 0.5) { report.notes.push(`Walk made no progress for 15 s at ${m.toFixed(1)} m`); break; }
    }
  } finally { await page.keyboard.up('KeyL'); await page.keyboard.up('KeyO'); }
  await frames(3);
  return dist((await world()), h);
}
async function placeAtDoor() {
  await V(() => { const v = window.__valley, p = v.talkingState().position; v.placeAt(p.x + 2, p.z + 1); v.lookAt(p.x, p.z); }); await frames(3);
}
async function throughArrival() {
  // J (rebound interact) through hesper.arrival then hesper.arrival.bram, stopping on the choice page.
  await page.keyboard.press('KeyE'); await frames(3);
  check(!(await talk()).line, 'Old E binding does not start the door talk');
  await page.keyboard.press('KeyJ'); await lineIs('hesper.arrival.0');
  check((await tut()).prompts.length === 0, 'No road prompt shows during the talk');
  const before = await world(); await frames(30); const after = await world();
  check(after.tod !== before.tod && !after.paused, 'Clock runs during the door talk (nonmodal)');
  for (const id of ['hesper.arrival.1', 'hesper.arrival.2', 'hesper.arrival.bram.0']) { await page.keyboard.press('KeyJ'); await lineIs(id); }
  const t = await talk();
  check(JSON.stringify(t.answers) === JSON.stringify(['evening.choice.0', 'evening.choice.1']), 'Choice answers hang on hesper.arrival.bram (authored ids)');
  const rows = await page.locator('.conversation-answers > *').allInnerTexts();
  check(rows.length === 2 && rows[0].includes('Show me.') && rows[1].includes("I've held a bow before."), `Answer rows show authored words: ${JSON.stringify(rows)}`);
}
try {
  await page.goto(base, { waitUntil: 'load', timeout: 120000 }); await boot();
  check(await title().getByRole('button', { name: 'Continue', exact: true }).count() === 0, 'Fresh profile: no Continue');
  await title().getByRole('button', { name: 'New game', exact: true }).click(); await playing();
  await page.waitForFunction(() => window.__valley.tutorialState().opening !== null, null, { timeout: 10000 });
  let t = await tut();
  check(t.opening === 'One window is lit. Walk to it.' && await page.locator('.evening-open').innerText() === t.opening, `Opening line on screen: ${t.opening}`);
  check(t.tutorial.opened && t.stepNumber === 1, 'New game starts on step 1 with the opening recorded');
  check(t.prompts.includes('O A S D to walk.') && t.prompts.includes('Move the mouse to look.') && !t.prompts.some(p => p.includes('W ')), `Move/look prompts show rebound keys: ${JSON.stringify(t.prompts)}`);
  check(!t.prompts.some(p => p.includes('run')), 'Sprint prompt waits for walking');
  await snap('road-opening');
  const start = (await world());
  await hold(['KeyW'], 800);
  check(dist((await world()), start) < 0.05 && (await tut()).prompts.includes('O A S D to walk.'), 'Old W key neither moves nor clears the walk prompt');
  await hold(['KeyO'], 1500);
  const moved = dist((await world()), start);
  t = await tut();
  check(moved > 0.5 && !t.prompts.some(p => p.includes('to walk')), `Rebound O walks (${moved.toFixed(2)} m) and the walk prompt is gone`);
  await page.mouse.move(640, 360); await page.mouse.move(900, 380, { steps: 10 }); await frames(5);
  t = await tut();
  if (t.tutorial.used.look) check(true, 'Real mouse movement clears the look prompt');
  else {
    report.fallbacks.push({ name: 'look', method: 'Synthetic document mousemove with movementX (real page.mouse gave no movementX under pointer lock)' });
    await V(() => { for (let i = 0; i < 5; i++) document.dispatchEvent(new MouseEvent('mousemove', { movementX: 30, movementY: 0 })); }); await frames(5);
    t = await tut(); check(t.tutorial.used.look, 'Look prompt clears after look movement (SYNTHETIC mousemove fallback)');
  }
  check(!t.prompts.some(p => p.includes('look')), 'Look prompt gone once used');
  // Software rendering runs the simulation slower than wall time: hold until the walked game seconds pass.
  for (let i = 0; i < 30 && !(await tut()).prompts.some(p => p.includes('run')); i++) await hold(['KeyO'], 1000);
  t = await tut(); report.walkedBeforeSprintPrompt = t.tutorial.walked;
  check(t.prompts.includes('Hold L to run.'), `Sprint prompt after a few seconds walking, rebound: ${JSON.stringify(t.prompts)}`);
  await snap('road-sprint-prompt');
  await hold(['KeyO', 'ShiftLeft'], 800);
  check(!(await tut()).tutorial.used.sprint, 'Old Shift does not count as sprint');
  await hold(['KeyO', 'KeyL'], 1000);
  t = await tut(); check(t.tutorial.used.sprint && t.prompts.length === 0, 'Rebound L sprint clears the last road prompt');
  // Pause and resume keep the evening.
  await page.keyboard.press('Escape'); await page.waitForFunction(() => window.__valley.state().paused);
  check(await page.locator('.evening-prompts').isHidden() && await page.locator('.evening-open').isHidden(), 'Pause hides evening text');
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await playing();
  check(JSON.stringify((await tut()).tutorial) === JSON.stringify(t.tutorial), 'Resume keeps the evening state');
  const remaining = await walkToDoor(240000);
  report.walk = { remainingMetres: remaining, walked: remaining <= 2.6 };
  if (remaining <= 2.6) check(true, 'Walked the road to her door with held rebound keys (camera steered by lookAt hook)');
  else { report.fallbacks.push({ name: 'road', method: `SYNTHETIC placeAt at her door; walk stopped ${remaining.toFixed(1)} m short (see walkTrace)` }); await placeAtDoor(); }
  await frames(5);
  t = await tut(); check(t.tutorial.step === 'door' && t.stepNumber === 2, 'Reaching her door is step 2');
  check((await talk()).available, 'Door talk is offered');
  await throughArrival();
  await snap('door-choice');
  await page.keyboard.press('KeyJ'); await frames(3);
  t = await tut();
  check(t.tutorial.choice === 'show' && t.stepNumber === 3 && /26/.test(t.pending ?? '') && !(await talk()).line, `Show me routes to step 3, pending: ${t.pending}`);
  check(!(await talk()).available, 'No repeat talk after the choice');
  // Continue does not repeat opening or choice.
  await V(() => window.__valley.saveNow());
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await boot();
  await title().getByRole('button', { name: 'Continue', exact: true }).click(); await playing(); await frames(20);
  t = await tut();
  check(t.opening === null && t.prompts.length === 0 && t.tutorial.choice === 'show' && t.stepNumber === 3, 'Continue: no opening, no prompts, choice kept');
  check(!(await talk()).available, 'Continue: door talk not offered again');
  // New game starts fresh; take the skip path.
  await page.keyboard.press('Escape'); await page.waitForFunction(() => window.__valley.state().paused);
  await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 120000 }), page.getByRole('button', { name: 'Return to title', exact: true }).click()]);
  await boot();
  await title().getByRole('button', { name: 'New game', exact: true }).click();
  await title().getByRole('button', { name: 'Start again', exact: true }).click(); await playing();
  await page.waitForFunction(() => window.__valley.tutorialState().opening !== null, null, { timeout: 10000 });
  t = await tut();
  check(t.tutorial.choice === null && t.stepNumber === 1 && t.prompts.length >= 2, 'New game: fresh evening with opening and prompts');
  report.notes.push('Skip path: hero placed at her door with placeAt (synthetic placement; the road was walked in the first path).');
  await placeAtDoor(); await frames(5);
  await throughArrival();
  await page.keyboard.press('KeyD'); await frames(3);
  check((await talk()).selected === 1 && await page.locator('.conversation-answers [data-selected="true"]').innerText().then(s => s.includes("I've held")), 'D (move right) selects the second answer');
  await page.keyboard.press('KeyJ'); await lineIs('evening.skip.0');
  check((await talk()).text.startsWith('Have you.') && await page.locator('.conversation-name').innerText() === 'Hesper', 'Skip answer gets evening.skip from Hesper');
  t = await tut(); check(t.tutorial.choice === 'skip' && t.stepNumber === 6 && /27/.test(t.pending ?? ''), `Skip routes to step 6, pending: ${t.pending}`);
  await snap('door-skip');
  await page.keyboard.press('KeyJ'); await page.waitForFunction(() => !window.__valley.talkingState().line);
  await V(() => window.__valley.saveNow());
  const saved = await V(() => JSON.parse(localStorage.getItem('everylitwindow.save')));
  check(saved.version === 4 && saved.tutorial.choice === 'skip' && saved.tutorial.step === 'lantern', 'Saved game (v4) carries the evening');
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await boot();
  await title().getByRole('button', { name: 'Continue', exact: true }).click(); await playing(); await frames(20);
  t = await tut(); check(t.opening === null && t.tutorial.choice === 'skip' && !(await talk()).available, 'Continue after skip: no opening, no second choice');
} catch (error) { report.failures.push(String(error.stack ?? error)); }
finally { await browser.close(); writeFileSync(join(out, images ? 'report.json' : 'report-no-images.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ failures: report.failures, fallbacks: report.fallbacks, walk: report.walk, checks: report.checks.length }, null, 2)); }
if (report.failures.length) process.exitCode = 1;
