// Actual remappable interact input over a synthetic doorstep save; not a walked tutorial.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const [base = 'http://localhost:4192/', out = 'docs/pr-media/item24-talking', fixturePath = '/tmp/item24-fixture.json'] = process.argv.slice(2);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')), images = !process.argv.includes('--no-images');
mkdirSync(out, { recursive: true });
const report = { fixture: 'Synthetic doorstep save; actual keyboard interactions. No walked tutorial.', checks: [], failures: [], fallbacks: [], shots: [], snapshots: [] };
const check = (ok, message) => { report.checks.push({ passed: !!ok, message }); if (!ok) report.failures.push(message); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(fixture => {
  if (!localStorage.getItem('test.seeded')) {
    localStorage.setItem('everylitwindow.save', JSON.stringify(fixture.game));
    localStorage.setItem('everylitwindow.settings.v1', JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' },
      play: { textSpeed: 'instant', textSize: 'large' }, bindings: { keyboard: { interact: ['Key:KeyJ', null] } } }));
    localStorage.setItem('test.seeded', 'yes');
  }
}, fixture);
const page = await ctx.newPage();
page.on('pageerror', e => report.failures.push(e.message));
page.on('console', m => { if (m.type() === 'error') report.failures.push(m.text()); });
page.on('requestfailed', r => report.failures.push(`${r.url()}: ${r.failure()?.errorText}`));
page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
async function stable() {
  await page.evaluate(() => new Promise((resolve, reject) => {
    let previous = -1, count = 0, frames = 0, last = -1;
    function sample() { const s = window.__valley.state();
      if (s.frame !== last) { last = s.frame; count = previous === s.chunks ? count + 1 : 0; previous = s.chunks;
        if (count >= 12 && s.drawCalls > 0) return resolve();
        if (++frames > 1200) return reject(new Error('Chunks did not settle')); }
      requestAnimationFrame(sample);
    } sample();
  }));
}
async function start() {
  await page.waitForFunction(() => window.__valley?.state().frame > 0, null, { timeout: 180000 });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.waitForFunction(() => !window.__valley.state().title && window.__valley.state().locked, null, { timeout: 20000 });
  await page.evaluate(p => { const v = window.__valley; v.lookAt(p.x, p.z); }, fixture.hesper);
  await stable();
}
async function snap(name) {
  await stable();
  report.snapshots.push({ name, ...await page.evaluate(() => ({ world: window.__valley.state(), talking: window.__valley.talkingState() })) });
  if (!images) return;
  try { const path = join(out, `${name}.png`); await page.screenshot({ path, timeout: 20000 }); report.shots.push(path); }
  catch (error) { report.fallbacks.push({ name, method: 'No substitute image', error: String(error) }); }
}
async function line(id) {
  await page.waitForFunction(id => window.__valley.talkingState().line === id, id, { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('.conversation-line')?.textContent === window.__valley.talkingState().text);
}
try {
  await page.goto(base, { waitUntil: 'load', timeout: 120000 }); await start();
  await page.waitForFunction(() => window.__valley.talkingState().available);
  check(true, 'Actual doorstep offers the arrival conversation');
  await page.keyboard.press('KeyE'); await stable();
  check(!await page.evaluate(() => window.__valley.talkingState().line), 'Old E binding does not start speech after rebinding');
  await page.keyboard.press('KeyJ'); await line('hesper.arrival.0');
  check(await page.locator('.conversation-name').innerText() === 'Hesper', 'Speaker name comes from cottage data');
  const box = await page.locator('.conversation-box').boundingBox();
  check(box && box.y > 400 && box.y + box.height <= 720 && box.x >= 0, 'Speech box stays at the foot inside 1280x720');
  check(await page.locator('.conversation-answers > *').count() === 0, 'Arrival has no invented hero dialogue choices');
  check(await page.locator('.conversation-prompt').innerText() === 'J', 'Advance prompt displays the rebound action');
  check(await page.locator('.conversation-box').evaluate(el => getComputedStyle(el).fontSize) === '22px', 'Saved large text setting is applied');
  const before = await page.evaluate(() => window.__valley.state());
  await snap('door-dusk');
  const after = await page.evaluate(() => window.__valley.state());
  check(after.tod !== before.tod && !after.paused && after.locked, 'World clock and pointer capture continue during conversation');
  await page.evaluate(() => { window.__valley.setTod(12); }); await snap('door-noon');
  await page.evaluate(() => { window.__valley.setTod(0); }); await snap('door-night');
  // Repeated keydown cannot race through the conversation.
  await page.keyboard.down('KeyJ'); await line('hesper.arrival.1');
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', repeat: true })));
  await stable(); check(await page.evaluate(() => window.__valley.talkingState().line === 'hesper.arrival.1'), 'Held/repeated interact advances only one line');
  await page.keyboard.up('KeyJ');
  // Explicit pause is still available and does not lose the current line.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__valley.state().paused);
  check(!await page.locator('.conversation-box').isVisible(), 'Pause menu hides speech without discarding the cursor');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await line('hesper.arrival.1');
  check(true, 'Resume preserves the current speech line');
  await page.evaluate(() => window.__valley.saveNow());
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await start();
  check(!await page.evaluate(() => window.__valley.talkingState().line), 'Continue restores progress but not an active conversation');
  await page.keyboard.press('KeyJ'); await line('hesper.arrival.2');
  check(true, 'Saved speech resumes with the next unheard arrival line');
  await page.keyboard.press('KeyJ'); await page.waitForFunction(() => !window.__valley.talkingState().line);
  await page.evaluate(() => window.__valley.saveNow());
  const game = await page.evaluate(() => JSON.parse(localStorage.getItem('everylitwindow.save')));
  check(game.notes.filter(n => n.lineId.startsWith('hesper.arrival.')).length === 3
    && ['0', '1', '2'].every(i => game.speech.lines[`hesper.arrival.${i}#0`] !== undefined), 'All and only displayed arrival lines persist in speech and Notes');
  check(!await page.evaluate(() => window.__valley.talkingState().available), 'Exhausted arrival does not repeat');
  const state = await page.evaluate(() => window.__valley.state());
  await page.evaluate(() => { const v = window.__valley; v.placeAt(200, 200); });
  await page.keyboard.press('KeyJ'); await stable();
  check(!await page.evaluate(() => window.__valley.talkingState().line), 'Distant interaction cannot start Hesper speech');
  report.viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  report.last = state;
} catch (error) { report.failures.push(String(error.stack ?? error)); }
finally { await browser.close(); writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); }
if (report.failures.length) process.exitCode = 1;
