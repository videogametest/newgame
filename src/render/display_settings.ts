// Display settings (task 009 steps 2c and 2d): the brightness slider and quality choice on the Settings page, and the
// brightness picture: at first start once, and from Display as "Set brightness again". Changes are saved through
// settings_store, so every reader sees the same values.

import { RANGES, type Quality, type Settings } from '../core/settings/settings';
import { currentSettings, saveSettings } from './settings_store';
import { PICTURE_AGAIN, PICTURE_BUTTON, PICTURE_TEXT, PICTURE_TITLE, promptDue } from './brightness_picture';

const QUALITIES: Quality[] = ['low', 'medium', 'high'];

/** What the valley does while the picture is open: show the view, apply the slider live, and put everything back. */
export interface BrightnessPicture {
  begin(): void;
  end(): void;
  apply(brightness: number): void;
}

/** The Display section for the Settings page. Brightness applies live; quality is read on the next start. */
export function buildDisplaySection(onBrightness: (b: number) => void, onSetAgain: () => void): HTMLElement {
  const section = document.createElement('section');
  const heading = document.createElement('h3');
  heading.textContent = 'Display';
  const again = document.createElement('button');
  again.textContent = PICTURE_AGAIN;
  again.addEventListener('click', onSetAgain);
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

/** The first-start picture: shown once, until the player sets brightness. Saves brightnessSet, so it never comes back. */
export function showBrightnessPrompt(uiRoot: HTMLElement, picture: BrightnessPicture): HTMLElement | null {
  if (!promptDue(currentSettings().display)) return null;
  return brightnessCard(uiRoot, picture, (b) => saveDisplay({ brightness: b, brightnessSet: true }), () => {});
}

/** The picture again, from Display. onClose runs after the picture has been put back (the pause menu reopens). */
export function showBrightnessAgain(uiRoot: HTMLElement, picture: BrightnessPicture, onClose: () => void): HTMLElement {
  return brightnessCard(uiRoot, picture, (b) => saveDisplay({ brightness: b }), onClose);
}

function brightnessCard(
  uiRoot: HTMLElement,
  picture: BrightnessPicture,
  save: (b: number) => void,
  onClose: () => void,
): HTMLElement {
  picture.begin();
  const card = document.createElement('div');
  card.className = 'card';
  // Along the bottom, so the card never covers the figure in the yard or Hesper's window (review 031 item 3).
  card.style.cssText = 'position:absolute;left:50%;bottom:18px;transform:translateX(-50%);pointer-events:auto;z-index:20;max-width:560px;';
  const title = document.createElement('h3');
  title.textContent = PICTURE_TITLE;
  const text = document.createElement('p');
  text.textContent = PICTURE_TEXT;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:12px;align-items:center;';
  const slider = rangeInput(RANGES.brightness, currentSettings().display.brightness);
  slider.addEventListener('input', () => picture.apply(Number(slider.value)));
  const done = document.createElement('button');
  done.textContent = PICTURE_BUTTON;
  done.addEventListener('click', () => {
    save(Number(slider.value));
    card.remove();
    picture.end();
    onClose();
  });
  row.append(slider, done);
  card.append(title, text, row);
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
