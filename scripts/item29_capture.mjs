// Queue item 29: installable and offline checks on the actual built page in Chromium.
// Usage: node scripts/item29_capture.mjs URL OUT [--no-images] [--builds DIR_A,DIR_B] [--fixture PATH]
//   URL only (e.g. the live site): first visit online, cut the network (browser offline), reload, Continue, walk.
//   --builds A,B: this script serves the two built dist folders itself on URL's port. It runs the same offline
//   check with the server really stopped, then the update lifecycle: A playing, B deployed, B waits, title line,
//   no takeover while A plays, next start adopts B, saves/settings/unrelated cache untouched, then B offline.
// Saves come from scripts/item21_fixture.ts (a synthetic populated save, labelled as a fixture in the report);
// settings are a seeded fixture. Movement is real keyboard input (held W) after real clicks. Frames are taken
// once and not judged. Exit code 1 on any failed check.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const args = process.argv.slice(2);
const base = args[0] ?? 'http://localhost:4229/';
const out = args[1] ?? 'docs/pr-media/item29-installable';
const images = !args.includes('--no-images');
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const builds = opt('--builds')?.split(',') ?? null;
const fixturePath = opt('--fixture') ?? '/tmp/item21-fixture.json';
mkdirSync(out, { recursive: true });
const report = { url: base, mode: builds ? 'two local builds, own server' : 'given URL, browser offline', images,
  fixtures: ['save: scripts/item21_fixture.ts populatedGame() (synthetic)', 'settings: seeded {brightnessSet, quality medium, master 0.37}'],
  checks: [], failures: [], fallbacks: [], shots: [], requestFailures: [], notes: [], server: {} };
const check = (ok, message) => { report.checks.push({ passed: !!ok, message }); if (!ok) report.failures.push(message); console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`); };

if (!existsSync(fixturePath)) {
  console.log(`fixture ${fixturePath} missing: generating with vite-node scripts/item21_fixture.ts`);
  writeFileSync(fixturePath, execSync('npx vite-node scripts/item21_fixture.ts').toString());
}
const SAVE = JSON.stringify(JSON.parse(readFileSync(fixturePath, 'utf8')));
const SETTINGS = JSON.stringify({ version: 1, display: { brightnessSet: true, quality: 'medium' }, sound: { master: 0.37 } });

// ---- own static server (builds mode) ----
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.txt': 'text/plain', '.jpg': 'image/jpeg', '.wasm': 'application/wasm' };
const everServed = [];
let serveDir = null, server = null, served = [];
function startServer(dir) {
  serveDir = dir; down = false;
  if (server) return Promise.resolve();
  const port = Number(new URL(base).port || 80);
  server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, base).pathname);
    served.push(path); everServed.push(path);
    if (down) { req.socket.destroy(); return; } // network cut: every connection is dropped unanswered
    let file = normalize(join(serveDir, path === '/' ? 'index.html' : path));
    if (!file.startsWith(normalize(serveDir)) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(readFileSync(file));
  });
  return new Promise(r => server.listen(port, r));
}
let down = false;
/** Cuts the network at the server: keeps the port but drops every connection (and closes idle keep-alive ones). */
function stopServer() { down = true; server?.closeIdleConnections?.(); return Promise.resolve(); }
function closeServer() { return new Promise(r => { if (!server) return r(); server.closeAllConnections?.(); server.close(() => r()); server = null; }); }

// ---- page helpers ----
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const debugPages = [];
function watch(page, label) {
  debugPages.push([label, page]);
  page.on('pageerror', e => report.failures.push(`${label} page error: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') report.failures.push(`${label} console: ${m.text()}`); });
  page.on('requestfailed', r => report.requestFailures.push(`${label}: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) report.failures.push(`${label} HTTP ${r.status()}: ${r.url()}`); });
}
async function seeded(context) {
  await context.addInitScript(({ save, settings }) => {
    if (!localStorage.getItem('item29.seeded')) {
      localStorage.setItem('everylitwindow.save', save); localStorage.setItem('everylitwindow.settings.v1', settings);
      localStorage.setItem('item29.seeded', '1');
    }
  }, { save: SAVE, settings: SETTINGS });
}
async function ready(page) {
  await page.waitForFunction(() => window.__valley?.state().frame > 0 && window.__valley.state().drawCalls > 0, null, { timeout: 240000 });
}
async function stored(page) {
  return page.evaluate(() => ({ save: localStorage.getItem('everylitwindow.save'), settings: localStorage.getItem('everylitwindow.settings.v1') }));
}
const off = (page, expr) => page.evaluate(expr);
async function controlled(page) {
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 120000 });
}
async function version(page) { return page.evaluate(() => window.__offline.version()); }
async function noticeText(page) {
  const n = page.locator('[data-screen="title"] [data-notice="update"]');
  return (await n.count()) && await n.isVisible() ? n.innerText() : null;
}
async function continueAndWalk(page, label) {
  const title = page.locator('[data-screen="title"]');
  const cont = title.getByRole('button', { name: 'Continue', exact: true });
  check(await cont.count() === 1, `${label}: title offers Continue for the saved game`);
  await cont.click();
  await page.waitForFunction(() => !window.__valley.state().title, null, { timeout: 30000 });
  return walk(page, label);
}
async function walk(page, label) {
  if (await off(page, () => window.__valley.state().paused)) await page.getByRole('button', { name: 'Resume', exact: true }).click({ timeout: 15000 });
  if (!(await off(page, () => window.__valley.state().locked))) await page.click('canvas', { timeout: 30000 });
  await page.waitForFunction(() => window.__valley.state().locked && !window.__valley.state().paused, null, { timeout: 30000 })
    .catch(() => report.notes.push(`${label}: pointer lock not reported; walking anyway`));
  const a = await off(page, () => window.__valley.state());
  // Hold W for at least 1.5 s and at least 15 rendered frames (a busy headless browser renders slowly).
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1500);
  await page.waitForFunction(f => window.__valley.state().frame >= f + 15, a.frame, { timeout: 30000 }).catch(() => {});
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(300);
  const b = await off(page, () => window.__valley.state());
  const moved = Math.hypot(b.x - a.x, b.z - a.z);
  check(moved > 0.5 && b.frame > a.frame, `${label}: held W walks the hero ${moved.toFixed(2)} m (frames ${a.frame}->${b.frame})`);
  return moved;
}
async function shot(page, name) {
  if (!images) return;
  try { const path = join(out, `${name}.png`); await page.screenshot({ path, timeout: 20000 }); report.shots.push(path); }
  catch (e) { report.fallbacks.push({ name, method: 'no image; no canvas substitute', error: String(e) }); }
}
async function cacheInfo(page) {
  return page.evaluate(async () => {
    const names = await caches.keys(); const out = {};
    for (const n of names) out[n] = (await (await caches.open(n)).keys()).length;
    return out;
  });
}
/** Same-origin files this page loaded (resource timing). */
async function loadedFiles(page) {
  return page.evaluate(() => [...new Set(performance.getEntriesByType('resource').map(e => new URL(e.name)).filter(u => u.origin === location.origin).map(u => u.pathname))]);
}

async function offlineRun(label, cut, restore) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await seeded(context);
  const page = await context.newPage(); watch(page, `${label}/online`);
  await page.goto(base, { waitUntil: 'load', timeout: 120000 }); await ready(page);
  await controlled(page);
  const kept = await off(page, () => window.__offline.keep());
  const st = await off(page, () => window.__offline.state());
  report.notes.push(`${label}: first visit offline state ${JSON.stringify(st)}, explicit keep call kept ${kept} more`);
  check(st.registered && st.controlled, `${label}: worker registered and controls the first-visit page`);
  const manifest = await off(page, async () => { const l = document.querySelector('link[rel=manifest]'); const r = await fetch(l.href); return r.ok ? r.json() : null; });
  check(manifest?.display === 'standalone' && manifest.icons?.some(i => i.sizes === '512x512') && manifest.icons?.some(i => i.sizes === '192x192'),
    `${label}: manifest linked, standalone, 192 and 512 icons`);
  for (const icon of manifest?.icons ?? []) {
    const ok = await page.evaluate(async src => (await fetch(src)).ok, icon.src);
    check(ok, `${label}: icon ${icon.src} loads`);
  }
  const before = await stored(page);
  const online = await continueAndWalk(page, `${label} online first visit`);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const afterPlay = await stored(page);
  const files = await loadedFiles(page);
  const caches1 = await cacheInfo(page);
  report.notes.push(`${label}: first visit loaded ${files.length} same-origin files; caches ${JSON.stringify(caches1)}`);
  await cut(context);
  const failuresBefore = report.requestFailures.length;
  page.removeAllListeners('requestfailed'); watch(page, `${label}/offline`);
  await page.reload({ waitUntil: 'load', timeout: 120000 }); await ready(page);
  const offlineStored = await stored(page);
  check(offlineStored.save === afterPlay.save && offlineStored.settings === afterPlay.settings, `${label}: save and settings unchanged across the offline reload`);
  check(before.settings === offlineStored.settings, `${label}: seeded settings intact`);
  await shot(page, `${label}-offline-title`);
  await continueAndWalk(page, `${label} offline after reload`);
  await shot(page, `${label}-offline-game`);
  const offFiles = await loadedFiles(page);
  const failed = report.requestFailures.slice(failuresBefore);
  check(failed.length === 0, `${label}: no request failed offline (${offFiles.length} same-origin files served by the worker)${failed.length ? `: ${failed.slice(0, 5).join('; ')}` : ''}`);
  report.server[`${label}-offline-hits`] = builds ? served.length : 'n/a (browser offline)';
  if (builds) check(served.filter(p => p !== '/sw.js').length === 0, `${label}: no file was asked of the cut server offline (worker update checks to /sw.js: ${served.filter(p => p === '/sw.js').length})`);
  report.notes.push(`${label}: online walk ${online.toFixed(2)} m; offline load needed ${offFiles.length} files`);
  await restore(context);
  await context.close();
}

try {
  if (!builds) {
    await offlineRun('url', c => c.setOffline(true), c => c.setOffline(false));
  } else {
    const [A, B] = builds;
    await startServer(A);
    if (!args.includes('--skip-offline')) await offlineRun('build-a', async c => { await stopServer(); served = []; await c.setOffline(true); },
      async c => { await c.setOffline(false); await startServer(A); });

    // ---- update lifecycle ----
    served = [];
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    context.on('serviceworker', w => console.log(`worker started: ${w.url()}`));
    await seeded(context);
    const one = await context.newPage(); watch(one, 'tab1');
    await one.goto(base, { waitUntil: 'load', timeout: 120000 }); await ready(one); await controlled(one);
    await off(one, () => window.__offline.keep());
    const vA = await version(one);
    await off(one, async () => { const c = await caches.open('unrelated-test'); await c.put('/unrelated', new Response('keep me')); });
    await continueAndWalk(one, 'tab1 playing A');
    // Headless swiftshader: while a game renders with the pointer locked, Chromium never ran the worker update
    // fetch (registration.update() stayed pending, the server saw no request; measured, see report notes).
    // So tab1 goes to the game's own pause menu (still mid-session) while B is fetched, and plays again after.
    await one.keyboard.press('Escape');
    await one.waitForFunction(() => window.__valley.state().paused, null, { timeout: 15000 });
    report.notes.push('tab1 paused mid-game (Esc) while B was fetched: a headless capture limitation, not a game rule');    await one.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const storedA = await stored(one);
    const pageA = await off(one, async () => (await fetch('/index.html')).text());

    served = [];
    serveDir = B; report.notes.push('deployed B: the server now serves the second build');
    const pageB = readFileSync(join(B, 'index.html'), 'utf8');
    check(pageA !== pageB, 'The two builds have different pages (different script hashes)');
    const two = await context.newPage(); watch(two, 'tab2');
    await two.goto(base, { waitUntil: 'load', timeout: 120000 }); await ready(two);
    for (let i = 0; ; i++) {
      if (await two.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)) break;
      if (i % 15 === 14) report.notes.push(`tab2 update check ${i}: ${await two.evaluate(async () => {
        const r = await navigator.serviceWorker.getRegistration();
        return Promise.race([r.update().then(() => 'ok', e => String(e)), new Promise(z => setTimeout(() => z('update() still pending after 10 s'), 10000))]); })}; server saw ${served.length}`);
      if (i % 15 === 14) console.log(report.notes.at(-1));
      if (i > 180) throw new Error('B never reached waiting'); await two.waitForTimeout(1000);
    }
    await two.waitForFunction(() => window.__offline.state().updateReady, null, { timeout: 30000 });
    check(await version(two) === vA && await version(one) === vA, `While tab1 plays, both tabs stay on version A (${vA})`);
    check(await off(two, () => window.__offline.state().start) === 'none', 'tab2 opened before B finished installing: no takeover');
    const line = await noticeText(two);
    check(line === 'An update is ready. It will be used the next time you start.', `tab2 title shows the one update line: ${JSON.stringify(line)}`);
    await shot(two, 'update-ready-title');
    // The playing tab never mixes: its page and files still come from A's cache.
    check(await off(one, async () => (await fetch('/index.html')).text()) === pageA, 'tab1 (playing) still gets build A\'s page from its cache');
    check(await off(one, () => !window.__valley.state().title), 'tab1 is still in its game');
    await one.bringToFront(); await walk(one, 'tab1 still playing A after B waits');
    check(await version(one) === vA, 'tab1 resumed and walked on A after B was fetched');
    await one.keyboard.press('Escape'); await one.waitForFunction(() => window.__valley.state().paused, null, { timeout: 15000 });
    await two.bringToFront();
    // tab2 reload: tab1 is still open, so B keeps waiting and the line stays.
    await two.reload({ waitUntil: 'load' }); await ready(two);
    check(await off(two, () => window.__offline.state().start) === 'kept-old' && await version(two) === vA, 'tab2 restarted while tab1 plays: B still waits, A kept');
    check(await noticeText(two) !== null, 'tab2 title still shows the update line');
    const reg = await off(two, async () => { const r = await navigator.serviceWorker.getRegistration(); return { active: !!r.active, waiting: !!r.waiting }; });
    check(reg.active && reg.waiting, 'B is installed and waiting, not active');
    // Next start: tab1 closed, the only window starts again and takes B before its title.
    await one.close();
    await two.waitForTimeout(1000);
    // tab1 kept playing (and saving) after storedA; the save to keep is the one on disk right before the next start.
    const storedBeforeUpdate = await stored(two);
    report.notes.push(`save changed by tab1 play after first read: ${storedBeforeUpdate.save !== storedA.save}`);
    report.notes.push(`windows before next start: ${JSON.stringify(await two.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting ? 'B waiting' : 'none waiting'))}`);
    await two.reload({ waitUntil: 'load' });
    await two.waitForFunction(() => window.__offline?.state().start === 'adopted', null, { timeout: 120000 })
      .catch(async e => { report.notes.push(`adopt wait: ${JSON.stringify(await two.evaluate(() => window.__offline?.state()))}`); throw e; });
    await ready(two);
    const vB = await version(two);
    check(vB && vB !== vA, `Next start adopted B (${vA} -> ${vB})`);
    check(await off(two, async () => (await fetch('/index.html')).text()) === pageB, 'The page now is build B\'s');
    check(await noticeText(two) === null, 'No update line once B is in use');
    const storedB = await stored(two);
    check(storedB.save === storedBeforeUpdate.save, 'Save byte-identical across the update (as on disk right before the next start)');
    check(storedB.settings === storedBeforeUpdate.settings && storedB.settings === SETTINGS, 'Settings byte-identical across the update (still the seeded settings)');
    const cachesB = await cacheInfo(two);
    report.notes.push(`caches after update: ${JSON.stringify(cachesB)}`);
    check(Object.keys(cachesB).includes('unrelated-test'), 'Unrelated cache kept');
    check(Object.keys(cachesB).filter(n => n.startsWith('everylitwindow-')).join() === `everylitwindow-${vB}`, 'Only B\'s game cache remains');
    await shot(two, 'after-update-title');
    await continueAndWalk(two, 'B after update');
    // B offline: kept files were carried over.
    await stopServer(); served = []; await context.setOffline(true);
    const failuresBefore = report.requestFailures.length;
    await two.reload({ waitUntil: 'load' }); await ready(two);
    await continueAndWalk(two, 'B offline after update');
    await shot(two, 'after-update-offline-game');
    check(report.requestFailures.length === failuresBefore && served.filter(p => p !== '/sw.js').length === 0, `B offline: no failed request, no file asked of the cut server (sw.js checks ${served.length})`);
    await context.close();
  }
} catch (e) {
  report.failures.push(`run stopped: ${e?.stack ?? e}`);
  console.log(`ever served ${everServed.length}, last: ${everServed.slice(-15).join(' ')}; connections ${await new Promise(r => server ? server.getConnections((e, n) => r(n)) : r('no server'))}`);
  console.log(`server: ${served.length} requests since last reset; sw.js ${served.filter(x => x === '/sw.js').length}; last ${served.slice(-8).join(' ')}`);
  for (const [label, page] of debugPages) {
    const d = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration();
      return { offline: window.__offline?.state(), active: r?.active?.state, waiting: r?.waiting?.state, installing: r?.installing?.state,
        controller: !!navigator.serviceWorker.controller, title: window.__valley?.state().title }; }).catch(err => String(err));
    report.notes.push(`at stop, ${label}: ${JSON.stringify(d)}`); console.log(`at stop, ${label}: ${JSON.stringify(d)}`);
  }
  console.log(`FAIL run stopped: ${e}`);
} finally {
  await browser.close(); await closeServer();
  writeFileSync(join(out, images ? 'report.json' : 'report-no-images.json'), JSON.stringify(report, null, 2));
}
console.log(`${report.checks.filter(c => c.passed).length}/${report.checks.length} checks, ${report.failures.length} failures, ${report.fallbacks.length} fallbacks, ${report.shots.length} shots`);
process.exit(report.failures.length ? 1 : 0);
