// Renders public/icons/lantern.svg into the manifest's PNG icons with Chromium. Run after changing the SVG:
//   node scripts/item29_icons.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/icons/lantern.svg', 'utf8');
const browser = await chromium.launch();
try {
  for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 0.1]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    // Maskable: full-bleed night background, lantern inside the safe zone.
    const inner = Math.round(size * (1 - 2 * pad));
    await page.setContent(`<html><body style="margin:0;background:#0b1016;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">
      <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${inner}" height="${inner}"></body></html>`);
    await page.screenshot({ path: `public/icons/${name}`, omitBackground: pad === 0 });
    await page.close();
    console.log(`wrote public/icons/${name}`);
  }
} catch (e) { console.error(`icon render failed: ${e}`); process.exitCode = 1; } finally { await browser.close(); }
