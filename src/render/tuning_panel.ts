// In-game debug panel: toggled with the backtick key. Sliders write straight into the live TUNING object,
// so the simulation and renderer pick changes up on the next frame. Owns no game state.

import { DEFAULT_TUNING, TUNING, resetTuning, setTuningValue, tuningJson } from '../config/tuning';
import type { AudioBank } from './audio';
import { buildDebugReport } from './debug_log';

interface SliderSpec {
  path: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

/** The main values the brief asks for. Ranges are deliberately wide enough to find a feel, not to break the sim. */
const SLIDERS: { group: string; items: SliderSpec[] }[] = [
  {
    group: 'Camera',
    items: [
      { path: 'camera.distance', label: 'Distance', min: 2, max: 8, step: 0.1 },
      { path: 'camera.shoulder', label: 'Shoulder offset', min: -2, max: 2, step: 0.05 },
    ],
  },
  {
    group: 'Hero',
    items: [
      { path: 'hero.walkSpeed', label: 'Walk speed', min: 0.5, max: 6, step: 0.05 },
      { path: 'hero.sprintSpeed', label: 'Sprint speed', min: 1, max: 10, step: 0.05 },
      { path: 'hero.dodgeSpeed', label: 'Dodge speed', min: 2, max: 15, step: 0.1 },
      { path: 'hero.dodgeTime', label: 'Dodge length (s)', min: 0.2, max: 1.2, step: 0.02 },
    ],
  },
  {
    group: 'Damage',
    items: [
      { path: 'sword.damage', label: 'Sword damage', min: 1, max: 60, step: 1 },
      { path: 'bow.minDamage', label: 'Bow damage (min)', min: 1, max: 30, step: 1 },
      { path: 'bow.maxDamage', label: 'Bow damage (full draw)', min: 5, max: 80, step: 1 },
      { path: 'soldier.damage', label: 'Soldier damage', min: 1, max: 40, step: 1 },
      { path: 'archer.arrowDamage', label: 'Arrow damage', min: 1, max: 40, step: 1 },
    ],
  },
  {
    group: 'Enemies',
    items: [
      { path: 'soldier.maxHp', label: 'Soldier HP', min: 10, max: 200, step: 1 },
      { path: 'archer.maxHp', label: 'Archer HP', min: 10, max: 150, step: 1 },
      { path: 'soldier.windupTime', label: 'Soldier wind-up (s)', min: 0.2, max: 2, step: 0.02 },
    ],
  },
];

const STYLE = `
  .tp { position: absolute; top: 12px; right: 12px; width: 300px; max-height: calc(100% - 24px); overflow: auto;
        pointer-events: auto; background: rgba(12, 17, 24, 0.94); border: 1px solid #3a4756; border-radius: 8px;
        padding: 12px 14px; font: 12px/1.3 system-ui, sans-serif; color: #f4f1e8; box-shadow: 0 6px 24px rgba(0,0,0,0.5); }
  .tp[hidden] { display: none; }
  .tp h2 { margin: 0 0 6px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #d9a441; }
  .tp h3 { margin: 10px 0 4px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; }
  .tp label { display: grid; grid-template-columns: 1fr 52px; gap: 2px 8px; align-items: center; margin: 4px 0; }
  .tp label span.name { grid-column: 1 / 2; }
  .tp label output { grid-column: 2 / 3; text-align: right; font-variant-numeric: tabular-nums; }
  .tp input[type=range] { grid-column: 1 / 3; width: 100%; margin: 0; }
  .tp .row { display: flex; gap: 8px; margin-top: 12px; }
  .tp button { flex: 1; padding: 6px 8px; font: inherit; font-weight: 700; border: 0; border-radius: 4px;
               background: #d9a441; color: #1b1407; cursor: pointer; }
  .tp button.alt { background: #2b3644; color: #f4f1e8; }
  .tp .msg { min-height: 14px; margin-top: 6px; opacity: 0.75; }
`;

/** Formats a value for its readout: whole numbers stay whole, fractions keep the slider's precision. */
function fmt(value: number, step: number): string {
  const digits = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  return value.toFixed(digits);
}

export class TuningPanel {
  private readonly root: HTMLDivElement;
  private readonly inputs = new Map<string, { input: HTMLInputElement; out: HTMLOutputElement; step: number }>();
  private readonly msg: HTMLDivElement;
  private readonly audioInputs: { set: () => void }[] = [];
  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.code !== 'Backquote' || e.repeat) return;
    e.preventDefault();
    this.toggle();
  };

  /**
   * @param uiRoot overlay element the panel is added to.
   * @param onOpenChange called with true when the panel opens, so the game can release the pointer.
   * @param audio the sound bank the Audio section controls.
   */
  constructor(
    uiRoot: HTMLElement,
    private readonly onOpenChange: (open: boolean) => void,
    private readonly audio: AudioBank,
  ) {
    const style = document.createElement('style');
    style.textContent = STYLE;
    uiRoot.appendChild(style);

    this.root = document.createElement('div');
    this.root.className = 'tp';
    this.root.hidden = true;
    this.root.innerHTML = '<h2>Tuning (` to close)</h2>';

    for (const group of SLIDERS) {
      const h = document.createElement('h3');
      h.textContent = group.group;
      this.root.appendChild(h);
      for (const spec of group.items) this.root.appendChild(this.slider(spec));
    }

    this.root.appendChild(this.audioSection());

    const row = document.createElement('div');
    row.className = 'row';
    row.appendChild(this.button('Copy config', true, () => void this.copyConfig()));
    row.appendChild(this.button('Reset', false, () => this.reset()));
    this.root.appendChild(row);

    const reportRow = document.createElement('div');
    reportRow.className = 'row';
    reportRow.appendChild(this.button('Copy debug report', false, () => void this.copyDebugReport()));
    this.root.appendChild(reportRow);

    this.msg = document.createElement('div');
    this.msg.className = 'msg';
    this.root.appendChild(this.msg);

    uiRoot.appendChild(this.root);
    window.addEventListener('keydown', this.onKey);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  toggle(): void {
    this.root.hidden = this.isOpen;
    if (this.isOpen) this.refresh();
    this.onOpenChange(this.isOpen);
  }

  private slider(spec: SliderSpec): HTMLLabelElement {
    const label = document.createElement('label');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = spec.label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    const out = document.createElement('output');
    input.addEventListener('input', () => {
      const v = Number(input.value);
      setTuningValue(spec.path, v);
      out.textContent = fmt(v, spec.step);
    });
    label.append(name, out, input);
    this.inputs.set(spec.path, { input, out, step: spec.step });
    return label;
  }

  /** Master, effects and music volume, plus mute. Saved in the browser through the audio bank. */
  private audioSection(): HTMLDivElement {
    const wrap = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = 'Audio';
    wrap.appendChild(h);

    const volume = (label: string, key: 'master' | 'effects' | 'music'): void => {
      const row = document.createElement('label');
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = '1';
      input.step = '0.01';
      const out = document.createElement('output');
      input.addEventListener('input', () => {
        const v = Number(input.value);
        this.audio.set(key, v);
        out.textContent = fmt(v, 0.01);
      });
      row.append(name, out, input);
      wrap.appendChild(row);
      this.audioInputs.push({
        set: () => {
          const v = this.audio.values[key];
          input.value = String(v);
          out.textContent = fmt(v, 0.01);
        },
      });
    };
    volume('Master volume', 'master');
    volume('Effects volume', 'effects');
    volume('Music volume (no music yet)', 'music');

    const mute = document.createElement('label');
    const muteBox = document.createElement('input');
    muteBox.type = 'checkbox';
    muteBox.addEventListener('change', () => this.audio.set('muted', muteBox.checked));
    mute.append(muteBox, ' Mute all sound');
    wrap.appendChild(mute);
    this.audioInputs.push({ set: () => { muteBox.checked = this.audio.values.muted; } });
    return wrap;
  }

  private button(text: string, primary: boolean, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    if (!primary) b.className = 'alt';
    b.addEventListener('click', onClick);
    return b;
  }

  /** Copies every slider's value from TUNING, e.g. after a reset. */
  private refresh(): void {
    for (const [path, { input, out, step }] of this.inputs) {
      const v = readPath(TUNING, path);
      input.value = String(v);
      out.textContent = fmt(v, step);
    }
    for (const a of this.audioInputs) a.set();
  }

  private reset(): void {
    resetTuning();
    this.audio.reset();
    this.refresh();
    this.say('Reset to shipped values.');
  }

  private async copyConfig(): Promise<void> {
    await this.copyText(tuningJson(), 'Config copied to the clipboard.');
  }

  /** Build, browser, settings, tuning and the recent event log, for a bug report. */
  private async copyDebugReport(): Promise<void> {
    const report = buildDebugReport({ audio: this.audio.values });
    await this.copyText(report, 'Debug report copied to the clipboard. Paste it into the bug report.');
  }

  private async copyText(text: string, success: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.say(success);
    } catch {
      // Clipboard can be blocked outside a secure context or without permission; show the text in the console instead.
      this.say('Clipboard blocked. Text printed to the console.');
      console.log(text);
    }
  }

  private say(text: string): void {
    this.msg.textContent = text;
  }
}

function readPath(obj: unknown, path: string): number {
  let node: unknown = obj;
  for (const k of path.split('.')) node = (node as Record<string, unknown>)[k];
  return node as number;
}

/** The default value for a slider path, for tests and the reset check. */
export function defaultFor(path: string): number {
  return readPath(DEFAULT_TUNING, path);
}
