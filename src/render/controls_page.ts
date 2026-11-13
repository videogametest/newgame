// The Controls page of the pause menu (task 009, step 2b; docs/writing/interface.md, "Settings and controls").
// Keyboard and mouse only: the Controller tab waits for task 004. While a slot listens, its key, mouse button or
// wheel tick is captured before the game sees it, so binding Space does not also dodge.
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

export class ControlsPage {
  readonly el: HTMLElement;
  private readonly table: HTMLTableElement;
  private readonly prompt: HTMLElement;
  private readonly notice: HTMLElement;
  private readonly confirm: HTMLElement;
  private listening: { action: Action; slot: number } | null = null;
  private readonly captures: [string, (e: Event) => void, boolean][];

  constructor(
    private readonly onChanged: (b: Bindings) => void,
    private readonly onBack: () => void,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'card';
    this.el.hidden = true;

    const heading = document.createElement('h2');
    heading.textContent = 'Controls';
    const tab = document.createElement('div');
    tab.textContent = 'Keyboard and mouse';
    tab.style.opacity = '0.8';

    this.table = document.createElement('table');
    this.table.style.borderCollapse = 'collapse';
    const scroll = document.createElement('div');
    scroll.style.maxHeight = '52vh';
    scroll.style.overflowY = 'auto';
    scroll.append(this.table);

    this.prompt = document.createElement('div');
    this.notice = document.createElement('div');
    this.notice.setAttribute('role', 'status');
    this.notice.style.minHeight = '1.4em';

    this.confirm = document.createElement('div');
    this.confirm.hidden = true;
    const question = document.createElement('span');
    question.textContent = 'Put this page back as it was? ';
    this.confirm.append(question, button('Yes', () => this.backToDefaults()), button('No', () => this.setConfirm(false)));

    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = '12px';
    footer.append(button('Back', () => this.onBack()), button('Back to defaults', () => this.setConfirm(true)));

    this.el.append(heading, tab, scroll, this.prompt, this.notice, this.confirm, footer);

    // Installed while the page is open; they only act while a slot is listening.
    this.captures = [
      ['keydown', (e) => this.onKey(e as KeyboardEvent), true],
      ['mousedown', (e) => this.onMouse(e as MouseEvent), true],
      ['wheel', (e) => this.onWheel(e as WheelEvent), true],
    ];
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
    this.table.replaceChildren(header(), ...ACTIONS.map((a) => row(a, b, (action, slot) => this.startListening(action, slot))));
    this.prompt.textContent = this.listening ? LISTEN_PROMPT : '';
  }

  private startListening(action: Action, slot: number): void {
    this.listening = { action, slot };
    this.notice.textContent = '';
    this.addCaptures();
    this.prompt.textContent = LISTEN_PROMPT;
  }

  private stopListening(): void {
    if (!this.listening) return;
    this.listening = null;
    this.removeCaptures();
    this.prompt.textContent = '';
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

function header(): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const text of ['Action', 'Main', 'Spare']) {
    const th = document.createElement('th');
    th.textContent = text;
    th.style.textAlign = 'left';
    th.style.padding = '4px 12px';
    tr.append(th);
  }
  return tr;
}

function row(action: Action, b: Bindings, onSlot: (action: Action, slot: number) => void): HTMLTableRowElement {
  const tr = document.createElement('tr');
  const name = document.createElement('td');
  name.textContent = ACTION_NAMES[action];
  name.style.padding = '4px 12px';
  tr.append(name);
  for (const slot of [0, 1]) {
    const td = document.createElement('td');
    td.style.padding = '2px 12px';
    const input = b.keyboard[action][slot];
    td.append(button(input ? inputLabel(input) : NO_INPUT, () => onSlot(action, slot)));
    tr.append(td);
  }
  return tr;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
