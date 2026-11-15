// Item 17. The caption for a line the hero overhears at the Mill. It floats over the speaker's head, the way the
// fighter bars do, and is separate from the valley's bottom caption (Bram's words). The sim decides what is said
// and when; this file only draws it.
import type { OverhearCaption } from '../core/places/mill_overhear';

/** World point to canvas CSS pixels. visible is false when the point is behind the camera. */
export type ScreenOf = (x: number, y: number, z: number) => { x: number; y: number; visible: boolean };

/** The caption as the Mill snapshot gives it: the words, and where the speaker stands. */
export interface OverheardView extends OverhearCaption {
  x: number;
  y: number;
  z: number;
  height: number;
}

export class ValleyOverheard {
  private readonly root: HTMLElement;
  private readonly label: HTMLElement;
  private readonly text: HTMLElement;
  private shown: string | null = null;

  constructor(uiRoot: HTMLElement, private readonly screenOf: ScreenOf) {
    this.root = document.createElement('div');
    this.root.className = 'overheard-caption';
    this.root.hidden = true;
    this.root.setAttribute('aria-live', 'off');
    this.root.style.cssText = 'position:absolute;left:0;top:0;max-width:260px;transform:translate(-50%,-100%);font:500 14px/1.35 system-ui,sans-serif;color:#f4ead2;text-shadow:0 1px 3px #000;pointer-events:none;text-align:center;';
    this.label = document.createElement('div');
    this.label.style.cssText = 'font-weight:700;font-size:12px;opacity:0.85;';
    this.text = document.createElement('div');
    this.text.style.cssText = 'font-style:italic;';
    this.root.append(this.label, this.text);
    uiRoot.appendChild(this.root);
  }

  /** Shows the current line above its speaker, or hides it. `allowed` is false while paused, in the picture or with the chrome hidden. */
  update(caption: OverheardView | null, allowed: boolean): void {
    if (!caption || !allowed) {
      this.root.hidden = true;
      this.shown = null;
      return;
    }
    const p = this.screenOf(caption.x, caption.y + caption.height + 0.35, caption.z);
    this.root.hidden = !p.visible;
    this.root.dataset.exchange = caption.exchangeId;
    this.root.dataset.speaker = caption.speakerId;
    if (!p.visible) return;
    const key = `${caption.exchangeId}|${caption.speakerId}|${caption.text}`;
    if (key !== this.shown) {
      this.shown = key;
      this.label.textContent = caption.label;
      this.text.textContent = `\u201C${caption.text}\u201D`;
    }
    this.root.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
  }

  dispose(): void {
    this.root.remove();
  }
}
