import { describe, expect, it } from 'vitest';
import { DEFAULT_SOUND, parseSoundSettings, serializeSoundSettings } from './sound_settings';

describe('parseSoundSettings', () => {
  it('returns the defaults when nothing is saved', () => {
    expect(parseSoundSettings(null)).toEqual(DEFAULT_SOUND);
  });

  it('returns the defaults for corrupt JSON or a non-object', () => {
    expect(parseSoundSettings('{not json')).toEqual(DEFAULT_SOUND);
    expect(parseSoundSettings('42')).toEqual(DEFAULT_SOUND);
    expect(parseSoundSettings('null')).toEqual(DEFAULT_SOUND);
  });

  it('clamps volumes into 0..1', () => {
    const s = parseSoundSettings(JSON.stringify({ master: 3, effects: -1, music: 0.25, muted: false }));
    expect(s.master).toBe(1);
    expect(s.effects).toBe(0);
    expect(s.music).toBe(0.25);
  });

  it('falls back per field when one value has the wrong type', () => {
    const s = parseSoundSettings(JSON.stringify({ master: '0.5', effects: 0.4, muted: 'yes' }));
    expect(s.master).toBe(DEFAULT_SOUND.master);
    expect(s.effects).toBe(0.4);
    expect(s.muted).toBe(DEFAULT_SOUND.muted);
  });

  it('keeps a saved mute', () => {
    expect(parseSoundSettings(JSON.stringify({ muted: true })).muted).toBe(true);
  });

  it('round-trips through serialize', () => {
    const s = { master: 0.3, effects: 0.6, music: 0.9, muted: true };
    expect(parseSoundSettings(serializeSoundSettings(s))).toEqual(s);
  });
});
