// Capture actual Mill sensors and alarm rules. Hooks advance sensing/runner time only, not a combat playthrough.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const base = process.argv[2] ?? 'http://localhost:4186/';
const out = process.argv[3] ?? 'docs/pr-media/item16-mill-alarm';
mkdirSync(out, { recursive: true });
const report = { failures: [], fallbacks: [], shots: [], alarm: null };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const [tod, scenario] of [[12, 'unaware'], [18.1, 'suspicious'], [0, 'alert']]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => report.failures.push(e.message));
    page.on('console', m => { if (m.type() === 'error') report.failures.push(m.text()); });
    page.on('requestfailed', r => report.failures.push(`${r.url()}: ${r.failure()?.errorText}`));
    page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
    await page.addInitScript(() => localStorage.setItem('everylitwindow.settings.v1',
      JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' }, play: { awarenessMarkers: true } })));
    const url = new URL(base); url.searchParams.set('tour', '1');
    await page.goto(String(url), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 180000 });
    await page.evaluate(() => { window.__valley.freeze(true); window.__valley.holdFight(true); });
    await page.waitForFunction(() => window.__valley.state().frame > 0 && window.__valley.state().drawCalls > 0,
      null, { timeout: 180000 });
    await page.evaluate(tod => {
      const v = window.__valley; v.freeze(true); v.holdFight(true); v.tourTo('mill_bridge');
      v.setTod(tod); v.millStep('still', 1 / 60);
    }, tod);
    if (scenario === 'suspicious') {
      await page.evaluate(() => {
        const v = window.__valley, f = v.millState().defenders.find(d => d.id === 'nessa_roke');
        // The same authored forward point as the core sensor test, not a forced awareness state.
        v.placeAt(f.x + Math.sin(f.yaw) * 2, f.z + Math.cos(f.yaw) * 2);
        v.lookAt(f.x, f.z);
      });
      for (let i = 0; i < 24; i++) {
        await page.evaluate(() => window.__valley.millStep('still', 0.5));
        const state = await page.evaluate(() => window.__valley.millState());
        if (state.defenders.some(d => d.awareness === 'suspicious')) break;
      }
    }
    if (scenario === 'alert') {
      await page.evaluate(() => {
        const v = window.__valley; v.placeAt(-158, 57); v.lookAt(-174, 70);
        v.millStep('sprinting', 1 / 60);
        v.placeAt(-170, 82); v.lookAt(-174, 70);
      });
    }
    await page.waitForFunction(expected => window.__valley.millState().defenders.some(d => d.awareness === expected),
      scenario, { timeout: 10000 });
    // 12 distinct rendered samples must agree, not a cumulative counter read during streaming.
    await page.evaluate(() => new Promise(resolve => {
      let previous = -1, stable = 0, frames = 0, lastFrame = -1;
      function sample() {
        const state = window.__valley.state();
        if (state.frame === lastFrame) { requestAnimationFrame(sample); return; }
        lastFrame = state.frame;
        const chunks = state.chunks;
        stable = chunks === previous ? stable + 1 : 0; previous = chunks;
        if (stable >= 12) resolve();
        else if (++frames > 1200) throw new Error('chunks did not stabilize');
        else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    }));
    const state = await page.evaluate(() => ({ world: window.__valley.state(), mill: window.__valley.millState(),
      markers: [...document.querySelectorAll('.awareness-marker')].map(el => {
        const r = el.getBoundingClientRect();
        return { state: el.dataset.awareness, symbol: el.textContent, hidden: el.hidden,
          inViewport: !el.parentElement.hidden && r.x >= 0 && r.x < innerWidth && r.y >= 0 && r.y < innerHeight };
      }) }));
    if (state.world.frame <= 0 || state.world.drawCalls <= 0 || state.world.chunks <= 0)
      report.failures.push(`No rendered world for ${scenario}`);
    let method = 'page screenshot including DOM markers';
    const file = join(out, `mill-${scenario}-${tod}.png`);
    try { await page.screenshot({ path: file, timeout: 15000 }); }
    catch (error) {
      method = 'canvas only, no DOM markers';
      report.fallbacks.push({ scenario, error: String(error), method });
      console.error(`FALLBACK ${scenario}: ${method}`);
      const image = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
      writeFileSync(file, Buffer.from(image.split(',')[1], 'base64'));
    }
    report.shots.push({ file, scenario, tod, method, ...state });
    console.log(`Captured ${scenario}: draw calls ${state.world.drawCalls}, ${state.markers.filter(m => m.inViewport).length} markers in viewport`);
    if (scenario === 'alert') {
      await page.evaluate(() => window.__valley.millStep('still', 25));
      report.alarm = await page.evaluate(() => window.__valley.millState());
      if (report.alarm.bellRings !== 1 || report.alarm.reinforcements !== 2 || report.alarm.issues.length)
        report.failures.push('Expected one bell ring, two reinforcements and no navigation issues');
    }
    await page.close();
  }
} catch (error) { report.failures.push(String(error)); }
finally { writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
console.log(JSON.stringify({ failures: report.failures, fallbacks: report.fallbacks.length, shots: report.shots.length,
  rings: report.alarm?.bellRings, reinforcements: report.alarm?.reinforcements }));
if (report.failures.length) process.exitCode = 1;
