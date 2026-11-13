// Controls page check (task 009 step 2b): opens the pause menu, goes to Controls, captures frames, and checks
// that a slot listens for a key, that Esc cancels a slot without closing the menu, and that a new key is saved.
// Usage: node scripts/controls_capture.mjs [baseUrl] [outDir]
//   defaults: http://localhost:4173/  and  docs/pr-media/controls
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'docs/pr-media/controls';
mkdirSync(outDir, { recursive: true });
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
// 960x540 is the frame size the pause menu and Controls page are reviewed at.
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console error: ${msg.text()}`); });
page.on('pageerror', (err) => errors.push(`page error: ${err.message}`));

await page.goto(base, { waitUntil: 'load', timeout: 120_000 });
await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, { timeout: 180_000 }).catch(() => {});
await page.click('canvas', { timeout: 60_000 });
await page.waitForTimeout(2000);

const controlsPage = page.locator('.pause .card').filter({ has: page.locator('h2', { hasText: 'Controls' }) });
const menuRow = page.locator('.pause button', { hasText: 'Controls' });

// Open the pause menu with Esc, then go to Controls.
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
check(await menuRow.isVisible(), 'pause menu shows a Controls button');
await page.screenshot({ path: join(outDir, 'pause_menu.png') });

await menuRow.click();
await page.waitForTimeout(300);
check(await controlsPage.isVisible(), 'Controls page opens from the pause menu');
await page.screenshot({ path: join(outDir, 'controls_page.png') });

// Start listening on Dodge's main slot, press J: the slot should take J and the page should show it.
const dodgeMain = page.locator('tr', { hasText: /^Dodge/ }).locator('button').first();
await dodgeMain.click();
await page.waitForTimeout(200);
check(await page.locator('.pause', { hasText: 'Press a key or button. Esc to cancel.' }).count() > 0, 'listening prompt shows');
await page.screenshot({ path: join(outDir, 'controls_listening.png') });
await page.keyboard.press('KeyJ');
await page.waitForTimeout(300);
const saved1 = await page.evaluate(() => localStorage.getItem('everylitwindow.settings.v1'));
check(saved1 !== null && saved1.includes('Key:KeyJ'), 'pressing J saves Key:KeyJ to the settings');
check(await controlsPage.isVisible(), 'the menu stays on Controls after a rebind');
check(!(await page.locator('.pause', { hasText: 'Press a key or button. Esc to cancel.' }).count()), 'listening ends after a rebind');
check(await page.locator('tr', { hasText: /^Dodge/ }).locator('button').first().innerText().then((t) => t.trim() === 'J'), 'Dodge main slot now reads J');

// Esc while listening cancels the slot and keeps the menu open; the game must not resume.
const attack = page.locator('tr', { hasText: /^Attack/ }).locator('button').first();
const attackBefore = await attack.innerText();
await attack.click();
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check(await controlsPage.isVisible(), 'Esc while listening keeps the Controls page open');
check((await attack.innerText()) === attackBefore, 'Esc while listening leaves the slot unchanged');

// Esc with nothing listening goes back to the menu page.
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check(await menuRow.isVisible() && !(await controlsPage.isVisible()), 'Esc on Controls returns to the pause menu');

await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check(!(await page.locator('.pause').isVisible()), 'Esc on the menu resumes play');

await page.screenshot({ path: join(outDir, 'resumed.png') });
await browser.close();

for (const e of errors) console.error(`  - ${e}`);
check(errors.length === 0, 'no console or page errors');

if (failures.length) {
  console.error(`Controls check FAILED (${failures.length}): ${failures.join('; ')}`);
  process.exit(1);
}
console.log(`Controls check passed: ${base}`);
