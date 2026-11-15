// Independent group-removal diagnostics; deltas overlap and must not be added.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:4187/';
const phase = process.argv[3] ?? 'before';
const out = 'docs/pr-media/item20-mill-budget';
mkdirSync(out, { recursive: true });
const report = { phase, failures: [], fallbacks: [], views: [] };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function settled(page, samples = 12) {
  await page.evaluate(samples => new Promise((resolve, reject) => {
    let lastFrame = -1, previous = -1, stable = 0, frames = 0;
    const sample = () => {
      const s = window.__valley.state();
      if (s.frame !== lastFrame) {
        lastFrame = s.frame;
        stable = s.chunks > 0 && s.chunks === previous ? stable + 1 : 0;
        previous = s.chunks;
        if (stable >= samples && s.drawCalls > 0) return resolve();
        if (++frames > 1200) return reject(new Error('Streaming did not settle'));
      }
      requestAnimationFrame(sample);
    }; sample();
  }), samples);
}
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => report.failures.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.failures.push(m.text()); });
  page.on('requestfailed', r => report.failures.push(`${r.url()}: ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.addInitScript(() => localStorage.setItem('everylitwindow.settings.v1', JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' } })));
  await page.goto(`${base}?tour=1`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__valley?.state().frame > 0, null, { timeout: 180000 });
  await page.evaluate(() => { window.__valley.freeze(true); window.__valley.holdFight(true); window.__valley.hideChrome(); });
  for (const view of ['mill_morning', 'mill_noon', 'mill_dusk', 'mill_midnight']) {
    await page.evaluate(view => { const v = window.__valley; v.budgetHide(null); if (!v.tourTo(view)) throw new Error('Unknown view'); v.millStep('still', 1/60); }, view);
    await settled(page);
    const row = { view, baseline: await page.evaluate(() => window.__valley.state()), hidden: {} };
    if (phase === 'after' && row.baseline.drawCalls > 300) report.failures.push(`${view} exceeds 300 draw calls: ${row.baseline.drawCalls}`);
    const file = `${out}/${phase}-${view}.png`;
    try { await page.screenshot({ path: file, timeout: 15000 }); }
    catch (e) {
      report.fallbacks.push({ view, method: 'canvas only, no DOM markers', error: String(e) });
      console.error(`FALLBACK ${view}: canvas only, no DOM markers`);
      const image = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
      writeFileSync(file, Buffer.from(image.split(',')[1], 'base64'));
    }
    for (const group of ['shadows', 'glow', 'landmarks', 'fighters']) {
      await page.evaluate(g => window.__valley.budgetHide(g), group); await settled(page, 4);
      row.hidden[group] = await page.evaluate(() => window.__valley.state().drawCalls);
    }
    await page.evaluate(() => window.__valley.budgetHide(null));
    report.views.push(row);
    console.log(JSON.stringify({view, baseline:row.baseline.drawCalls, hidden:row.hidden}));
  }
} catch(e) { report.failures.push(String(e)); }
finally { await browser.close(); writeFileSync(`${out}/${phase}.json`, JSON.stringify(report,null,2)); }
console.log(JSON.stringify({phase, failures:report.failures, fallbacks:report.fallbacks, views:report.views.length}));
if (report.failures.length || report.views.length !== 4) process.exit(1);
