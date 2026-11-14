// Display settings (task 009 step 2c): the brightness slider and quality choice on the Settings page, and the
// first-start brightness prompt. Changes are saved through settings_store, so every reader sees the same values.

import { RANGES, type Quality, type Settings } from '../core/settings/settings';
import { currentSettings, saveSettings } from './settings_store';

const QUALITIES: Quality[] = ['low', 'medium', 'high'];

/**
 * The Display section for the Settings page. Brightness applies live; quality is read on the next start.
 * "Set brightness again" opens the brightness picture (review 031); the caller closes the menu and restores it after.
 */
export function buildDisplaySection(onBrightness: (b: number) => void, onBrightnessAgain: () => void = () => {}): HTMLElement {
  const section = document.createElement('section');
  const heading = document.createElement('h3');
  heading.textContent = 'Display';
  const again = document.createElement('button');
  again.textContent = 'Set brightness again';
  again.addEventListener('click', onBrightnessAgain);
  section.append(heading, brightnessRow(onBrightness), qualityRow(), again);
  return section;
}

function brightnessRow(onBrightness: (b: number) => void): HTMLElement {
  const row = labelled('Brightness');
  const slider = rangeInput(RANGES.brightness, currentSettings().display.brightness);
  const readout = document.createElement('span');
  readout.textContent = slider.value;
  slider.addEventListener('input', () => {
    readout.textContent = slider.value;
    const b = Number(slider.value);
    onBrightness(b);
    saveDisplay({ brightness: b });
  });
  row.append(slider, readout);
  return row;
}

function qualityRow(): HTMLElement {
  const row = labelled('Quality');
  const select = document.createElement('select');
  for (const q of QUALITIES) {
    const option = document.createElement('option');
    option.value = q;
    option.textContent = q;
    select.append(option);
  }
  select.value = currentSettings().display.quality;
  select.addEventListener('change', () => saveDisplay({ quality: select.value as Quality }));
  const note = document.createElement('small');
  note.textContent = ' Shadow detail and draw distance apply on the next start.';
  row.append(select, note);
  return row;
}

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

function saveDisplay(patch: Partial<Settings['display']>): void {
  const current = currentSettings();
  saveSettings({ ...current, display: { ...current.display, ...patch } });
}

function labelled(text: string): HTMLElement {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = '10px';
  row.style.alignItems = 'center';
  const label = document.createElement('span');
  label.textContent = text;
  row.append(label);
  return row;
}

function rangeInput(r: { min: number; max: number; step: number }, value: number): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(r.min);
  input.max = String(r.max);
  input.step = String(r.step);
  input.value = String(value);
  return input;
}
