import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { defaultSettings, parseSettings, type Settings } from '../core/settings/settings';
import { defaultBindings } from '../core/settings/actions';
import {
  DIFFICULTY_CHOICES, DIFFICULTY_NOTE, FRAME_CAP_LABEL, NOT_YET_IN_GAME, RESET_TEXT, fieldOfViewLabel, isInGame,
  resetPage, sliderReadout,
} from './settings_pages_rules';

const WRITING = readFileSync('docs/writing/interface.md', 'utf8');

describe('settings pages: not yet in the game', () => {
  it('marks exactly the 26 settings the game does not read yet', () => {
    expect(NOT_YET_IN_GAME.size).toBe(26);
  });

  it('names only real fields (sound keys live in the sound store)', () => {
    const d = defaultSettings() as unknown as Record<string, Record<string, unknown>>;
    for (const key of NOT_YET_IN_GAME) {
      const [group, field] = key.split('.');
      if (group === 'sound') {
        expect(['master', 'effects', 'music']).toContain(field);
        continue;
      }
      expect(d[group]?.[field], key).not.toBeUndefined();
    }
  });

  it('treats the settings the game does read as in the game', () => {
    expect(isInGame('display.brightness')).toBe(true);
    expect(isInGame('display.quality')).toBe(true);
    expect(isInGame('display.brightnessSet')).toBe(true);
    expect(isInGame('camera.mouseSensitivity')).toBe(false);
  });
});

describe('settings pages: Back to defaults', () => {
  const changed: Settings = {
    ...defaultSettings(),
    display: { ...defaultSettings().display, brightness: 0.6, quality: 'low', brightnessSet: true },
    camera: { ...defaultSettings().camera, fovThirdPerson: 90, invertY: true },
    controller: { ...defaultSettings().controller, southpaw: true },
    play: { ...defaultSettings().play, difficulty: 'moonless', minimalHud: true },
  };

  it('puts the camera page back and keeps the others', () => {
    const next = resetPage(changed, 'camera');
    expect(next.camera).toEqual(defaultSettings().camera);
    expect(next.play).toEqual(changed.play);
    expect(next.controller).toEqual(changed.controller);
  });

  it('keeps brightnessSet and bindings when the display page is reset', () => {
    const next = resetPage(changed, 'display');
    expect(next.display.brightness).toBe(defaultSettings().display.brightness);
    expect(next.display.quality).toBe(defaultSettings().display.quality);
    expect(next.display.brightnessSet).toBe(true);
    expect(next.bindings).toEqual(changed.bindings);
  });

  it('resets controller and play to their defaults', () => {
    expect(resetPage(changed, 'controller').controller).toEqual(defaultSettings().controller);
    expect(resetPage(changed, 'play').play).toEqual(defaultSettings().play);
  });
});

describe('settings pages: wording is the writing, used exactly', () => {
  it('has the three difficulty descriptions and the note from the writing', () => {
    for (const c of DIFFICULTY_CHOICES) {
      expect(WRITING, c.label).toContain(`- ${c.label}: "${c.text}"`);
    }
    expect(WRITING).toContain(`- Beneath all three: "${DIFFICULTY_NOTE}"`);
  });

  it('has the back-to-defaults button and confirmation from the writing', () => {
    expect(WRITING).toContain(`**${RESET_TEXT.button}**`);
    expect(WRITING).toContain(`"${RESET_TEXT.question}"`);
    expect(WRITING).toContain(`**${RESET_TEXT.yes}**`);
    expect(WRITING).toContain(`**${RESET_TEXT.no}**`);
  });

  it('has the page names from the writing', () => {
    expect(WRITING).toContain('"Display", "Sound", "Camera", "Controller", "Play", "Controls"');
  });
});

describe('settings pages: labels and readouts', () => {
  it('shows the frame cap as the writing gives it', () => {
    expect(FRAME_CAP_LABEL[30]).toBe('30');
    expect(FRAME_CAP_LABEL[60]).toBe('60');
    expect(FRAME_CAP_LABEL[0]).toBe('No cap');
  });

  it('shows field of view in degrees and other sliders as plain numbers', () => {
    expect(fieldOfViewLabel(60)).toBe('60 degrees');
    expect(sliderReadout(0.8, 0.05)).toBe('0.80');
    expect(sliderReadout(60, 1)).toBe('60');
    expect(sliderReadout(0.5, 0.1)).toBe('0.5');
  });
});

describe('settings pages: a damaged save still gives a playable game', () => {
  it('keeps good values and takes defaults for the rest', () => {
    const raw = JSON.stringify({
      display: { brightness: 'bright', quality: 'ultra', brightnessSet: true },
      camera: 5,
      play: { difficulty: 'hard', textSize: 'huge', crouchToggle: false },
      bindings: 'broken',
    });
    const s = parseSettings(raw);
    expect(s.display.brightness).toBe(defaultSettings().display.brightness);
    expect(s.display.quality).toBe('medium');
    expect(s.display.brightnessSet).toBe(true);
    expect(s.camera).toEqual(defaultSettings().camera);
    expect(s.play.difficulty).toBe('dusk');
    expect(s.play.textSize).toBe('medium');
    expect(s.play.crouchToggle).toBe(false);
    expect(s.bindings).toEqual(defaultBindings());
  });

  it('gives the defaults for a save that is not JSON', () => {
    expect(parseSettings('{not json')).toEqual(defaultSettings());
  });
});
