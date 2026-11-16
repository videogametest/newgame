// Item 27: the first evening, steps 4 to 6 (the fence, the post, the gate lantern, the map), walking away and back,
// and the skip straight to the lantern. Real (remapped) keyboard and mouse input drive the lesson; the game's own
// rules decide seen/heard, marking, strikes, turnips, lock on and the lantern (tutorialState().lesson).
// FIXTURES, all explicit and recorded in report.fixtures (this is NOT a walked keyboard playthrough):
//  - a version 5 save at step 4 (yard finished) is written from the page's own new game, to start the fence and to
//    exercise the v5 -> v6 migration; the yard itself is item 26's capture;
//  - the hero is PLACED with placeAt at start points (fence start, by the post, outside/inside the yard, the lantern);
//  - the camera is TURNED with lookAt / aimBowAt (headless pointer lock reports movement on button events, so the
//    aim is re-applied after each mousemove while a mouse button is used, as item 26 does).
// Usage: node scripts/item27_capture.mjs [baseUrl] [outDir] [--no-images]
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const [base = 'http://localhost:4193/', out = 'docs/pr-media/item27-evening-finish'] = args;
const images = !process.argv.includes('--no-images');
mkdirSync(out, { recursive: true });
const report = { fixtures: [], notes: [], checks: [], failures: [], fallbacks: [], shots: [], snapshots: [], timeline: [] };
const check = (ok, message) => { report.checks.push({ passed: !!ok, message }); if (!ok) report.failures.push(message); };
const fixture = m => report.fixtures.push(m);
const KB = { interact: 'KeyJ', weaponBow: 'KeyB', weaponBlade: 'KeyU', crouch: 'KeyZ', dodge: 'KeyG', lockOn: 'KeyL', map: 'KeyP', aim: 'KeyO' };
const settings = JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' }, play: { textSpeed: 'instant', textSize: 'medium' },
  bindings: { keyboard: Object.fromEntries(Object.entries(KB).map(([a, k]) => [a, [`Key:${k}`, null]])) } });
fixture(`Settings seeded (keyboard): ${JSON.stringify(KB)}; text speed instant; brightness set.`);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
let ctx, page;
async function open(tag) {
  ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(([settings, tag]) => {
    if (localStorage.getItem('item27.seeded') !== tag) {
      localStorage.removeItem('everylitwindow.save');
      localStorage.setItem('everylitwindow.settings.v1', settings);
      localStorage.setItem('item27.seeded', tag);
    }
    // A fixture save is handed over through sessionStorage: the page's exit save would overwrite a direct write.
    const fx = sessionStorage.getItem('item27.fixture');
    if (fx) { localStorage.setItem('everylitwindow.save', fx); sessionStorage.removeItem('item27.fixture'); }
  }, [settings, tag]);
  page = await ctx.newPage();
  page.on('pageerror', e => report.failures.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') report.failures.push(`console: ${m.text()}`); });
  page.on('requestfailed', r => report.failures.push(`${r.url()}: ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
}
const V = (fn, a) => page.evaluate(fn, a);
const tut = () => V(() => window.__valley.tutorialState());
const lesson = async () => (await tut()).lesson;
const talk = () => V(() => window.__valley.talkingState());
const world = () => V(() => window.__valley.state());
const title = () => page.locator('[data-screen="title"]');
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
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
  try { await stable(); } catch (e) { report.fallbacks.push({ name, method: 'chunks did not settle; draw calls read unsettled', error: String(e) }); }
  const s = await V(() => ({ world: window.__valley.state(), tutorial: window.__valley.tutorialState(), map: window.__valley.mapState() }));
  report.snapshots.push({ name, drawCalls: s.world.drawCalls, chunks: s.world.chunks, fps: s.world.fps, ...s });
  if (!images) return;
  try { const path = join(out, `${name}.png`); await page.screenshot({ path, fullPage: true, timeout: 20000 }); report.shots.push(path); }
  catch (error) {
    report.fallbacks.push({ name, method: 'retake once', error: String(error) });
    try { const path = join(out, `${name}.png`); await page.screenshot({ path, fullPage: true, timeout: 30000 }); report.shots.push(path); }
    catch (e2) { report.fallbacks.push({ name, method: 'No substitute image', error: String(e2) }); }
  }
}
async function boot() { await page.waitForFunction(() => window.__valley?.state().frame > 0, null, { timeout: 180000 }); }
async function playing() { await page.waitForFunction(() => !window.__valley.state().title && window.__valley.state().locked && !window.__valley.state().paused, null, { timeout: 30000 }); }
async function waitFor(fn, arg, ms = 30000, label = '') {
  try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch { report.notes.push(`timed out waiting: ${label}`); return false; }
}
const lineSaid = id => waitFor(id => window.__valley.tutorialState().lesson.lastLines.includes(id) || window.__valley.tutorialState().lesson.queued.includes(id)
  || (window.__valley.tutorialState().lesson.caption ?? '').length > 0 && window.__valley.tutorialState().lesson.lastLines.includes(id), id, 20000, `line ${id}`);
const captionShows = (id, text) => waitFor(t => (document.querySelector('.valley-caption')?.textContent ?? '').includes(t), text, 40000, `caption ${id}`);
async function place(x, z, why) { fixture(`placeAt (${x.toFixed(1)}, ${z.toFixed(1)}): ${why}`); await V(a => window.__valley.placeAt(a.x, a.z), { x, z }); await frames(4); }
async function look(p) { await V(a => window.__valley.lookAt(a.x, a.z), p); await frames(2); }
async function holdAim(p) {
  await V(a => { window.__item27Aim = a; if (!window.__item27Hook) { window.__item27Hook = true;
    document.addEventListener('mousemove', () => { const p = window.__item27Aim; if (p) queueMicrotask(() => window.__valley.lookAt(p.x, p.z)); }); } }, p);
}
const releaseAim = () => V(() => { window.__item27Aim = null; });
async function click() { await page.mouse.down({ button: 'left' }); await page.waitForTimeout(120); await page.mouse.up({ button: 'left' }); await frames(3); }
const prompts = async () => (await tut()).prompts;
const hp0 = { v: null };
async function hpSame(label) { const h = (await lesson()).heroHp; if (hp0.v === null) hp0.v = h; check(h === hp0.v, `Hero not hurt (${label}): hp ${h}`); }

try {
  // ---------------- Path A: show me; steps 4, 5, 6 ----------------
  await open('show'); await page.goto(base, { waitUntil: 'load', timeout: 120000 }); await boot();
  await title().getByRole('button', { name: 'New game', exact: true }).click(); await playing(); await frames(10);
  fixture('Version 5 save written from this page\'s own new game: step "fence", yard finished, choice "show", hero at the yard mark (steps 1-3 are items 25/26).');
  await V(() => {
    const v = window.__valley, g = v.savedState(), mark = v.tutorialState().yard.mark;
    const { fence, post, lantern, away, backs, ...rest } = g.tutorial;
    g.version = 5; g.hero.position = { x: mark.x, z: mark.z };
    g.tutorial = { ...rest, step: 'fence', choice: 'show', opened: true, used: { move: true, look: true, sprint: true },
      yard: { phase: 'done', struck: ['straw.0', 'straw.1', 'straw.2'], misses: 0, arrow: 'blunt' } };
    sessionStorage.setItem('item27.fixture', JSON.stringify(g));
  });
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await boot();
  await title().getByRole('button', { name: 'Continue', exact: true }).click(); await playing(); await frames(10);
  let t = await tut();
  check(t.tutorial.step === 'fence' && t.stepNumber === 4 && t.pending === null && t.tutorial.yard.phase === 'done', `v5 save migrated, Continue at step 4: ${t.tutorial.step}`);
  await captionShows('evening.fence.0', 'Now cross the yard to the scarecrow.');
  check((await lesson()).caption === 'Hesper: "Now cross the yard to the scarecrow. I\'ll be looking the other way. Mostly."', 'evening.fence.0 said as a non-modal line, verbatim');
  check(!(await talk()).line, 'No conversation box: the fence lines do not hold the hero');
  await captionShows('evening.fence.1', 'Low and slow.');
  t = await tut();
  check(JSON.stringify(t.prompts) === JSON.stringify(['Z to crouch. Crouched and still, you are hard to see.']), `Crouch prompt from the rebound key: ${JSON.stringify(t.prompts)}`);
  await hpSame('fence start');
  const L = t.lesson, sc = L.scarecrow;
  const start = { x: sc.x + 5.5, z: sc.z + 5.0 }; // about 7.4 m, out from her shoulder
  // Upright walk: heard.
  await place(start.x, start.z, 'fence start (outside the crossing)'); await look(sc);
  await page.keyboard.down('KeyW');
  await waitFor(() => window.__valley.tutorialState().tutorial.fence.seen > 0, null, 20000, 'seen while walking');
  await page.keyboard.up('KeyW'); await frames(3);
  t = await tut();
  check(t.tutorial.fence.seen === 1 && t.tutorial.fence.restart && t.lesson.lastLines[0] === 'evening.fence.seen.0', `Walking upright is heard: seen line ${t.lesson.lastLines}`);
  await captionShows('seen', "I heard that from here.");
  report.timeline.push({ at: 'seen', hero: await world(), movement: t.lesson.movement });
  await snap('fence-seen');
  // Old crouch key does nothing; rebound Z crouches (toggle).
  await page.keyboard.press('KeyC'); await frames(3); check(!(await lesson()).crouched, 'Old C does not crouch');
  await page.keyboard.press('KeyZ'); await frames(3); check((await lesson()).crouched, 'Rebound Z crouches');
  check((await prompts()).length === 0, 'Crouch prompt gone while crouched');
  await place(start.x, start.z, 'back to the fence start after being seen (the restart)'); await look(sc); await frames(3);
  check(!(await tut()).tutorial.fence.restart, 'Back outside the crossing: the restart is cleared');
  await page.keyboard.down('KeyW');
  const crossT0 = Date.now();
  await waitFor(() => { const v = window.__valley, s = v.tutorialState(); const l = s.lesson; v.lookAt(l.scarecrow.x, l.scarecrow.z);
    return s.tutorial.fence.phase !== 'cross' || s.tutorial.fence.seen > 1; }, null, 60000, 'crouched crossing');
  await page.keyboard.up('KeyW'); await frames(3);
  t = await tut();
  report.timeline.push({ at: 'crossed', ms: Date.now() - crossT0, fence: t.tutorial.fence });
  check(t.tutorial.fence.phase === 'mark' && t.tutorial.fence.seen === 1, `Crouched crossing reaches the scarecrow unseen: ${JSON.stringify(t.tutorial.fence)}`);
  check(dist(await world(), sc) <= 1.7, 'The hero really walked to the scarecrow');
  await captionShows('evening.fence.mark.0', 'Before you touch anyone, mark them.');
  check(JSON.stringify(await prompts()) === JSON.stringify(['B for the bow.']), `At the scarecrow: bow prompt ${JSON.stringify(await prompts())}`);
  await snap('fence-scarecrow');
  await page.keyboard.press('KeyB'); await frames(4);
  check(JSON.stringify(await prompts()) === JSON.stringify(['Hold O to look closer. Keep it on someone to mark them.']), `Mark prompt from rebound O: ${JSON.stringify(await prompts())}`);
  await V(a => window.__valley.lookAt(a.x, a.z), sc); await frames(2);
  // Step back a little so the scarecrow is in front, then hold O.
  await page.keyboard.down('KeyO'); await frames(5);
  check((await lesson()).aimOnScarecrow, 'Look closer held with the aim on the scarecrow');
  await waitFor(() => window.__valley.tutorialState().tutorial.step !== 'fence', null, 15000, 'mark');
  await page.keyboard.up('KeyO'); await frames(3);
  t = await tut();
  check(t.tutorial.fence.phase === 'done' && t.tutorial.step === 'post' && t.stepNumber === 5, `Held O marks the scarecrow; step 5: ${t.tutorial.step}`);
  check(t.lesson.lastLines.includes('evening.fence.done.0') || t.lesson.queued.includes('evening.fence.done.0') || t.lesson.lastLines.includes('evening.post.0'), `Done line: ${JSON.stringify([t.lesson.lastLines, t.lesson.queued])}`);
  await captionShows('evening.fence.done.0', "I didn't hear you.");
  await captionShows('bram', 'Bram: "I lost you in the grass.');
  await hpSame('fence done');
  // ---------------- step 5 ----------------
  await captionShows('evening.post.0', 'For when it goes wrong.');
  const post = t.lesson.post;
  await place(post.x - 1.4, post.z - 0.2, 'beside the practice post'); await look(post);
  check(JSON.stringify(await prompts()) === JSON.stringify(['U for the blade.']), `Blade prompt from rebound U: ${JSON.stringify(await prompts())}`);
  await page.keyboard.press('Digit1'); await frames(3); check((await lesson()).weapon === 'bow', 'Old 1 does not draw the blade');
  await page.keyboard.press('KeyU'); await frames(4); check((await lesson()).weapon === 'sword' && (await prompts()).length === 0, 'Rebound U: blade out, prompt gone');
  await holdAim(post);
  for (let i = 0; i < 6 && (await tut()).tutorial.post.phase === 'blade'; i++) { await click(); await page.waitForTimeout(700); await frames(5); }
  await releaseAim();
  t = await tut();
  check(t.tutorial.post.strikes === 3 && t.tutorial.post.phase === 'dodge', `Three real blade strikes on the post: ${JSON.stringify(t.tutorial.post)}`);
  await captionShows('evening.post.dodge.0', 'Now I throw things at you.');
  check(JSON.stringify(await prompts()) === JSON.stringify(['G to dodge.']), `Dodge prompt from rebound G: ${JSON.stringify(await prompts())}`);
  // First turnip: stand still and take it.
  await waitFor(() => !!window.__valley.tutorialState().lesson.turnip, null, 20000, 'first turnip');
  await snap('post-turnip');
  await waitFor(() => window.__valley.tutorialState().tutorial.post.hits > 0, null, 10000, 'turnip hit');
  t = await tut();
  check(t.tutorial.post.hits === 1 && t.lesson.lastLines[0] === 'evening.post.hit.0', `Standing still: struck by a turnip, her line ${t.lesson.lastLines}`);
  await captionShows('post.hit', 'That was a turnip.');
  await hpSame('turnip hit');
  // Old Space does not roll.
  await waitFor(() => !!window.__valley.tutorialState().lesson.turnip, null, 20000, 'turnip 2');
  await page.keyboard.press('Space'); await frames(2);
  await waitFor(() => !window.__valley.tutorialState().lesson.turnip, null, 10000, 'turnip 2 lands');
  t = await tut(); check(t.tutorial.post.dodged === 0, `Old Space does not dodge (hits ${t.tutorial.post.hits})`);
  for (let i = 0; i < 8 && (await tut()).tutorial.post.phase === 'dodge'; i++) {
    await waitFor(() => !!window.__valley.tutorialState().lesson.turnip, null, 20000, `turnip ${i + 3}`);
    await page.keyboard.press('KeyG'); await frames(2);
    await waitFor(() => !window.__valley.tutorialState().lesson.turnip, null, 10000, 'lands');
  }
  t = await tut();
  check(t.tutorial.post.dodged === 3 && t.tutorial.post.phase === 'lock', `Rebound G rolls clear of three turnips: ${JSON.stringify(t.tutorial.post)} thrown ${t.lesson.turnipsThrown}`);
  await hpSame('turnips');
  await captionShows('evening.post.lock.0', 'Keep your eyes on the one that matters.');
  check(JSON.stringify(await prompts()) === JSON.stringify(['L to keep your eyes on one of them.']), `Lock prompt from rebound L: ${JSON.stringify(await prompts())}`);
  // The rolls carried the hero away from the post: back beside it (fixture), turn away, then lock.
  await place(post.x - 1.4, post.z - 0.2, 'back beside the post after the rolls');
  const hero = await world();
  await look({ x: hero.x - (post.x - hero.x), z: hero.z - (post.z - hero.z) });
  await page.keyboard.press('Tab'); await frames(3); check(!(await lesson()).locked, 'Old Tab does not lock on');
  await page.keyboard.press('KeyL'); await frames(40);
  const w = await world(); const toPost = Math.atan2(post.x - w.x, post.z - w.z);
  const off = Math.abs(Math.atan2(Math.sin(w.yaw - toPost), Math.cos(w.yaw - toPost)));
  check((await lesson()).locked && off < 0.3, `Rebound L locks on: turned to the post (off by ${off.toFixed(2)} rad)`);
  for (let i = 0; i < 4 && (await tut()).tutorial.step === 'post'; i++) { await click(); await page.waitForTimeout(700); await frames(5); }
  t = await tut();
  check(t.tutorial.post.phase === 'done' && t.tutorial.step === 'lantern' && t.stepNumber === 6, `A locked strike ends the post; step 6: ${t.tutorial.step}`);
  await captionShows('evening.post.done.0', 'Enough.');
  await captionShows('bram post', 'Bram: "She threw a turnip at me once.');
  await captionShows('evening.lantern.0', 'One more thing');
  await hpSame('post done');
  // ---------------- walking away and back, across a reload ----------------
  const mid = t.lesson.yardMiddle;
  await place(mid.x + t.lesson.yardRadius + 6, mid.z, 'walked out of the yard (outside its radius)'); await frames(5);
  t = await tut();
  check(t.tutorial.away && t.lesson.lastLines[0] === 'evening.left.0', `Leaving mid-lesson: she calls once (${t.lesson.lastLines})`);
  await captionShows('evening.left', 'Off you go, then.');
  await V(() => window.__valley.saveNow());
  const saved = await V(() => JSON.parse(localStorage.getItem('everylitwindow.save')));
  check(saved.version === 6 && saved.tutorial.step === 'lantern' && saved.tutorial.away === true && saved.tutorial.post.phase === 'done', 'Saved (v6) away mid-lesson at step 6');
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await boot();
  await title().getByRole('button', { name: 'Continue', exact: true }).click(); await playing(); await frames(10);
  t = await tut(); check(t.tutorial.step === 'lantern' && t.tutorial.away && t.tutorial.fence.phase === 'done', 'Continue: lesson reconstructed at step 6, still away');
  await place(mid.x, mid.z, 'walked back into the yard'); await frames(5);
  t = await tut();
  check(!t.tutorial.away && t.tutorial.backs === 1 && t.lesson.lastLines.join() === 'evening.back.0,evening.lantern.0', `Back: welcome and the current ask (${t.lesson.lastLines})`);
  await captionShows('evening.back', 'Seen enough?');
  // ---------------- step 6 ----------------
  const gl = t.lesson.gateLantern;
  await place(gl.x - 1.2, gl.z - 0.5, 'beside the gate lantern'); await look(gl); await frames(5);
  check(JSON.stringify(await prompts()) === JSON.stringify(['J Light the lantern.']), `Lantern prompt from rebound J: ${JSON.stringify(await prompts())}`);
  check(!(await lesson()).gateLanternLit, 'Gate lantern dark before');
  await page.keyboard.press('KeyE'); await frames(3); check(!(await lesson()).gateLanternLit, 'Old E does not light it');
  await page.keyboard.press('KeyJ'); await frames(5);
  t = await tut();
  check(t.lesson.gateLanternLit && t.lesson.gateLanternGlow > 1, `Rebound J lights the gate lantern (glow ${t.lesson.gateLanternGlow.toFixed(2)}), cue ${t.lesson.cue}`);
  check(t.lesson.lastLines.join() === 'hesper.lantern.first.0,hesper.lantern.first.1,hesper.lantern.first.2,evening.map.0', `Lit: hesper.lantern.first then evening.map (${t.lesson.lastLines})`);
  await snap('lantern-lit');
  if (!await waitFor(() => window.__valley.mapState().open, null, 240000, 'map opens'))
    report.notes.push(`map wait state: ${JSON.stringify({ lesson: await lesson(), talk: await talk(), world: await world() })}`);
  const m = await V(() => window.__valley.mapState());
  report.map = m;
  check(m.open && m.drawnPoint === 'mill' && JSON.stringify(m.drawnSites) === JSON.stringify(['wick', 'mill']), `She opens the map pointing at the Mill; only Wick and the Mill drawn: ${JSON.stringify(m.drawnSites)}`);
  check(!m.drawnSites.includes('forge') && !m.drawnSites.includes('watch_house'), 'No undiscovered place on the map');
  t = await tut(); check(t.tutorial.step === 'done' && t.stepNumber === 7, 'The evening is done');
  await frames(3);
  check(JSON.stringify(await prompts()) === JSON.stringify(['P for the map.']), `Map prompt from rebound P: ${JSON.stringify(await prompts())}`);
  await snap('map-pointing');
  await page.keyboard.press('KeyM'); await frames(4); check((await V(() => window.__valley.mapState())).open, 'Old M does not close the map');
  await page.keyboard.press('KeyP'); await frames(4); check(!(await V(() => window.__valley.mapState())).open, 'Rebound P closes the map');
  await page.keyboard.press('KeyP'); await frames(4); check((await V(() => window.__valley.mapState())).open, 'Rebound P opens it again');
  const fin = await V(() => window.__valley.savedState());
  check(fin.discoveredPlaces.includes('mill') && fin.tutorial.step === 'done', 'Saved: the Mill discovered, the evening done');
  await hpSame('end of path A');
  await ctx.close();

  // ---------------- Path B: skip straight to the lantern ----------------
  hp0.v = null;
  await open('skip'); await page.goto(base, { waitUntil: 'load', timeout: 120000 }); await boot();
  await title().getByRole('button', { name: 'New game', exact: true }).click(); await playing(); await frames(10);
  fixture('Skip path: hero placed at her door with placeAt (the road is item 25\'s capture).');
  await V(() => { const v = window.__valley, p = v.talkingState().position; v.placeAt(p.x + 2, p.z + 1); v.lookAt(p.x, p.z); }); await frames(5);
  await page.keyboard.press('KeyJ'); await waitFor(() => window.__valley.talkingState().line === 'hesper.arrival.0', null, 15000, 'arrival');
  for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyJ'); await frames(3); }
  await waitFor(() => window.__valley.talkingState().line === 'hesper.arrival.bram.0', null, 15000, 'bram line');
  await page.keyboard.press('KeyD'); await frames(3); await page.keyboard.press('KeyJ');
  await waitFor(() => window.__valley.talkingState().line === 'evening.skip.0', null, 15000, 'skip');
  const skipT0 = Date.now(); const skipG0 = (await world()).tod;
  t = await tut(); check(t.tutorial.choice === 'skip' && t.tutorial.step === 'lantern', 'Skip: straight to step 6');
  await page.keyboard.press('KeyJ'); await waitFor(() => !window.__valley.talkingState().line, null, 10000, 'skip closed');
  await captionShows('evening.lantern.0 (skip)', 'One more thing');
  const gl2 = (await lesson()).gateLantern;
  await place(gl2.x - 1.2, gl2.z - 0.5, 'beside the gate lantern (skip)'); await look(gl2);
  await page.keyboard.press('KeyJ'); await frames(5);
  t = await tut();
  const skipMs = Date.now() - skipT0, skipGame = ((await world()).tod - skipG0) * 3600;
  report.skip = { wallMs: skipMs, gameSecondsByClock: skipGame };
  check(t.lesson.gateLanternLit && t.tutorial.fence.phase === 'intro' && t.tutorial.post.phase === 'intro', `Skip lights the lantern without fence or post (${skipMs} ms wall)`);
  await waitFor(() => window.__valley.mapState().open, null, 240000, 'map (skip)');
  const m2 = await V(() => window.__valley.mapState());
  check(m2.drawnPoint === 'mill' && (await tut()).tutorial.step === 'done', 'Skip path: map points at the Mill; evening done');
  await hpSame('skip');
  await ctx.close();
} catch (error) { report.failures.push(String(error.stack ?? error)); }
finally {
  await browser.close();
  writeFileSync(join(out, images ? 'report.json' : 'report-no-images.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ failures: report.failures, fallbacks: report.fallbacks, checks: report.checks.length, passed: report.checks.filter(c => c.passed).length, notes: report.notes }, null, 2));
}
if (report.failures.length) process.exitCode = 1;
