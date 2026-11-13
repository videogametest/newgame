// The saved settings, read once and handed to the game (task 009). The rules are in src/core/settings; this file
// is the only place that reads them from the browser, through parseSettings, so a damaged save cannot break play.

import { parseSettings, serializeSettings, SETTINGS_KEY, type Settings } from '../core/settings/settings';

/** Reads the saved settings from a store (the browser's localStorage, or any stand-in). Never throws. */
export function readSettings(store: { getItem(key: string): string | null } | null): Settings {
  let raw: string | null = null;
  try {
    raw = store ? store.getItem(SETTINGS_KEY) : null;
  } catch {
    raw = null;
  }
  return parseSettings(raw);
}

let loaded: Settings | null = null;

/** The settings in use, read from the browser the first time they are asked for. */
export function currentSettings(): Settings {
  if (!loaded) loaded = readSettings(browserStore());
  return loaded;
}

/**
 * Makes these settings the ones in use and saves them. A store that refuses the write (private mode, full storage)
 * still changes the settings for this session; they are only lost on reload.
 */
export function saveSettings(next: Settings, store: { setItem(key: string, value: string): void } | null = browserStore()): void {
  loaded = next;
  try {
    store?.setItem(SETTINGS_KEY, serializeSettings(next));
  } catch {
    // Nothing to do: the change applies for this session.
  }
}

function browserStore(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}
