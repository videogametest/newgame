import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, SKILL_IDS, type ExperienceEvent, type GameState } from './index';
import { migrateSave, newGameState } from '../state';

// Compile-time check that the shared shapes fit together, plus a round trip through JSON.
function sampleState(): GameState {
  return newGameState(12345);
}

describe('shared types', () => {
  it('a GameState round-trips through JSON unchanged', () => {
    const state = sampleState();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('keeps the hero rank in progression only, not on the hero', () => {
    const state = sampleState();
    expect(state.progression.rank).toBe('apprentice');
    expect('rank' in state.hero).toBe(false);
  });

  it('lists the nine skills of design section 6', () => {
    expect(SKILL_IDS).toHaveLength(9);
    expect(new Set(SKILL_IDS).size).toBe(9);
  });

  it('an experience event round-trips through JSON, with and without repeatable', () => {
    const event: ExperienceEvent = { skill: 'archery', action: 'weak-point-hit', targetId: 'bandit-brute', difficulty: 0.8, regionId: 'tallowmere', repeatable: true };
    expect(JSON.parse(JSON.stringify(event))).toEqual(event);
    const plain: ExperienceEvent = { skill: 'archery', action: 'weak-point-hit', targetId: 'bandit-brute', difficulty: 0.8, regionId: 'tallowmere' };
    expect(JSON.parse(JSON.stringify(plain))).toEqual(plain);
  });

  it('a new game starts at dusk with every place held and one window lit', () => {
    const state = newGameState(7);
    expect(state.timeOfDay).toBe(18);
    expect(state.places.every(p => p.status === 'held')).toBe(true);
    expect(state.households).toHaveLength(16);
    expect(state.households.filter(h => h.home).map(h => h.id)).toEqual(['hesper']);
    expect(state.purse).toEqual({ carried: 0, stored: 0 });
    expect(state.inventory.recipes.length).toBeGreaterThan(0);
  });

  it('brings a version 1 save up to date without losing crowns or items', () => {
    const v1 = { version: 1, seed: 9, timeOfDay: 10, day: 4, hero: { position: { x: 3, z: 4 }, hp: 60, maxHp: 100, gold: 85, regionId: 'tallowmere' },
      inventory: [{ itemId: 'apple', count: 3 }], squad: [], discoveredPlaces: ['mill'] };
    const state = migrateSave(v1)!;
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.purse).toEqual({ carried: 85, stored: 0 });
    expect('gold' in state.hero).toBe(false);
    expect(state.hero.hp).toBe(60);
    expect(state.inventory.carried).toEqual([{ itemId: 'apple', count: 3 }]);
    expect(state.day).toBe(4);
    expect(state.discoveredPlaces).toEqual(['mill']);
    expect(state.stories.miller.stage).toBe('closed');
    expect('squad' in state).toBe(false);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('leaves a current save as it is, and refuses what is not a save', () => {
    const now = newGameState(3);
    expect(migrateSave(JSON.parse(JSON.stringify(now)))).toEqual(now);
    expect(migrateSave(null)).toBeNull();
    expect(migrateSave({ version: 'x' })).toBeNull();
    expect(migrateSave({ version: 99, seed: 1 })).toBeNull();
  });
});
