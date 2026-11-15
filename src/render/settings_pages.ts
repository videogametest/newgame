// The Settings screen (docs/writing/interface.md, "Settings and controls"): one card, the same size and place for every
// page, with a row of page names across the top (Controls opens its own screen), the page's rows in two columns, and
// Back and Back to defaults fixed at the foot. The rows, their defaults and their storage are in settings_pages_rules.ts;
// this file only draws them and writes what changes.
// Layout matches the Controls card (controls_page.ts): the body scrolls and fades out at its bottom edge.

import { currentSettings, saveSettings } from './settings_store';
import type { SoundSettings } from './sound_settings';
import { rangeInput } from './settings_parts';
import {
  DIFFICULTY_BENEATH,
  PAGE_LABEL,
  type PageId,
  type Row,
  type RowPath,
  SOON_FOOT,
  SOON_MARK,
  difficultyNote,
  formatSlider,
  getAt,
  isSoundPath,
  pageHasSoon,
  resetPage,
  rowsFor,
  withAt,
} from './settings_pages_rules';
import type { Settings } from '../core/settings/settings';

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
  /** Back: the caller goes back to the pause menu. */
  onBack(): void;
  audio: SoundTarget;
}

const TABS: PageId[] = ['display', 'sound', 'camera', 'controller', 'play'];
const GOLD = '#d9a441';
const INK = '#1b1407';
const ROW_HEIGHT = 60; // px per setting row: every row is this tall, so the columns line up down the page
const COLUMNS = 'minmax(0, 260px) minmax(0, 1fr)'; // name, control: shared by every row and group heading

export class SettingsPages {
  readonly el: HTMLElement;
  private readonly tabs = new Map<PageId, HTMLButtonElement>();
  private readonly scroll: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly scrollHint: HTMLElement;
  private readonly foot: HTMLElement;
  private readonly footer: HTMLElement;
  private readonly confirm: HTMLElement;
  private page: PageId = 'display';

  constructor(private readonly deps: SettingsPagesDeps) {
    // The card takes the Controls card's size and place, so every page is the same.
    this.el = document.createElement('div');
    this.el.className = 'card';
    this.el.hidden = true;
    Object.assign(this.el.style, {
      width: 'min(760px, 92vw)',
      maxWidth: 'none',
      height: '80vh',
      boxSizing: 'border-box',
      padding: '16px 24px',
      textAlign: 'left',
      lineHeight: '1.4',
    });

    const inner = document.createElement('div');
    Object.assign(inner.style, { display: 'flex', flexDirection: 'column', height: '100%', minHeight: '0' });

    const heading = document.createElement('h2');
    heading.textContent = 'Settings';
    Object.assign(heading.style, { margin: '0 0 10px', fontSize: '22px', letterSpacing: '0.04em', flex: 'none' });

    const tabRow = document.createElement('div');
    Object.assign(tabRow.style, { display: 'flex', gap: '6px', flex: 'none', flexWrap: 'nowrap' });
    for (const id of TABS) {
      const tab = chip(PAGE_LABEL[id], false, () => this.show(id));
      this.tabs.set(id, tab);
      tabRow.append(tab);
    }
    // Controls opens its own screen, so it is never the active page here.
    tabRow.append(chip(PAGE_LABEL.controls, false, () => this.deps.onControls()));

    // The body scrolls under the tabs; a fade lies over its bottom edge while more rows remain.
    const viewport = document.createElement('div');
    Object.assign(viewport.style, { flex: '1 1 0', minHeight: '0', position: 'relative', marginTop: '12px' });
    this.scroll = document.createElement('div');
    Object.assign(this.scroll.style, { height: '100%', overflowY: 'auto', paddingRight: '4px' });
    this.grid = document.createElement('div');
    Object.assign(this.grid.style, { display: 'grid', gridTemplateColumns: COLUMNS, columnGap: '20px' });
    this.scroll.append(this.grid);
    this.scrollHint = document.createElement('div');
    this.scrollHint.setAttribute('aria-hidden', 'true');
    Object.assign(this.scrollHint.style, {
      position: 'absolute', left: '0', right: '0', bottom: '0', height: '36px', pointerEvents: 'none',
      background: 'linear-gradient(to bottom, rgba(16, 22, 30, 0), rgba(16, 22, 30, 0.94))', display: 'none',
    });
    viewport.append(this.scroll, this.scrollHint);
    this.scroll.addEventListener('scroll', () => this.updateScrollHint());

    // The foot line for "soon" keeps its height on every page, so the body is never resized by it.
    this.foot = document.createElement('div');
    Object.assign(this.foot.style, { fontSize: '13px', opacity: '0.75', height: '22px', flex: 'none', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden' });

    this.footer = document.createElement('div');
    Object.assign(this.footer.style, { display: 'flex', alignItems: 'center', gap: '10px', height: '44px', flex: 'none' });
    this.confirm = document.createElement('div');
    this.confirm.hidden = true;
    const question = document.createElement('span');
    question.textContent = 'Put this page back as it was? ';
    this.confirm.append(question, chip('Yes', true, () => this.resetPage()), chip('No', false, () => this.setConfirm(false)));

    inner.append(heading, tabRow, viewport, this.foot, this.footer);
    this.el.append(inner);
    window.addEventListener('resize', () => this.updateScrollHint());
  }

  /** Opens a page, redrawn from the values in use now. */
  show(page: PageId = this.page): void {
    if (page === 'controls') return; // Controls is its own screen, opened by the caller.
    this.page = page;
    this.render();
    this.scroll.scrollTop = 0;
  }

  /** Puts the confirm question away when the card is closed, so it is not open the next time. */
  close(): void {
    this.setConfirm(false);
  }

  private render(): void {
    for (const [id, tab] of this.tabs) setChip(tab, id === this.page);
    this.grid.replaceChildren();

    for (const row of rowsFor(this.page)) {
      if (row.group) this.grid.append(groupHeading(row.group));
      this.grid.append(this.nameCell(row), this.controlCell(row));
      const note = this.noteFor(row);
      if (note) this.grid.append(note);
    }

    this.foot.textContent = pageHasSoon(this.page) ? SOON_FOOT : '';
    this.footer.replaceChildren(...this.footerButtons());
    this.updateScrollHint();
  }

  /** The name of a row, with the "soon" mark beside it when nothing in the game reads the setting yet. */
  private nameCell(row: Row): HTMLElement {
    const cell = rowCell();
    cell.style.gap = '8px';
    const label = document.createElement('span');
    label.textContent = row.label;
    if (row.notYet) label.style.opacity = '0.6';
    cell.append(label);
    if (row.notYet) {
      const soon = document.createElement('span');
      soon.textContent = SOON_MARK;
      soon.dataset.role = 'soon';
      Object.assign(soon.style, {
        fontSize: '11px', color: GOLD, border: `1px solid ${GOLD}`, borderRadius: '999px', padding: '0 7px', lineHeight: '17px', opacity: '0.8',
      });
      cell.append(soon);
    }
    return cell;
  }

  private controlCell(row: Row): HTMLElement {
    const cell = rowCell();
    cell.append(this.control(row));
    return cell;
  }

  /** A note under a row, across both columns: the difficulty's rule, or a plain note. Null when there is none. */
  private noteFor(row: Row): HTMLElement | null {
    let text: string | undefined;
    if (row.kind === 'choice' && row.path === 'play.difficulty') {
      text = `${difficultyNote(String(this.value(row.path)))} ${DIFFICULTY_BENEATH}`;
    } else {
      text = row.note;
    }
    if (!text) return null;
    const note = document.createElement('small');
    note.textContent = text;
    note.dataset.role = row.path === 'play.difficulty' ? 'difficulty-note' : 'row-note';
    Object.assign(note.style, { gridColumn: '1 / -1', display: 'block', opacity: '0.75', padding: '0 0 10px', marginTop: '-6px' });
    return note;
  }

  private control(row: Row): HTMLElement {
    if (row.kind === 'slider') {
      const value = Number(this.value(row.path));
      const input = rangeInput(row.range, value);
      input.style.accentColor = GOLD;
      input.style.width = '200px';
      const out = document.createElement('span');
      out.textContent = formatSlider(row, value);
      out.style.minWidth = '80px';
      input.addEventListener('input', () => {
        const v = Number(input.value);
        out.textContent = formatSlider(row, v);
        this.write(row.path, v);
        if (row.path === 'display.brightness') this.deps.onBrightness(v);
      });
      return group(input, out);
    }
    if (row.kind === 'switch') {
      const current = this.value(row.path) === true;
      const toggle = chip(current ? 'On' : 'Off', current, () => {
        const next = !(this.value(row.path) === true);
        this.write(row.path, next);
        setChip(toggle, next);
        toggle.textContent = next ? 'On' : 'Off';
        toggle.setAttribute('aria-pressed', String(next));
      });
      toggle.setAttribute('aria-pressed', String(current));
      return toggle;
    }
    // A choice: one gold button per option, the chosen one filled.
    const current = this.value(row.path);
    const wrap = document.createElement('div');
    Object.assign(wrap.style, { display: 'flex', gap: '6px', flexWrap: 'wrap' });
    const buttons: HTMLButtonElement[] = row.options.map((opt) => {
      const b = chip(opt.label, opt.value === current, () => {
        this.write(row.path, opt.value);
        for (const [i, other] of buttons.entries()) setChip(other, row.options[i].value === opt.value);
        if (row.path === 'play.difficulty') {
          const note = this.scroll.querySelector<HTMLElement>('[data-role="difficulty-note"]');
          if (note) note.textContent = `${difficultyNote(String(opt.value))} ${DIFFICULTY_BENEATH}`;
        }
      });
      b.setAttribute('aria-pressed', String(opt.value === current));
      return b;
    });
    wrap.append(...buttons);
    return wrap;
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

  /** Back, Back to defaults (with its question), and on Display, Set brightness again. Fixed at the foot. */
  private footerButtons(): HTMLElement[] {
    const back = chip('Back', true, () => this.deps.onBack());
    const items: HTMLElement[] = [back];
    if (this.page === 'display') items.push(chip('Set brightness again', false, () => this.deps.onBrightnessAgain()));
    items.push(chip('Back to defaults', false, () => this.setConfirm(true)), this.confirm);
    return items;
  }

  private setConfirm(open: boolean): void {
    this.confirm.hidden = !open;
  }

  /** Shows the fade only while rows continue below the visible part of the body. */
  private updateScrollHint(): void {
    const s = this.scroll;
    const more = s.scrollHeight - (s.scrollTop + s.clientHeight) > 2;
    this.scrollHint.style.display = more ? 'block' : 'none';
  }

  private resetPage(): void {
    if (this.page === 'sound') {
      this.deps.audio.reset();
    } else {
      const next: Settings = resetPage(currentSettings(), this.page);
      saveSettings(next);
      if (this.page === 'display') this.deps.onBrightness(next.display.brightness);
    }
    this.setConfirm(false);
    this.render();
  }
}

/** A cell of a setting row: fixed height, so every row is the same height, with a rule under it. */
function rowCell(): HTMLElement {
  const cell = document.createElement('div');
  Object.assign(cell.style, {
    height: `${ROW_HEIGHT}px`, display: 'flex', alignItems: 'center', gap: '10px', minWidth: '0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  });
  return cell;
}

/** A group heading across both columns, with a gold rule under it. */
function groupHeading(text: string): HTMLElement {
  const h = document.createElement('h4');
  h.textContent = text;
  Object.assign(h.style, {
    gridColumn: '1 / -1', margin: '16px 0 4px', fontSize: '14px', letterSpacing: '0.04em',
    textAlign: 'left', borderBottom: `1px solid ${GOLD}`, paddingBottom: '4px', color: GOLD,
  });
  return h;
}

/** Puts two controls side by side, the second a read-out of the first. */
function group(a: HTMLElement, b: HTMLElement): HTMLElement {
  const g = document.createElement('span');
  g.style.cssText = 'display:inline-flex;gap:10px;align-items:center;';
  g.append(a, b);
  return g;
}

/**
 * A gold button in the game's own style: filled when on (a chosen tab, option or switch), outlined otherwise.
 * Used for tabs, choices, switches and the footer.
 */
function chip(label: string, on: boolean, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  setChip(b, on);
  return b;
}

function setChip(b: HTMLButtonElement, on: boolean): void {
  Object.assign(b.style, {
    margin: '0', padding: '6px 12px', fontSize: '14px', fontWeight: on ? '700' : '600',
    border: `1px solid ${GOLD}`, borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
    background: on ? GOLD : 'transparent', color: on ? INK : 'inherit',
  });
}
