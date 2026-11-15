import { describe, expect, it } from 'vitest';
import { defaultSettings, parseSettings, serializeSettings, RANGES } from '../core/settings/settings';
import {
  PAGE_IDS,
  allRowPathsKnown,
  formatSlider,
  getAt,
  isSoundPath,
  pageHasSoon,
  resetPage,
  rowsFor,
  settingsPathsOf,
  withAt,
  type Row,
  type SettingsPath,
} from './settings_pages_rules';

const slider = (rows: Row[], path: string) => rows.find((r) => r.path === path) as Extract<Row, { kind: 'slider' }>;

describe('settings page rows', () => {
  it('every row points at a value the settings have', () => {
    expect(allRowPathsKnown()).toBe(true);
  });

  it('the Controls page has no rows of its own (it is its own screen)', () => {
    expect(rowsFor('controls')).toEqual([]);
  });

  it('every settings path a page shows is readable from the defaults', () => {
    const d = defaultSettings();
    for (const page of PAGE_IDS) {
      for (const path of settingsPathsOf(page)) expect(getAt(d, path)).not.toBeUndefined();
    }
  });

  it('Sound rows are the audio bank paths, not settings paths', () => {
    const sound = rowsFor('sound');
    expect(sound.every((r) => isSoundPath(r.path))).toBe(true);
    expect(settingsPathsOf('sound')).toEqual([]);
  });

  it('the brightness row is live and uses the brightness range', () => {
    const row = slider(rowsFor('display'), 'display.brightness');
    expect(row.live).toBe(true);
    expect(row.range).toEqual(RANGES.brightness);
  });

  it('marks every row nothing reads yet, and only those', () => {
    const d = defaultSettings();
    // These rows are read by the game now; every other settings row is still marked soon.
    const readNow = new Set<string>(['display.brightness', 'display.quality', 'sound.master', 'sound.effects', 'sound.muted', 'play.awarenessMarkers']);
    for (const page of PAGE_IDS) {
      for (const row of rowsFor(page)) {
        expect(Boolean(row.notYet), row.path).toBe(!readNow.has(row.path));
      }
    }
    expect(getAt(d, 'display.brightness')).toBe(1);
  });
});

describe('the soon mark', () => {
  it('the Sound page has a soon row (Music), so it shows the foot line; Display has one too', () => {
    expect(pageHasSoon('sound')).toBe(true);
    expect(pageHasSoon('display')).toBe(true);
  });

  it('the Music row carries no note of its own: the mark and the foot line say it', () => {
    const music = rowsFor('sound').find((r) => r.path === 'sound.music');
    expect(music?.note).toBeUndefined();
  });

  it('a page where every row is read now has no foot line', () => {
    expect(pageHasSoon('controls')).toBe(false);
  });
});

describe('withAt', () => {
  it('leaves the original settings unchanged', () => {
    const s = defaultSettings();
    const next = withAt(s, 'display.brightness', 1.2);
    expect(s.display.brightness).toBe(1);
    expect(next.display.brightness).toBe(1.2);
  });

  it('clamps a value out of range rather than saving it', () => {
    expect(withAt(defaultSettings(), 'display.brightness', 9).display.brightness).toBe(RANGES.brightness.max);
    expect(withAt(defaultSettings(), 'camera.fovThirdPerson', 5).camera.fovThirdPerson).toBe(RANGES.fov.min);
  });

  it('rejects a value of the wrong kind by falling back to the default', () => {
    const next = withAt(defaultSettings(), 'display.quality', 'ultra' as never);
    expect(next.display.quality).toBe('medium');
  });
});

describe('resetPage', () => {
  it('puts back only the values on that page', () => {
    let s = defaultSettings();
    s = withAt(s, 'camera.fovThirdPerson', 90);
    s = withAt(s, 'display.brightness', 1.3);
    const reset = resetPage(s, 'camera');
    expect(reset.camera.fovThirdPerson).toBe(60);
    expect(reset.display.brightness).toBe(1.3);
  });

  it('keeps brightnessSet and the bindings', () => {
    let s = withAt(defaultSettings(), 'display.brightness', 1.4);
    s = { ...s, display: { ...s.display, brightnessSet: true } };
    const reset = resetPage(s, 'display');
    expect(reset.display.brightnessSet).toBe(true);
    expect(reset.display.brightness).toBe(1);
    expect(reset.bindings).toEqual(s.bindings);
  });

  it('a page with no settings of its own changes nothing', () => {
    const s = withAt(defaultSettings(), 'camera.shake', 0.2);
    expect(resetPage(s, 'sound')).toEqual(s);
  });

  it('puts every settings path on a page back to its default', () => {
    const d = defaultSettings();
    let s = defaultSettings();
    s = withAt(s, 'play.difficulty', 'lantern');
    s = withAt(s, 'play.crouchToggle', false);
    s = withAt(s, 'play.sprintToggle', true);
    s = withAt(s, 'play.awarenessMarkers', false);
    s = withAt(s, 'play.minimalHud', true);
    s = withAt(s, 'play.characterTones', false);
    s = withAt(s, 'play.textSize', 'large');
    s = withAt(s, 'play.textSpeed', 'instant');
    const reset = resetPage(s, 'play');
    for (const path of settingsPathsOf('play')) expect(getAt(reset, path)).toEqual(getAt(d, path));
  });
});

describe('formatSlider', () => {
  it('shows field of view in degrees', () => {
    expect(formatSlider(slider(rowsFor('camera'), 'camera.fovThirdPerson'), 60)).toBe('60 degrees');
  });

  it('shows other sliders as plain numbers at the step precision', () => {
    expect(formatSlider(slider(rowsFor('display'), 'display.brightness'), 1.05)).toBe('1.05');
    expect(formatSlider(slider(rowsFor('camera'), 'camera.shake'), 0.5)).toBe('0.5');
    expect(formatSlider(slider(rowsFor('controller'), 'controller.deadzone'), 0.15)).toBe('0.15');
  });
});

describe('damaged saved settings', () => {
  it('a damaged settings string still gives a playable result', () => {
    for (const raw of ['{', 'null', '[]', '{"display":{"brightness":"x"}}', '{"camera":null}']) {
      const s = parseSettings(raw);
      expect(s.display.brightness).toBeGreaterThanOrEqual(RANGES.brightness.min);
      expect(s.display.brightness).toBeLessThanOrEqual(RANGES.brightness.max);
      expect(s.camera.fovThirdPerson).toBeGreaterThanOrEqual(RANGES.fov.min);
    }
  });

  it('every row survives a round trip through the saved form', () => {
    for (const page of PAGE_IDS) {
      for (const path of settingsPathsOf(page) as SettingsPath[]) {
        const s = withAt(defaultSettings(), path, getAt(defaultSettings(), path));
        const back = parseSettings(serializeSettings(s));
        expect(getAt(back, path)).toEqual(getAt(s, path));
      }
    }
  });
});
