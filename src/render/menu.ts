// The pause menu (docs/writing/interface.md, "Pause menu"). Built: Resume, Settings (Display with brightness, Controls
// page), and Controls (keyboard and mouse). Sound, Camera, Controller and Play pages, Copy debug report and
// Return to title are not built yet.
import type { Bindings } from '../core/settings/actions';
import { ControlsPage } from './controls_page';
import { buildDisplaySection } from './display_settings';

type Page = 'menu' | 'settings' | 'controls';

export class PauseMenu {
  private readonly root: HTMLElement;
  private readonly menuPage: HTMLElement;
  private readonly settingsPage: HTMLElement;
  private readonly controlsPage: ControlsPage;
  private page: Page = 'menu';

  constructor(uiRoot: HTMLElement, onResume: () => void, onBindings: (b: Bindings) => void, onBrightness: (b: number) => void = () => {}, onAgain: () => void = () => {}) {
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

    this.settingsPage = document.createElement('div');
    this.settingsPage.className = 'card';
    this.settingsPage.hidden = true;
    const heading = document.createElement('h2');
    heading.textContent = 'Settings';
    // "Back" is not in docs/writing/interface.md; it is flagged in docs/status.md.
    this.settingsPage.append(heading, buildDisplaySection(onBrightness, onAgain), button('Back', () => this.showMenu()));

    this.controlsPage = new ControlsPage(onBindings, () => this.showMenu());

    this.root.append(this.menuPage, this.settingsPage, this.controlsPage.el);
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

  /** The brightness picture takes the screen: the menu hides but keeps the page it was on. */
  hideForPicture(): void {
    this.root.hidden = true;
  }

  /** The picture is closed: the menu comes back on Settings, where "Set brightness again" was pressed. */
  reopenSettings(): void {
    this.root.hidden = false;
    this.showSettings();
  }

  showSettings(): void {
    this.controlsPage.close();
    this.page = 'settings';
    this.menuPage.hidden = true;
    this.controlsPage.el.hidden = true;
    this.settingsPage.hidden = false;
  }

  showControls(): void {
    this.page = 'controls';
    this.menuPage.hidden = true;
    this.settingsPage.hidden = true;
    this.controlsPage.open();
  }

  showMenu(): void {
    this.page = 'menu';
    this.controlsPage.close();
    this.settingsPage.hidden = true;
    this.menuPage.hidden = false;
  }
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
