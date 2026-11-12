// Contact sheets: captures evenly spaced frames of each showcase clip and composes one grid image per clip.
// Usage: node scripts/contact_sheets.mjs [baseUrl] [outDir]
//   baseUrl default http://localhost:4173/ (vite preview of a build); outDir default docs/pr-media.
import { chromium } from 'playwright';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLIPS = ['sword_swing', 'bow_draw', 'bow_release', 'dodge', 'hit', 'death', 'soldier_windup', 'soldier_strike', 'archer_draw', 'archer_release'];
const FRAMES = 8;
const base = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'docs/pr-media';

async function captureClip(browser, clip, tmp) {
  const page = await browser.newPage({ viewport: { width: 640, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}?showcase=${clip}&t=0`, { waitUntil: 'load', timeout: 120_000 });
  await page.waitForFunction(() => window.__showcaseReady === true, null, { timeout: 180_000 });
  const files = [];
  for (let i = 0; i < FRAMES; i++) {
    const t = i / (FRAMES - 1);
    await page.evaluate((tt) => window.__showcaseSeek(tt), t);
    const file = join(tmp, `${clip}_${i}.png`);
    await page.locator('canvas').screenshot({ path: file });
    files.push({ file, t });
  }
  await page.close();
  if (errors.length) throw new Error(`${clip}: ${errors.join('; ')}`);
  return files;
}

async function sheet(clip, frames, tmp) {
  const cells = [];
  for (const f of frames) {
    const b64 = (await readFile(f.file)).toString('base64');
    cells.push(`<figure><img src="data:image/png;base64,${b64}"><figcaption>t = ${f.t.toFixed(2)}</figcaption></figure>`);
  }
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#111;color:#eee;font:16px system-ui,sans-serif;padding:14px;width:${4 * 330 + 28}px}
    h1{font-size:20px;margin:0 0 10px} .grid{display:grid;grid-template-columns:repeat(4,320px);gap:10px}
    figure{margin:0;background:#222;border-radius:6px;overflow:hidden} img{width:320px;height:360px;object-fit:cover;display:block}
    figcaption{padding:6px 8px;font-size:13px;opacity:.8}</style>
    <h1>${clip}</h1><div class="grid">${cells.join('')}</div>`;
  const htmlPath = join(tmp, `${clip}.html`);
  await writeFile(htmlPath, html);
  return htmlPath;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const tmp = await mkdtemp(join(tmpdir(), 'contact-'));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const shell = await browser.newPage({ viewport: { width: 1300, height: 800 } });
  const written = [];
  try {
    for (const clip of CLIPS) {
      const frames = await captureClip(browser, clip, tmp);
      const htmlPath = await sheet(clip, frames, tmp);
      await shell.goto(`file://${htmlPath}`);
      await shell.waitForLoadState('load');
      const out = join(outDir, `contact_${clip}.png`);
      await shell.screenshot({ path: out, fullPage: true });
      written.push(out);
      console.log(`wrote ${out}`);
    }
  } finally {
    await browser.close();
  }
  console.log(`${written.length} contact sheets`);
}

main().catch((e) => { console.error(e); process.exit(1); });
