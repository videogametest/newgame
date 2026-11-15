// Actual sensing/speech hooks, not a keyboard stealth playthrough. Full-page images include the DOM captions.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const base = process.argv[2] ?? 'http://localhost:4188/';
const out = process.argv[3] ?? 'docs/pr-media/item17-overheard';
const images = !process.argv.includes('--no-images');
mkdirSync(out, { recursive: true });
const report = { failures: [], fallbacks: [], shots: [], checks: [] };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const check = (ok, message) => { report.checks.push({ message, passed: !!ok }); if (!ok) report.failures.push(message); };
async function stable(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    let previous = -1, count = 0, frames = 0, lastFrame = -1;
    function sample() {
      const s = window.__valley.state();
      if (s.frame !== lastFrame) {
        lastFrame = s.frame;
        count = s.chunks === previous ? count + 1 : 0; previous = s.chunks;
        if (count >= 12) return resolve();
        if (++frames > 1200) return reject(new Error('Chunks did not stabilize'));
      }
      requestAnimationFrame(sample);
    }
    sample();
  }));
}
try {
  for (const tod of [12, 18.1, 0]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => report.failures.push(e.message));
    page.on('console', m => { if (m.type() === 'error') report.failures.push(m.text()); });
    page.on('requestfailed', r => report.failures.push(`${r.url()}: ${r.failure()?.errorText}`));
    page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
    await page.addInitScript(() => localStorage.setItem('everylitwindow.settings.v1',
      JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' } })));
    const url = new URL(base); url.searchParams.set('tour', '1');
    await page.goto(String(url), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.__valley?.state().frame > 0 && window.__valley.state().drawCalls > 0,
      null, { timeout: 180000 });
    await page.evaluate(tod => {
      const v = window.__valley;
      v.freeze(true); v.holdFight(true); v.tourTo('mill_bridge'); v.setTod(tod);
      v.millStep('crouchedStill', 1/60);
      v.placeAt(-155, 60); v.lookAt(-151, 65); v.millStep('crouchedStill', 1/60);
    }, tod);
    await stable(page);
    const state = await page.evaluate(() => {
      const el = document.querySelector('.overheard-caption'), r = el?.getBoundingClientRect();
      return { world: window.__valley.state(), mill: window.__valley.millState(),
        memory: window.__valley.millSpeechState(), captionDOM: el && { hidden: el.hidden, text: el.textContent,
          exchange: el.dataset.exchange, speaker: el.dataset.speaker, rect: r?.toJSON(),
          inViewport: !el.hidden && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight } };
    });
    check(state.world.chunks > 0 && state.world.drawCalls > 0, `Rendered settled world at ${tod}`);
    if (tod !== 0) {
      check(state.mill.overheard.caption?.exchangeId === 'overheard.mill.3', `Actual scheduled tell at ${tod}`);
      check(state.captionDOM?.inViewport && state.captionDOM.text.includes(state.mill.overheard.caption?.text),
        `DOM caption matches core words in viewport at ${tod}`);
      check(state.memory.heardLines.includes('overheard.mill.3')
        && state.memory.notes.some(n => n.lineId === 'overheard.mill.3')
        && Object.keys(state.memory.speech.lines).includes('overheard.mill.3.0#0'), `Speech log, heard tell and Notes recorded at ${tod}`);
    } else check(!state.mill.overheard.caption && state.captionDOM.hidden, 'Sleeping speakers stay quiet at midnight');
    const file = join(out, `mill-overheard-${tod}.png`);
    if (images) {
      try { await page.screenshot({ path: file, timeout: 15000 }); }
      catch (e) { report.fallbacks.push({ tod, reason: String(e), method: 'no image; no canvas substitute' }); console.error(`CAPTURE FAILED ${tod}: ${e}`); }
    }
    report.shots.push({ file: images ? file : null, tod, ...state });
    if (tod === 12) {
      await page.evaluate(() => window.__valley.millStep('crouchedStill', 3));
      const next = await page.evaluate(() => ({ mill: window.__valley.millState(), memory: window.__valley.millSpeechState() }));
      check(next.mill.overheard.caption?.speakerId === 'odo_varn', 'Actual exchange advances to Odo');
      check(next.memory.speech.lines['overheard.mill.3.1#0'] !== undefined, 'Second actual line has its own saved speech key');
      await page.evaluate(() => {
        const v = window.__valley; v.millStep('crouchedStill', 3.1);
        v.placeAt(0, 200); v.millStep('still', 1/60);
        v.placeAt(-155, 60); v.millStep('crouchedStill', 1/60);
      });
      const after = await page.evaluate(() => window.__valley.millState());
      check(after.overheard.caption?.exchangeId !== 'overheard.mill.3', 'Heard exchange does not repeat after leaving and returning');
      report.afterExchange = { next, after };
    }
    console.log(`Captured ${tod}: ${state.world.drawCalls} calls, caption ${state.mill.overheard.caption?.exchangeId ?? 'none'}, DOM ${state.captionDOM?.inViewport}`);
    await page.close();
  }
} catch (e) { report.failures.push(String(e)); }
finally { writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
console.log(JSON.stringify({ failures: report.failures, fallbacks: report.fallbacks.length, shots: report.shots.length, checks: report.checks }));
if (report.failures.length) process.exitCode = 1;
