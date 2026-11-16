// Reuses the existing game's card, gold buttons and settings pages.
import { GAME_TITLE } from '../data/title';
import { TITLE_WORDS as words } from '../data/title_screen';
import type { SaveRead } from '../core/saves/codec';
import { canContinue, needsConfirmation, type TitleChoice } from './title_rules';
import { SettingsPages, type SettingsPagesDeps } from './settings_pages';
import { ControlsPage } from './controls_page';
import type { Bindings } from '../core/settings/actions';

export class TitleScreen {
  readonly el = document.createElement('div');
  private readonly main = document.createElement('div');
  private readonly actions = document.createElement('div');
  private readonly confirm = document.createElement('div');
  private readonly settings: SettingsPages;
  private readonly controls: ControlsPage;
  private page: 'main' | 'confirm' | 'settings' | 'controls' = 'main';
  constructor(root: HTMLElement, private readonly status: SaveRead['status'], private readonly choose: (choice: TitleChoice) => void,
    deps: Omit<SettingsPagesDeps, 'onControls' | 'onBack'>, onBindings: (b: Bindings) => void) {
    this.el.className = 'panel title-screen';
    this.el.dataset.screen = 'title';
    this.el.style.cssText = 'pointer-events:auto;background:linear-gradient(90deg,rgba(5,8,12,.6),rgba(5,8,12,.12));';
    this.main.className = 'card';
    this.main.style.cssText = 'width:min(480px,80vw);box-sizing:border-box;';
    const heading = document.createElement('h1');
    heading.textContent = GAME_TITLE;
    // The duration line stays out until task 008 times a full playthrough.
    this.actions.style.cssText = 'display:flex;flex-direction:column;gap:12px;margin-top:24px;';
    if (canContinue(status)) this.actions.append(button(words.continue, () => this.choose('continue')));
    this.actions.append(button(words.newGame, () => this.requestNew()), button(words.settings, () => this.showSettings()));
    const question = document.createElement('p'); question.textContent = words.question;
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap;';
    row.append(button(words.replace, () => this.choose('new')), button(words.keep, () => this.showMain()));
    this.confirm.append(question, row); this.confirm.hidden = true;
    this.main.append(heading, this.actions, this.confirm);
    this.settings = new SettingsPages({ ...deps, onControls: () => this.showControls(), onBack: () => this.showMain() });
    this.controls = new ControlsPage(onBindings, () => this.showSettings());
    this.el.append(this.main, this.settings.el, this.controls.el); root.append(this.el);
    this.focusFirst();
  }
  get visible(): boolean { return !this.el.hidden; }
  hide(): void { this.el.hidden = true; this.controls.close(); this.settings.close(); }
  show(): void { this.el.hidden = false; this.showMain(); }
  showSettings(): void {
    this.page = 'settings'; this.main.hidden = true; this.controls.close();
    this.settings.el.hidden = false; this.settings.show(); this.focusFirst();
  }
  private showControls(): void {
    this.page = 'controls'; this.settings.el.hidden = true; this.controls.open(); this.focusFirst();
  }
  private showMain(): void {
    this.page = 'main'; this.main.hidden = false; this.actions.hidden = false; this.confirm.hidden = true;
    this.settings.el.hidden = true; this.settings.close(); this.controls.close(); this.focusFirst();
  }
  private requestNew(): void {
    if (!needsConfirmation('new', this.status)) { this.choose('new'); return; }
    this.page = 'confirm'; this.actions.hidden = true; this.confirm.hidden = false;
    // Destructive action is never the default focused choice.
    this.confirm.querySelectorAll('button')[1]?.focus();
  }
  back(): void {
    if (this.controls.isListening) return;
    if (this.page === 'controls') this.showSettings(); else if (this.page !== 'main') this.showMain();
  }
  private focusFirst(): void {
    const area = this.page === 'settings' ? this.settings.el : this.page === 'controls' ? this.controls.el : this.actions;
    area.querySelector<HTMLButtonElement>('button')?.focus();
  }
}
function button(label: string, click: () => void): HTMLButtonElement {
  const b = document.createElement('button'); b.textContent = label;
  b.style.marginTop = '0'; b.type = 'button'; b.addEventListener('click', click); return b;
}
