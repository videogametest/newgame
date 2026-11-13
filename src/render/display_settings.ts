// Display settings (task 009 step 2c): the brightness slider and quality choice on the Settings page, and the
// first-start brightness prompt. Changes are saved through settings_store, so every reader sees the same values.

import { RANGES, type Quality, type Settings } from '../core/settings/settings';
import { currentSettings, saveSettings } from './settings_store';

const QUALITIES: Quality[] = ['low', 'medium', 'high'];

/** The Display section for the Settings page. Brightness applies live; quality is read on the next start. */
export function buildDisplaySection(onBrightness: (b: number) => void): HTMLElement {
  const section = document.createElement('section');
  const heading = document.createElement('h3');
  heading.textContent = 'Display';
  section.append(heading, brightnessRow(onBrightness), qualityRow());
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
 * The first-start prompt: shown once, until the player sets brightness. It applies the slider live and saves
 * brightnessSet, so it never comes back.
 */
export function showBrightnessPrompt(uiRoot: HTMLElement, onBrightness: (b: number) => void): HTMLElement | null {
  if (currentSettings().display.brightnessSet) return null;
  const card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'position:absolute;left:50%;top:18px;transform:translateX(-50%);pointer-events:auto;z-index:20;';
  const title = document.createElement('h3');
  title.textContent = 'Brightness';
  const hint = document.createElement('p');
  hint.textContent = 'Move the slider until the dark side of the valley is readable, then press Set.';
  const slider = rangeInput(RANGES.brightness, currentSettings().display.brightness);
  slider.addEventListener('input', () => onBrightness(Number(slider.value)));
  const set = document.createElement('button');
  set.textContent = 'Set';
  set.addEventListener('click', () => {
    saveDisplay({ brightness: Number(slider.value), brightnessSet: true });
    card.remove();
  });
  card.append(title, hint, slider, set);
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
