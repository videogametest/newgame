// Item 27: the map, drawn as simply as the design allows (GAME_DESIGN.md section 4, "Map"): the valley's square, the
// hero, the places found, and which are freed. What it may show comes from src/core/tutorial/map.ts; nothing else is
// drawn, so an undiscovered place cannot leak. It does not pause the world (the design pauses only the inventory).
import { toMap, type MapView } from '../core/tutorial/map';

const SVG = 'http://www.w3.org/2000/svg';
export class MapPanel {
  readonly el: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly foot: HTMLElement;
  private last = '';
  open = false;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'valley-map'; this.el.hidden = true;
    this.el.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-52%);width:min(520px,70vh);'
      + 'padding:14px;background:#2a2418ee;border:1px solid #8a7550;border-radius:6px;pointer-events:none;';
    this.svg = document.createElementNS(SVG, 'svg');
    this.svg.setAttribute('viewBox', '0 0 100 100');
    this.svg.style.cssText = 'display:block;width:100%;aspect-ratio:1;background:#d9c9a0;border-radius:3px;';
    this.foot = document.createElement('div');
    this.foot.style.cssText = 'margin-top:8px;font:600 14px/1.3 system-ui,sans-serif;color:#f4ead2;text-align:center;';
    this.el.append(this.svg, this.foot);
    root.appendChild(this.el);
  }

  /** Draw only when what is shown changes. `foot` is the close prompt, from the bindings. */
  update(view: MapView, shown: boolean, foot: string): void {
    this.el.hidden = !shown;
    if (!shown) return;
    const key = JSON.stringify([view.entries.map(e => [e.id, e.status]), view.pointed, Math.round(view.hero.x), Math.round(view.hero.z), foot]);
    if (key === this.last) return;
    this.last = key;
    this.foot.textContent = foot;
    const at = (p: { x: number; z: number }) => { const m = toMap(p, view.extent); return { x: m.u * 100, y: m.v * 100 }; };
    const parts: string[] = ['<rect x="1" y="1" width="98" height="98" fill="none" stroke="#6b5a3a" stroke-width="0.6"/>'];
    const home = view.entries.find(e => e.kind === 'village');
    const pointed = view.entries.find(e => e.id === view.pointed);
    if (home && pointed) {
      const a = at(home), b = at(pointed);
      parts.push(`<line data-map-point="${pointed.id}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#7a2e1c" stroke-width="0.7" stroke-dasharray="2 1.4"/>`);
      parts.push(`<circle cx="${b.x}" cy="${b.y}" r="4.2" fill="none" stroke="#7a2e1c" stroke-width="0.7"/>`);
    }
    for (const e of view.entries) {
      const p = at(e);
      const fill = e.status === 'freed' ? '#e8b04a' : e.status === 'home' ? '#3d5a3a' : '#3a2e22';
      parts.push(`<circle data-map-site="${e.id}" data-status="${e.status}" cx="${p.x}" cy="${p.y}" r="${e.kind === 'village' ? 2.4 : 2}" fill="${fill}"/>`);
      parts.push(`<text x="${p.x}" y="${p.y - 3.6}" font-size="3.6" text-anchor="middle" fill="#2a2418" font-family="Georgia,serif">${escape(e.name)}</text>`);
    }
    const h = at(view.hero);
    parts.push(`<circle data-map-hero="1" cx="${h.x}" cy="${h.y}" r="1.3" fill="#f4ead2" stroke="#2a2418" stroke-width="0.5"/>`);
    this.svg.innerHTML = parts.join('');
  }
  dispose(): void { this.el.remove(); }
}
const escape = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));
