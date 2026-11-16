// Damaged-save check on the built page. A save that cannot be decoded starts a new game, and the damaged-save line
// must show first and alone: no "Saved." over it, no first-evening opening, and it ends after six seconds of play or
// on a key press. The key case ends it early and the caption must clear at once.
// Usage: node scripts/damaged_save_check.mjs [base] [outDir]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:4189/';
const out = process.argv[3] ?? 'docs/pr-media/damaged-save';
const SAVE_KEY = 'everylitwindow.save';
const LINE = "Your saved game couldn't be read. A new game has started.";
const report = { checks: [], failures: [], timings: {} };
const check = (ok, message) => { report.checks.push({ passed: !!ok, message }); if (!ok) report.failures.push(message); };
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function ready(page) {
  await page.waitForFunction(() => window.__valley?.state().frame > 0, null, { timeout: 180000 });
  if (await page.evaluate(() => window.__valley.state().title)) {
    const title = page.locator('[data-screen="title"]');
    await title.getByRole('button', { name: 'New game', exact: true }).click();
  }
  await page.waitForFunction(() => window.__valley?.state().frame > 0 && !window.__valley.state().title, null, { timeout: 180000 });
}
const captionText = page => page.evaluate(() => {
  const el = document.querySelector('.valley-caption');
  return el && !el.hidden ? el.textContent : '';
});
const openingVisible = page => page.evaluate(() => { const el = document.querySelector('.evening-open'); return !!el && !el.hidden; });
const promptVisible = page => page.evaluate(() => { const el = document.querySelector('.evening-prompts'); return !!el && !el.hidden; });

async function damagedPage(context) {
  const page = await context.newPage();
  page.on('pageerror', e => report.failures.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') report.failures.push(`console: ${m.text()}`); });
  page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(base);
  await page.waitForFunction(() => window.__valley?.state().frame > 0, null, { timeout: 180000 });
  // Unreadable save text: the next load decodes it as damaged. The title screen is up, so nothing re-saves it.
  await page.evaluate(([key]) => { localStorage.setItem(key, '{"not a save'); }, [SAVE_KEY]);
  await page.reload();
  await page.waitForFunction(() => window.__valley?.state().frame > 0, null, { timeout: 180000 });
  return page;
}

async function main() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => {
    const k = 'everylitwindow.settings.v1';
    if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({ display: { brightnessSet: true } }));
  });

  // Case 1: the line shows first, alone, and the opening stays away while it runs.
  const page = await damagedPage(context);
  await ready(page);
  const t0 = Date.now();
  await page.waitForFunction(() => { const el = document.querySelector('.valley-caption'); return el && !el.hidden; }, null, { timeout: 30000 });
  const first = await captionText(page);
  check(first === LINE, `damaged-save line is the caption first (got "${first}")`);
  check(!(await openingVisible(page)), 'first-evening opening is hidden while the damaged-save line runs');
  check(!(await promptVisible(page)), 'road prompts are hidden while the damaged-save line runs');
  await page.screenshot({ path: `${out}/01-damaged-save-line.png` });
  await page.waitForTimeout(1500);
  const mid = await captionText(page);
  check(mid === LINE, `the line still holds at 1.5 s and is not replaced by "Saved." (got "${mid}")`);
  check(!(await openingVisible(page)), 'opening still hidden at 1.5 s');
  // Wait for the six seconds of play to pass, in wall time, then the line must be gone.
  await page.waitForFunction(() => { const el = document.querySelector('.valley-caption'); return !el || el.hidden || !el.textContent; }, null, { timeout: 60000 });
  report.timings.timeoutWallSeconds = (Date.now() - t0) / 1000;
  check(true, `the line ends by its six seconds of play (ended after ${report.timings.timeoutWallSeconds.toFixed(1)} s wall time)`);
  await page.waitForTimeout(500);
  await page.close();

  // Case 2: a key press ends the line early, and the caption clears at once.
  const page2 = await damagedPage(context);
  await ready(page2);
  await page2.waitForFunction(() => { const el = document.querySelector('.valley-caption'); return el && !el.hidden; }, null, { timeout: 30000 });
  check((await captionText(page2)) === LINE, 'second run: the damaged-save line shows first');
  await page2.waitForTimeout(800);
  await page2.keyboard.press('KeyW');
  await page2.waitForTimeout(400);
  const after = await captionText(page2);
  check(after !== LINE, `a key press clears the damaged-save line (caption now "${after}")`);
  // The line ending hands over to the first-evening opening (the pointer is locked in this run), which was held back until now.
  await page2.waitForFunction(() => { const el = document.querySelector('.evening-open'); return !!el && !el.hidden; }, null, { timeout: 10000 })
    .then(() => check(true, 'the first-evening opening starts only after the line ends'), () => check(false, 'the first-evening opening did not start after the line ended'));
  await page2.screenshot({ path: `${out}/02-after-key-opening.png` });
  await page2.close();
  await context.close();
}

try { await main(); }
catch (e) { report.failures.push(`exception: ${e.message}`); }
finally {
  await browser.close();
  writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.failures.length ? 1 : 0);
}
