// Audio volume settings. Saved in the browser separately from the game save.
// Pure: parsing and clamping only. No Web Audio here.

export interface SoundSettings {
  /** 0..1, scales everything. */
  master: number;
  /** 0..1, scales sound effects. */
  effects: number;
  /** 0..1, scales music. Music is not in the build yet; the value is kept so the setting survives. */
  music: number;
  muted: boolean;
}

export const SOUND_STORAGE_KEY = 'everylitwindow.sound.v1';

export const DEFAULT_SOUND: SoundSettings = { master: 0.8, effects: 1, music: 0.5, muted: false };

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/**
 * Reads a saved settings string. Anything missing or malformed falls back to the default for that field,
 * so a bad value can never silence or break the game.
 */
export function parseSoundSettings(raw: string | null): SoundSettings {
  if (!raw) return { ...DEFAULT_SOUND };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SOUND };
  }
  if (typeof data !== 'object' || data === null) return { ...DEFAULT_SOUND };
  const d = data as Record<string, unknown>;
  const pick = (key: 'master' | 'effects' | 'music'): number =>
    typeof d[key] === 'number' ? clamp01(d[key]) : DEFAULT_SOUND[key];
  return {
    master: pick('master'),
    effects: pick('effects'),
    music: pick('music'),
    muted: typeof d.muted === 'boolean' ? d.muted : DEFAULT_SOUND.muted,
  };
}

/** The string written to storage. */
export function serializeSoundSettings(s: SoundSettings): string {
  return JSON.stringify({
    master: clamp01(s.master),
    effects: clamp01(s.effects),
    music: clamp01(s.music),
    muted: s.muted,
  });
}
