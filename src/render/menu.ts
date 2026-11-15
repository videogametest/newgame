// The pause menu (docs/writing/interface.md, "Pause menu"). Built so far: Resume, Settings (six pages), and Controls
// (keyboard and mouse). Copy debug report and Return to title are not built yet.
import type { Bindings } from '../core/settings/actions';
import { ControlsPage } from './controls_page';
import { SettingsPages, type SoundTarget } from './settings_pages';

type Page = 'menu' | 'settings' | 'controls';

export class PauseMenu {
  private readonly root: HTMLElement;
  private readonly menuPage: HTMLElement;
  private readonly controlsPage: ControlsPage;
  private readonly settingsPages: SettingsPages;
  private page: Page = 'menu';

  constructor(uiRoot: HTMLElement, onResume: () => void, onBindings: (b: Bindings) => void, onBrightness: (b: number) => void, onBrightnessAgain: () => void, audio: SoundTarget) {
    this.root = document.createElement('div');
    // .panel does not set pointer-events, so the menu takes its own clicks; otherwise they reach the canvas and re-request the mouse.
    this.root.className = 'panel pause';
    this.root.style.pointerEvents = 'auto';
    this.root.hidden = true;

    this.menuPage = document.createElement('div');
    this.menuPage.className = 'card';
    // A row with a gap keeps the buttons apart; the row (not the card) takes the flex display so the card's hidden toggle still works.
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '12px';
    row.append(
      button('Resume', onResume),
      button('Settings', () => this.showSettings()),
      button('Controls', () => this.showControls()),
    );
    this.menuPage.append(row);

    // The settings card is one fixed card: its tabs, its rows and its Back button are all in settings_pages.ts.
    this.settingsPages = new SettingsPages({
      onBrightness,
      onBrightnessAgain,
      onControls: () => this.showControls(),
      onBack: () => this.showMenu(),
      audio,
    });

    this.controlsPage = new ControlsPage(onBindings, () => this.showMenu());

    this.root.append(this.menuPage, this.settingsPages.el, this.controlsPage.el);
    uiRoot.appendChild(this.root);
  }

  get isVisible(): boolean {
    return !this.root.hidden;
  }

  /** True on Settings or Controls: Esc goes back to the menu page instead of resuming. */
  get onSubPage(): boolean {
    return this.page !== 'menu';
  }

  /** True while a Controls slot is waiting for an input; the game's pause key must not act then. */
  get isListening(): boolean {
    return this.controlsPage.isListening;
  }

  show(): void {
    this.root.hidden = false;
    this.showMenu();
  }

  hide(): void {
    this.root.hidden = true;
    this.showMenu();
  }

  showSettings(): void {
    this.controlsPage.close();
    this.page = 'settings';
    this.menuPage.hidden = true;
    this.controlsPage.el.hidden = true;
    this.settingsPages.el.hidden = false;
    this.settingsPages.show(); // the tab last open
  }

  showControls(): void {
    this.page = 'controls';
    this.menuPage.hidden = true;
    this.settingsPages.el.hidden = true;
    this.controlsPage.open();
  }

  showMenu(): void {
    this.page = 'menu';
    this.controlsPage.close();
    this.settingsPages.close();
    this.settingsPages.el.hidden = true;
    this.menuPage.hidden = false;
  }
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
