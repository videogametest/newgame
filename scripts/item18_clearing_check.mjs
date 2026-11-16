// Item 18 live check on the built page. The fight loop is the only producer of `dead` and of the Mill's clearing,
// and the browser has no kill hook, so the defenders start as a save fixture recorded as dead. The real loop then
// clears the Mill, the real lantern hook lights it, and a reload must keep it freed.
// Usage: node scripts/item18_clearing_check.mjs [base] [outDir]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:4189/';
const out = process.argv[3] ?? 'docs/pr-media/item18-cleared';
const SAVE_KEY = 'everylitwindow.save';
const FIRST_GARRISON = ['harl_gadd', 'dob_finch', 'wyll_carrow', 'bran_oakes', 'nessa_roke', 'pim', 'odo_varn'];
const report = { checks: [], failures: [] };
const check = (ok, message) => { report.checks.push({ passed: !!ok, message }); if (!ok) report.failures.push(message); };
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function open(context) {
  const page = await context.newPage();
  page.on('pageerror', e => report.failures.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') report.failures.push(`console: ${m.text()}`); });
  page.on('response', r => { if (r.status() >= 400) report.failures.push(`HTTP ${r.status()}: ${r.url()}`); });
  return page;
}
async function ready(page) {
  await page.waitForFunction(() => window.__valley?.state().frame > 0, null, { timeout: 180000 });
  if (await page.evaluate(() => window.__valley.state().title)) {
    const title = page.locator('[data-screen="title"]');
    const resume = title.getByRole('button', { name: 'Continue', exact: true });
    if (await resume.count()) await resume.click(); else await title.getByRole('button', { name: 'New game', exact: true }).click();
  }
  await page.waitForFunction(() => window.__valley?.state().frame > 0 && !window.__valley.state().title, null, { timeout: 180000 });
}
async function loadFixture(page, state) {
  await page.evaluate(([key, value]) => { localStorage.setItem('harness.fixture', value); localStorage.setItem(key, value); }, [SAVE_KEY, JSON.stringify(state)]);
  await page.reload();
}
const millOf = page => page.evaluate(() => window.__valley.savedState().places.find(p => p.id === 'mill'));

async function main() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  // A fresh profile opens the first-start brightness picture, which freezes the hero and clock. Mark it as already set.
  await context.addInitScript(() => {
    const k = 'everylitwindow.settings.v1';
    if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({ display: { brightnessSet: true } }));
    // The page's pagehide autosave overwrites the save on reload, so a fixture is re-applied from its own key on each load.
    const fixture = localStorage.getItem('harness.fixture');
    if (fixture) localStorage.setItem('everylitwindow.save', fixture);
  });
  const page = await open(context);
  await page.goto(base);
  await ready(page);
  const lantern = await page.evaluate(() => window.__valley.lanternState().position);
  const seed = await page.evaluate(() => window.__valley.savedState());
  const fixture = structuredClone(seed);
  fixture.places.find(p => p.id === 'mill').status = 'held';
  fixture.bandits = Object.fromEntries(FIRST_GARRISON.map(id => [id, 'dead']));
  fixture.hero.position = { x: lantern.x - 0.5, z: lantern.z };
  // Negative case first: six down, one alive, must stay held after the real loop has run.
  const six = structuredClone(fixture); six.bandits.pim = 'alive';
  await loadFixture(page, six); await ready(page);
  await page.waitForFunction(() => window.__valley.state().frame > 240, null, { timeout: 180000 });
  const held = await millOf(page);
  check(held.status === 'held', `six down and one alive keeps the Mill held (got ${held.status})`);

  // Positive case: all seven down, the real loop must clear it.
  await loadFixture(page, fixture); await ready(page);
  await page.waitForFunction(() => window.__valley.savedState().places.find(p => p.id === 'mill').status === 'cleared', null, { timeout: 180000 });
  check(true, 'all seven down: the real loop clears the Mill');
  await page.screenshot({ path: `${out}/01-cleared.png` });
  const available = await page.evaluate(() => window.__valley.lanternState().available);
  check(available, 'cleared Mill: the lantern is available from the hero position');

  const lit = await page.evaluate(() => window.__valley.interactLantern());
  check(lit, 'interactLantern lights the cleared Mill');
  await page.waitForFunction(() => window.__valley.savedState().places.find(p => p.id === 'mill').status === 'freed', null, { timeout: 60000 }).catch(() => {});
  const freed = await millOf(page);
  check(freed.status === 'freed' && freed.timesFreed === 1, `lit lantern frees the Mill (got ${freed.status}, timesFreed ${freed.timesFreed})`);
  await page.waitForTimeout(1500);

  await page.evaluate(() => localStorage.removeItem('harness.fixture'));
  await page.reload(); await ready(page);
  const after = await millOf(page);
  check(after.status === 'freed' && after.timesFreed === 1, `after reload the Mill is still freed (got ${after.status}, timesFreed ${after.timesFreed})`);
  await page.screenshot({ path: `${out}/02-freed-after-reload.png` });
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
