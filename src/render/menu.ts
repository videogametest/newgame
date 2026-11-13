// The pause menu (docs/writing/interface.md, "Pause menu"). Built so far: Resume and Settings. The settings
// page is a stub until task 009 step 2d; Controls, Copy debug report and Return to title are not built yet.

export class PauseMenu {
  private readonly root: HTMLElement;
  private readonly menuPage: HTMLElement;
  private readonly settingsPage: HTMLElement;

  constructor(uiRoot: HTMLElement, onResume: () => void) {
    this.root = document.createElement('div');
    // .panel does not set pointer-events, so the menu takes its own clicks; otherwise they reach the canvas and re-request the mouse.
    this.root.className = 'panel pause';
    this.root.style.pointerEvents = 'auto';
    this.root.hidden = true;

    this.menuPage = document.createElement('div');
    this.menuPage.className = 'card';
    // A row with a gap keeps the two buttons apart; the row (not the card) takes the flex display so the card's hidden toggle still works.
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '12px';
    row.append(button('Resume', onResume), button('Settings', () => this.showSettings()));
    this.menuPage.append(row);

    this.settingsPage = document.createElement('div');
    this.settingsPage.className = 'card';
    this.settingsPage.hidden = true;
    const heading = document.createElement('h2');
    heading.textContent = 'Settings';
    // "Back" is not in docs/writing/interface.md; it is flagged in docs/status.md.
    this.settingsPage.append(heading, button('Back', () => this.showMenu()));

    this.root.append(this.menuPage, this.settingsPage);
    uiRoot.appendChild(this.root);
  }

  get isVisible(): boolean {
    return !this.root.hidden;
  }

  get onSettings(): boolean {
    return !this.settingsPage.hidden;
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
    this.menuPage.hidden = true;
    this.settingsPage.hidden = false;
  }

  showMenu(): void {
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
