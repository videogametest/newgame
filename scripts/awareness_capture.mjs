// Queue item 13: one fresh page per time of day. Retakes are not attempted.
// Screenshot failures fall back loudly to canvas-only PNGs (no DOM markers in those images).
// Usage: node scripts/awareness_capture.mjs [URL] [output directory]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4183/';
const out = process.argv[3] ?? 'docs/pr-media/item13-awareness';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const report = { failures: [], fallbacks: [], shots: [] };
try {
  for (const tod of [12, 18, 0]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', error => report.failures.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.failures.push(message.text()); });
    page.on('requestfailed', request => report.failures.push(`${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', response => { if (response.status() >= 400) report.failures.push(`HTTP ${response.status()}: ${response.url()}`); });
    await page.addInitScript(() => localStorage.setItem('everylitwindow.settings.v1',
      JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'low' }, play: { awarenessMarkers: true } })));
    await page.goto(base, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 180000 });
    await page.evaluate(tod => {
      window.__valley.freeze(true);
      window.__valley.holdFight(true);
      window.__valley.setTod(tod);
      window.__valley.placeAt(303, -103);
      window.__valley.lookAt(313, -101);
    }, tod);
    // Coordinate input avoids locator actionability timeouts on a slow SwiftShader canvas.
    await page.mouse.click(640, 360);
    await page.waitForFunction(() => window.__valley.state().locked, null, { timeout: 30000 });
    await page.evaluate(() => window.__valley.holdFight(false));
    await page.waitForFunction(() => window.__valley.state().fighters.filter(f => f.team === 'enemy')
      .every(f => f.awareness === 'alert'), null, { timeout: 60000 });
    await page.evaluate(() => window.__valley.holdFight(true));
    await page.waitForFunction(() => [...document.querySelectorAll('.awareness-marker')]
      .filter(el => !el.hidden && el.dataset.awareness === 'alert').length === 3, null, { timeout: 30000 });
    const markers = await page.locator('.awareness-marker').evaluateAll(elements => elements.map(el => {
      const r = el.getBoundingClientRect();
      return { state: el.dataset.awareness, symbol: el.textContent, hidden: el.hidden, x: r.x, y: r.y, w: r.width, h: r.height,
        parentOverflow: getComputedStyle(el.parentElement).overflow };
    }));
    const state = await page.evaluate(() => window.__valley.state());
    const file = join(out, `hut-awareness-${tod}.png`);
    let method = 'page screenshot (world and DOM markers)';
    try {
      await page.screenshot({ path: file, timeout: 15000 });
    } catch (error) {
      method = 'canvas only; DOM markers are NOT in this frame';
      report.fallbacks.push({ tod, error: String(error), method });
      console.error(`FALLBACK ${tod}: compositor screenshot failed; saving canvas only, no DOM markers`);
      const image = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
      writeFileSync(file, Buffer.from(image.split(',')[1], 'base64'));
    }
    report.shots.push({ file, tod, method, state, markers });
    console.log(`Captured ${file}: ${method}, markers=${markers.length}`);
    await page.close();
  }
  // Verify the saved off setting on a fresh page, without adding an extra frame.
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => localStorage.setItem('everylitwindow.settings.v1',
    JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'low' }, play: { awarenessMarkers: false } })));
  await page.goto(base, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => Boolean(window.__valley), null, { timeout: 180000 });
  await page.evaluate(() => { window.__valley.placeAt(303, -103); window.__valley.holdFight(true); });
  await page.waitForFunction(() => document.querySelectorAll('.awareness-marker').length === 3, null, { timeout: 30000 });
  report.offSettingWorks = await page.locator('.awareness-marker').evaluateAll(elements => elements.every(el => el.hidden));
  if (!report.offSettingWorks) report.failures.push('Awareness markers off setting did not hide all markers');
} catch (error) {
  report.failures.push(String(error));
} finally {
  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ failures: report.failures, fallbacks: report.fallbacks.length, shots: report.shots.length, offSettingWorks: report.offSettingWorks }));
if (report.failures.length) process.exitCode = 1;
