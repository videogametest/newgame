// Display settings: the first-start brightness picture card (review 031). The Display page itself is in
// settings_pages.ts. Changes are saved through settings_store, so every reader sees the same values.

import { RANGES, type Settings } from '../core/settings/settings';
import { currentSettings, saveSettings } from './settings_store';
import { rangeInput } from './settings_parts';

/** Hooks for the brightness picture: the slider previews live, and "That's right." closes the picture. */
export interface BrightnessCheck {
  onBrightness(b: number): void;
  onDone(): void;
}

/**
 * The brightness card (docs/writing/interface.md, "Brightness picture"): shown along the bottom of the picture so it
 * does not cover the figure. "That's right." saves brightnessSet, so the first-start card never comes back.
 */
export function showBrightnessCard(uiRoot: HTMLElement, check: BrightnessCheck): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'position:absolute;left:50%;bottom:24px;transform:translateX(-50%);pointer-events:auto;z-index:20;text-align:center;';
  const title = document.createElement('h3');
  title.textContent = 'Brightness';
  const hint = document.createElement('p');
  hint.textContent = 'Move the slider until you can only just see the figure in the yard.';
  const slider = rangeInput(RANGES.brightness, currentSettings().display.brightness);
  slider.addEventListener('input', () => check.onBrightness(Number(slider.value)));
  const done = document.createElement('button');
  done.textContent = "That's right.";
  done.addEventListener('click', () => {
    saveDisplay({ brightness: Number(slider.value), brightnessSet: true });
    card.remove();
    check.onDone();
  });
  card.append(title, hint, slider, done);
  uiRoot.appendChild(card);
  return card;
}

export function saveDisplay(patch: Partial<Settings['display']>): void {
  const current = currentSettings();
  saveSettings({ ...current, display: { ...current.display, ...patch } });
}
