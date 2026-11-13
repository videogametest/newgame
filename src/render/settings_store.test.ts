import { describe, expect, it } from 'vitest';
import { readSettings } from './settings_store';
import { defaultSettings, SETTINGS_KEY } from '../core/settings/settings';
import { defaultBindings } from '../core/settings/actions';

function storeWith(raw: string | null) {
  return { getItem: (key: string) => (key === SETTINGS_KEY ? raw : null) };
}

describe('readSettings', () => {
  it('returns the defaults when nothing is saved', () => {
    expect(readSettings(null)).toEqual(defaultSettings());
    expect(readSettings(storeWith(null))).toEqual(defaultSettings());
  });

  it('returns the defaults for garbage JSON', () => {
    expect(readSettings(storeWith('{not json'))).toEqual(defaultSettings());
    expect(readSettings(storeWith('42'))).toEqual(defaultSettings());
  });

  it('survives a store that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('storage disabled');
      },
    };
    expect(readSettings(throwing)).toEqual(defaultSettings());
  });

  it('keeps good values and falls back per field when a save is damaged', () => {
    const raw = JSON.stringify({
      display: { brightness: 1.2, quality: 'ultra' },
      bindings: { keyboard: { dodge: 'Space', moveForward: 7 } },
    });
    const s = readSettings(storeWith(raw));
    expect(s.display.brightness).toBe(1.2);
    expect(s.display.quality).toBe(defaultSettings().display.quality);
    // A damaged binding list must not leave an action unbound or crash the game.
    const bindings = s.bindings ?? defaultBindings();
    expect(Array.isArray(bindings.keyboard.dodge)).toBe(true);
    expect(Array.isArray(bindings.keyboard.moveForward)).toBe(true);
    expect(bindings.keyboard.moveForward.length).toBeGreaterThan(0);
  });
});
