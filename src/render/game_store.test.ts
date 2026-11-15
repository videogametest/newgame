import { describe, expect, it } from 'vitest';
import { populatedGame } from '../core/saves/fixture';
import { GAME_SAVE_KEY, readGame, writeGame, browserGameStore } from './game_store';
import { SETTINGS_KEY } from '../core/settings/settings';

describe('local game storage', () => {
  it('saves and reloads through a storage boundary without touching settings', () => {
    const data = new Map([[SETTINGS_KEY, 'keep me']]);
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
    const game = populatedGame(); expect(writeGame(game, store)).toBe(true);
    expect(data.has(GAME_SAVE_KEY)).toBe(true); expect(readGame(1066, store).state).toEqual(game);
    expect(data.get(SETTINGS_KEY)).toBe('keep me');
  });
  it('reports absent/blocked storage and quota failures without crashing', () => {
    expect(browserGameStore()).toBeNull(); expect(readGame(1, null).status).toBe('unavailable'); expect(writeGame(populatedGame(), null)).toBe(false);
    const store = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(readGame(1, store).status).toBe('unavailable'); expect(writeGame(populatedGame(), store)).toBe(false);
  });
  it('an invalid state never replaces the last good save', () => {
    let text = 'previous'; const store = { getItem: () => text, setItem: (_k: string, v: string) => { text = v; } };
    const g = populatedGame(); g.hero.hp = NaN; expect(writeGame(g, store)).toBe(false); expect(text).toBe('previous');
  });
});
