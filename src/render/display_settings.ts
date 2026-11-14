// Display settings (task 009 steps 2c and 2d): the brightness slider and quality choice on the Settings page,
// and the brightness picture (the first-start prompt, and "Set brightness again" from Display).
// Wording is from docs/writing/interface.md. Changes are saved through settings_store, so every reader sees the same values.

import { RANGES, type Quality, type Settings } from '../core/settings/settings';
import { currentSettings, saveSettings } from './settings_store';

const QUALITIES: Quality[] = ['low', 'medium', 'high'];

/** The words of the brightness picture, exactly as docs/writing/interface.md gives them. */
export const BRIGHTNESS_WORDS = {
  heading: 'Brightness',
  hint: 'Move the slider until you can only just see the figure in the yard.',
  done: "That's right.",
  again: 'Set brightness again',
} as const;

/**
 * The Display section for the Settings page. Brightness applies live; quality is read on the next start.
 * `onAgain` opens the brightness picture again (the pause menu hands over to it).
 */
export function buildDisplaySection(onBrightness: (b: number) => void, onAgain: () => void = () => {}): HTMLElement {
  const section = document.createElement('section');
  const heading = document.createElement('h3');
  heading.textContent = 'Display';
  const again = document.createElement('button');
  again.textContent = BRIGHTNESS_WORDS.again;
  again.addEventListener('click', onAgain);
  section.append(heading, brightnessRow(onBrightness), again, qualityRow());
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

/**
 * The brightness picture's card, along the bottom of the screen so it covers neither the figure nor the house.
 * The slider applies live. "That's right." saves the brightness and brightnessSet, then calls onDone; the caller
 * closes the picture (time, hero and camera come back there).
 */
export function showBrightnessPrompt(uiRoot: HTMLElement, onBrightness: (b: number) => void, onDone: () => void): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:min(560px,92vw);pointer-events:auto;z-index:20;';
  const title = document.createElement('h3');
  title.textContent = BRIGHTNESS_WORDS.heading;
  const hint = document.createElement('p');
  hint.textContent = BRIGHTNESS_WORDS.hint;
  const row = labelled('');
  const slider = rangeInput(RANGES.brightness, currentSettings().display.brightness);
  const readout = document.createElement('span');
  readout.textContent = slider.value;
  slider.addEventListener('input', () => {
    readout.textContent = slider.value;
    onBrightness(Number(slider.value));
  });
  row.append(slider, readout);
  const done = document.createElement('button');
  done.textContent = BRIGHTNESS_WORDS.done;
  done.addEventListener('click', () => {
    saveDisplay({ brightness: Number(slider.value), brightnessSet: true });
    card.remove();
    onDone();
  });
  card.append(title, hint, row, done);
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
  if (text) {
    const label = document.createElement('span');
    label.textContent = text;
    row.append(label);
  }
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
