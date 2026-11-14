// The Settings screen (docs/writing/interface.md, "Settings and controls"): a tab row (Display, Sound, Camera,
// Controller, Play, and Controls, which is its own screen), and one page of rows at a time. The rows, their
// defaults and their storage are in settings_pages_rules.ts; this file only draws them and writes what changes.

import { currentSettings, saveSettings } from './settings_store';
import type { SoundSettings } from './sound_settings';
import { rangeInput } from './settings_parts';
import {
  DIFFICULTY_BENEATH,
  NOT_YET,
  PAGE_LABEL,
  type PageId,
  type Row,
  type RowPath,
  difficultyNote,
  formatSlider,
  getAt,
  isSoundPath,
  resetPage,
  rowsFor,
  withAt,
} from './settings_pages_rules';

/** The sound volumes: the audio bank, which keeps them saved and applies them to the live graph. */
export interface SoundTarget {
  readonly values: SoundSettings;
  set<K extends keyof SoundSettings>(key: K, value: SoundSettings[K]): void;
  reset(): void;
}

export interface SettingsPagesDeps {
  /** Brightness applies live while the slider moves. */
  onBrightness(b: number): void;
  /** "Set brightness again" on Display: the caller hides the menu, shows the picture, and comes back here. */
  onBrightnessAgain(): void;
  /** The Controls tab: the caller opens its own screen. */
  onControls(): void;
  audio: SoundTarget;
}

const TABS: PageId[] = ['display', 'sound', 'camera', 'controller', 'play'];

export class SettingsPages {
  readonly el: HTMLElement;
  private readonly tabRow: HTMLElement;
  private readonly tabs = new Map<PageId, HTMLButtonElement>();
  private readonly body: HTMLElement;
  private page: PageId = 'display';

  constructor(private readonly deps: SettingsPagesDeps) {
    this.el = document.createElement('div');

    this.tabRow = document.createElement('div');
    this.tabRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;';
    for (const id of TABS) {
      const tab = button(PAGE_LABEL[id], () => this.show(id));
      this.tabs.set(id, tab);
      this.tabRow.append(tab);
    }
    // Controls opens its own screen, so it is never the active page here: it is always plain.
    const controls = button(PAGE_LABEL.controls, () => this.deps.onControls());
    controls.style.fontWeight = 'normal';
    this.tabRow.append(controls);

    this.body = document.createElement('div');
    this.el.append(this.tabRow, this.body);
  }

  /** Opens a page, redrawn from the values in use now. */
  show(page: PageId = this.page): void {
    if (page === 'controls') return; // Controls is its own screen, opened by the caller.
    this.page = page;
    this.render();
  }

  private render(): void {
    for (const [id, tab] of this.tabs) tab.style.fontWeight = id === this.page ? 'bold' : 'normal';
    this.body.replaceChildren();

    const heading = document.createElement('h3');
    heading.textContent = PAGE_LABEL[this.page];
    this.body.append(heading);

    for (const row of rowsFor(this.page)) {
      if (row.group) {
        const g = document.createElement('h4');
        g.textContent = row.group;
        g.style.margin = '14px 0 4px';
        this.body.append(g);
      }
      this.body.append(this.rowElement(row));
    }

    this.body.append(this.footer());
  }

  private rowElement(row: Row): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin:8px 0;';
    const line = document.createElement('div');
    line.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;';
    const label = document.createElement('span');
    label.textContent = row.label;
    label.style.minWidth = '210px';
    line.append(label, this.control(row));
    wrap.append(line);

    if (row.kind === 'choice' && row.path === 'play.difficulty') {
      const note = document.createElement('small');
      note.style.display = 'block';
      note.textContent = `${difficultyNote(String(this.value(row.path)))} ${DIFFICULTY_BENEATH}`;
      note.dataset.role = 'difficulty-note';
      wrap.append(note);
    } else if (row.note) {
      const note = document.createElement('small');
      note.style.display = 'block';
      note.textContent = row.note;
      wrap.append(note);
    }
    if (row.notYet) {
      const soon = document.createElement('small');
      soon.style.cssText = 'display:block;opacity:0.7;';
      soon.textContent = NOT_YET;
      wrap.append(soon);
    }
    return wrap;
  }

  private control(row: Row): HTMLElement {
    if (row.kind === 'slider') {
      const value = Number(this.value(row.path));
      const input = rangeInput(row.range, value);
      const out = document.createElement('span');
      out.textContent = formatSlider(row, value);
      input.addEventListener('input', () => {
        const v = Number(input.value);
        out.textContent = formatSlider(row, v);
        this.write(row.path, v);
        if (row.path === 'display.brightness') this.deps.onBrightness(v);
      });
      return group(input, out);
    }
    if (row.kind === 'switch') {
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = this.value(row.path) === true;
      box.addEventListener('change', () => this.write(row.path, box.checked));
      return box;
    }
    const select = document.createElement('select');
    row.options.forEach((opt, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = opt.label;
      select.append(option);
    });
    const current = this.value(row.path);
    select.value = String(Math.max(0, row.options.findIndex((o) => o.value === current)));
    select.addEventListener('change', () => {
      const chosen = row.options[Number(select.value)];
      this.write(row.path, chosen.value);
      if (row.path === 'play.difficulty') {
        const note = this.body.querySelector<HTMLElement>('[data-role="difficulty-note"]');
        if (note) note.textContent = `${difficultyNote(String(chosen.value))} ${DIFFICULTY_BENEATH}`;
      }
    });
    return select;
  }

  /** The value a row shows: a sound volume from the audio bank, anything else from the saved settings. */
  private value(path: RowPath): unknown {
    if (isSoundPath(path)) {
      const key = path.split('.')[1] as keyof SoundSettings;
      return this.deps.audio.values[key];
    }
    return getAt(currentSettings(), path);
  }

  /** Writes a row's value straight away: sound to the audio bank, settings to the saved settings. */
  private write(path: RowPath, value: unknown): void {
    if (isSoundPath(path)) {
      const key = path.split('.')[1] as 'master' | 'effects' | 'music' | 'muted';
      if (key === 'muted') this.deps.audio.set('muted', value as boolean);
      else this.deps.audio.set(key, value as number);
      return;
    }
    saveSettings(withAt(currentSettings(), path, value));
  }

  private footer(): HTMLElement {
    const foot = document.createElement('div');
    foot.style.cssText = 'margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;';

    const confirm = document.createElement('div');
    confirm.style.cssText = 'display:flex;gap:10px;align-items:center;';
    confirm.hidden = true;
    const ask = document.createElement('span');
    ask.textContent = 'Put this page back as it was?';
    confirm.append(ask, button('Yes', () => this.resetPage()), button('No', () => { confirm.hidden = true; }));

    if (this.page === 'display') foot.append(button('Set brightness again', () => this.deps.onBrightnessAgain()));
    foot.append(button('Back to defaults', () => { confirm.hidden = false; }), confirm);
    return foot;
  }

  private resetPage(): void {
    if (this.page === 'sound') {
      this.deps.audio.reset();
    } else {
      const next = resetPage(currentSettings(), this.page);
      saveSettings(next);
      if (this.page === 'display') this.deps.onBrightness(next.display.brightness);
    }
    this.render();
  }
}

/** Puts two controls side by side, the second a read-out of the first. */
function group(a: HTMLElement, b: HTMLElement): HTMLElement {
  const g = document.createElement('span');
  g.style.cssText = 'display:inline-flex;gap:8px;align-items:center;';
  g.append(a, b);
  return g;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
