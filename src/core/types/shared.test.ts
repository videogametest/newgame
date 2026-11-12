import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, SKILL_IDS, type ExperienceEvent, type GameState } from './index';
import { createProgression } from '../progression/skills';

// Compile-time check that the shared shapes fit together, plus a round trip through JSON.
function sampleState(): GameState {
  return {
    version: SAVE_VERSION,
    seed: 12345,
    timeOfDay: 8,
    day: 1,
    hero: { position: { x: 0, z: 0 }, hp: 100, maxHp: 100, gold: 0, regionId: 'tallowmere' },
    progression: createProgression(),
    inventory: [{ itemId: 'arrow', count: 20 }],
    squad: [],
    places: [{ id: 'wick', status: 'held', timesFreed: 0, bellSilenced: false, morale: 1 }],
    households: [{ id: 'hesper', home: false }],
    openedChests: [],
    discoveredPlaces: [],
    fragmentsFound: [],
    bandits: { stane: 'alive' },
    lostPeople: [],
    trialsPassed: [],
    stolenGoodsReturned: [],
    projectsBuilt: [],
    campfiresFound: [],
    storyMoments: [],
  };
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
});
