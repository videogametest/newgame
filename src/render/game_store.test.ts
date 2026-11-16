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

// Real encounter reconstruction, no Babylon scene required.
import { ValleyFight } from './valley_fight';
import { createBattle } from '../core/battle';
import { PATROL_HUT_FIGHT } from '../data/patrol_hut_fight';
import { valleyBattleGround } from '../core/world/valley_battle';
import { TUNING } from '../config/tuning';
describe('live save adapters', () => {
  it('reconstructed Mill starts at the saved hour and cannot resurrect saved outcomes', () => {
    const game = populatedGame(); game.places[0].status = 'held'; game.bandits.dob_finch = 'dead';
    const fight = Object.create(ValleyFight.prototype) as ValleyFight;
    Object.assign(fight, { game, battle: createBattle(PATROL_HUT_FIGHT, valleyBattleGround()) });
    const mill = fight['newMill']();
    expect(mill.members.get('dob_finch')!.fighter.alive).toBe(false);
    expect(mill.members.get('dob_finch')!.fighter.hp).toBe(0);
    expect(mill.members.get('odo_varn')!.fighter.alive).toBe(true);
    mill.advance(fight.battle, game.timeOfDay, game.places[0], 'still', TUNING.fixedDt);
    expect(mill.members.get('dob_finch')!.fighter.alive).toBe(false);
    expect(game.speech.lines['overheard.mill.3.0#0']).toBe(130);
  });
});
