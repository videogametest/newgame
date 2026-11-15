// Item 14b. Each view/time is captured once. Rules are exercised through the capture-only step hook.
// Capture failures are reported, not retaken; canvas fallback omits DOM chrome.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const base = process.argv[2] ?? 'http://localhost:4184/';
const out = process.argv[3] ?? 'docs/pr-media/item14b-wildlife';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = { failures: [], fallbacks: [], shots: [] };
try {
 for (const name of ['crows', 'flock', 'geese', 'fox']) for (const tod of [12, 18, 0]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
   page.on('pageerror', e => report.failures.push(String(e)));
   page.on('console', m => { if (m.type() === 'error') report.failures.push(m.text()); });
   page.on('requestfailed', r => report.failures.push(`${r.url()}: ${r.failure()?.errorText}`));
   await page.addInitScript(() => localStorage.setItem('everylitwindow.settings.v1', JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' } })));
   await page.goto(`${base}?tour=1`, { waitUntil: 'load', timeout: 120000 });
   await page.waitForFunction(() => Boolean(window.__valley?.wildlifeState()), null, { timeout: 180000 });
   await page.evaluate(({name,tod}) => {
    const v = window.__valley;
    v.holdFight(true); v.freeze(true); v.tourTo(`wildlife_${name}`); v.setTod(tod); v.hideChrome();
   }, { name, tod });
   // Measure only after streaming stops building chunks across consecutive rendered frames.
   await page.waitForFunction(() => {
    const s = window.__valley.state();
    const prev = window.__wildlifeChunks;
    window.__wildlifeChunks = { chunks: s.chunks, stable: prev?.chunks === s.chunks ? prev.stable + 1 : 0 };
    return window.__wildlifeChunks.stable >= 12 && s.frame > 15;
   }, null, { polling: 'raf', timeout: 120000 });
   if (name === 'flock' || name === 'geese') await page.evaluate(() => {
    window.__valley.wildlifeStep('sprinting', 0);
    window.__valley.wildlifeStep('still', 0.8);
   });
   await page.waitForFunction(f => window.__valley.state().frame > f + 1, await page.evaluate(() => window.__valley.state().frame), { polling: 'raf' });
   const state = await page.evaluate(() => ({ valley: window.__valley.state(), wildlife: window.__valley.wildlifeState() }));
   const file = join(out, `${name}-${tod}.png`);
   let method = 'page screenshot';
   try { await page.screenshot({ path: file, timeout: 15000 }); }
   catch (e) {
    method = 'canvas only, no DOM chrome';
    report.fallbacks.push({ name, tod, error: String(e), method });
    console.error(`FALLBACK ${name}/${tod}: ${method}`);
    const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
    writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
   }
   report.shots.push({ name, tod, file, method, ...state });
   console.log(`Captured ${name}/${tod}: ${state.valley.drawCalls} draw calls, ${state.valley.chunks} stable chunks`);
  } catch (e) { report.failures.push({name,tod,error:String(e)}); console.error(`FAILED ${name}/${tod}: ${e}`); }
  finally { await page.close(); writeFileSync(join(out,'report.json'), JSON.stringify(report,null,2)); }
 }
} finally { await browser.close(); }
console.log(JSON.stringify({ failures: report.failures, fallbacks: report.fallbacks.length, shots: report.shots.length }));
if (report.failures.length) process.exitCode = 1;
