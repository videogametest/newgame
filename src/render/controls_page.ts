// The Controls page of the pause menu (task 009, step 2b; docs/writing/interface.md, "Settings and controls").
// Keyboard and mouse only: the Controller tab waits for task 004. While a slot listens, its key, mouse button or
// wheel tick is captured before the game sees it, so binding Space does not also dodge.
// Layout: the heading, tab, column header, prompt, notice and footer stay fixed; only the action rows scroll, and the
// scroll area is trimmed to a whole number of rows so no row is cut through its buttons.
import {
  ACTION_NAMES,
  ACTIONS,
  rebind,
  resetDevice,
  type Action,
  type Bindings,
  type Input,
} from '../core/settings/actions';
import { inputLabel } from '../core/settings/labels';
import { currentSettings } from './settings_store';
import { inputFromKey, inputFromMouse, inputFromWheel, LISTEN_PROMPT, noticeFor } from './controls_rules';

const NO_INPUT = '\u2014'; // an empty slot shows a dash
const LISTEN_LABEL = 'Press\u2026'; // the text inside a slot that is listening
const ROW_HEIGHT = 36; // px per action row; the scroll area shows whole rows only
const COLUMNS = 'minmax(0, 1fr) 170px 170px'; // action name, Main, Spare: shared by the header and every row

export class ControlsPage {
  readonly el: HTMLElement;
  private readonly scroll: HTMLElement;
  private readonly rows: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly notice: HTMLElement;
  private readonly confirm: HTMLElement;
  private readonly footerButtons: HTMLElement;
  private listening: { action: Action; slot: number } | null = null;
  private readonly captures: [string, (e: Event) => void, boolean][];

  constructor(
    private readonly onChanged: (b: Bindings) => void,
    private readonly onBack: () => void,
  ) {
    // The card takes no inline display, so the hidden attribute still hides it.
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

    const top = document.createElement('div');
    Object.assign(top.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' });
    const heading = document.createElement('h2');
    heading.textContent = 'Controls';
    Object.assign(heading.style, { margin: '0', fontSize: '22px', letterSpacing: '0.04em' });
    const tab = document.createElement('div');
    tab.textContent = 'Keyboard and mouse';
    Object.assign(tab.style, { opacity: '0.8', fontSize: '14px' });
    top.append(heading, tab);

    const head = document.createElement('div');
    head.className = 'ctl-head';
    Object.assign(head.style, {
      display: 'grid', gridTemplateColumns: COLUMNS, alignItems: 'center', height: '30px',
      fontSize: '13px', opacity: '0.7', marginTop: '10px', flex: 'none',
    });
    for (const text of ['Action', 'Main', 'Spare']) {
      const cell = document.createElement('div');
      cell.textContent = text;
      cell.style.padding = '0 8px';
      head.append(cell);
    }

    this.scroll = document.createElement('div');
    Object.assign(this.scroll.style, { flex: '1 1 0', minHeight: '0', overflowY: 'auto' });
    this.rows = document.createElement('div');
    this.scroll.append(this.rows);

    this.prompt = document.createElement('div');
    this.notice = document.createElement('div');
    this.notice.setAttribute('role', 'status');
    // Both lines keep their height whether or not they hold text, so the scroll area is never resized by them.
    for (const line of [this.prompt, this.notice]) Object.assign(line.style, { height: '22px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden' });

    const footer = document.createElement('div');
    Object.assign(footer.style, { display: 'flex', alignItems: 'center', gap: '12px', height: '44px', flex: 'none' });
    this.footerButtons = document.createElement('div');
    const back = button('Back', () => this.onBack());
    back.style.marginRight = '12px';
    this.footerButtons.append(back, button('Back to defaults', () => this.setConfirm(true)));
    this.confirm = document.createElement('div');
    this.confirm.hidden = true;
    const question = document.createElement('span');
    question.textContent = 'Put this page back as it was? ';
    this.confirm.append(question, button('Yes', () => this.backToDefaults()), button('No', () => this.setConfirm(false)));
    footer.append(this.footerButtons, this.confirm);

    inner.append(top, head, this.scroll, this.prompt, this.notice, footer);
    this.el.append(inner);

    // Installed while the page is open; they only act while a slot is listening.
    this.captures = [
      ['keydown', (e) => this.onKey(e as KeyboardEvent), true],
      ['mousedown', (e) => this.onMouse(e as MouseEvent), true],
      ['wheel', (e) => this.onWheel(e as WheelEvent), true],
    ];
    window.addEventListener('resize', () => this.fitRows());
  }

  get isListening(): boolean {
    return this.listening !== null;
  }

  open(): void {
    this.el.hidden = false;
    this.render();
  }

  close(): void {
    this.stopListening();
    this.setConfirm(false);
    this.notice.textContent = '';
    this.el.hidden = true;
  }

  /** Esc while listening cancels the slot; the caller checks isListening before treating Esc as "back". */
  cancelListening(): void {
    this.stopListening();
    this.notice.textContent = '';
  }

  private render(): void {
    const b = currentSettings().bindings;
    const listening = this.listening;
    this.rows.replaceChildren(...ACTIONS.map((a) => row(a, b, listening, (action, slot) => this.startListening(action, slot))));
    this.prompt.textContent = listening ? LISTEN_PROMPT : '';
    this.fitRows();
  }

  /** Trims the scroll area to a whole number of rows that fit in the space the card has left. */
  private fitRows(): void {
    if (this.el.hidden) return;
    this.scroll.style.flex = '1 1 0';
    this.scroll.style.height = '';
    const available = this.scroll.clientHeight;
    const rows = Math.max(1, Math.floor(available / ROW_HEIGHT));
    this.scroll.style.flex = 'none';
    this.scroll.style.height = `${rows * ROW_HEIGHT}px`;
  }

  private startListening(action: Action, slot: number): void {
    this.listening = { action, slot };
    this.notice.textContent = '';
    this.addCaptures();
    this.render();
  }

  private stopListening(): void {
    if (!this.listening) return;
    this.listening = null;
    this.removeCaptures();
    this.render();
  }

  private addCaptures(): void {
    for (const [type, fn, capture] of this.captures) window.addEventListener(type, fn, { capture, passive: false });
  }

  private removeCaptures(): void {
    for (const [type, fn, capture] of this.captures) window.removeEventListener(type, fn, { capture });
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.listening) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    if (e.code === 'Escape') {
      this.cancelListening();
      return;
    }
    const input = inputFromKey(e);
    if (input) this.choose(input);
  }

  private onMouse(e: MouseEvent): void {
    if (!this.listening) return;
    // The page's own buttons keep working, so Back and the slot buttons are not taken as an input.
    if (e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    e.stopPropagation();
    const input = inputFromMouse(e.button);
    if (input) this.choose(input);
  }

  private onWheel(e: WheelEvent): void {
    if (!this.listening) return;
    e.preventDefault();
    e.stopPropagation();
    const input = inputFromWheel(e.deltaY);
    if (input) this.choose(input);
  }

  private choose(input: Input): void {
    const pending = this.listening;
    if (!pending) return;
    const before = currentSettings().bindings;
    const result = rebind(before, 'keyboard', pending.action, input, pending.slot);
    this.notice.textContent = noticeFor(result, before, pending.action, pending.slot, input) ?? '';
    if (result.ok) {
      this.onChanged(result.bindings);
      this.stopListening();
      this.render();
    } else if (result.reason !== 'reserved') {
      // Refused for another reason: the player must give the other action an input first, so listening ends.
      this.stopListening();
    }
    // A reserved input keeps the slot listening: the copy says "Choose another."
  }

  private setConfirm(on: boolean): void {
    this.confirm.hidden = !on;
    this.footerButtons.hidden = on;
  }

  private backToDefaults(): void {
    this.setConfirm(false);
    this.stopListening();
    const next = resetDevice(currentSettings().bindings, 'keyboard');
    this.onChanged(next);
    this.notice.textContent = '';
    this.render();
  }
}

function row(action: Action, b: Bindings, listening: { action: Action; slot: number } | null, onSlot: (action: Action, slot: number) => void): HTMLElement {
  const tr = document.createElement('div');
  tr.className = 'ctl-row';
  Object.assign(tr.style, { display: 'grid', gridTemplateColumns: COLUMNS, alignItems: 'center', height: `${ROW_HEIGHT}px`, boxSizing: 'border-box' });
  const name = document.createElement('div');
  name.textContent = ACTION_NAMES[action];
  name.style.padding = '0 8px';
  tr.append(name);
  for (const slot of [0, 1]) {
    const cell = document.createElement('div');
    cell.style.padding = '0 8px';
    const input = b.keyboard[action][slot];
    const isListening = listening !== null && listening.action === action && listening.slot === slot;
    cell.append(slotButton(isListening ? LISTEN_LABEL : input ? inputLabel(input) : NO_INPUT, isListening, () => onSlot(action, slot)));
    tr.append(cell);
  }
  return tr;
}

function slotButton(label: string, listening: boolean, onClick: () => void): HTMLButtonElement {
  const b = button(label, onClick);
  Object.assign(b.style, { minWidth: '150px', padding: '4px 12px' });
  if (listening) Object.assign(b.style, { outline: '2px solid #f4e3b0', outlineOffset: '2px' });
  b.dataset.listening = listening ? 'true' : 'false';
  return b;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  // The pause menu's button style is larger; these buttons sit in rows that must stay 36 px.
  Object.assign(b.style, { margin: '0', padding: '4px 12px', fontSize: '14px', fontWeight: '700' });
  return b;
}
