import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, SKILL_IDS, type ExperienceEvent, type GameState } from './index';

// Compile-time check that the shared shapes fit together, plus a round trip through JSON.
describe('shared types', () => {
  it('a GameState round-trips through JSON unchanged', () => {
    const skills = Object.fromEntries(SKILL_IDS.map((id) => [id, { level: 1, xp: 0 }])) as GameState['skills'];
    const state: GameState = {
      version: SAVE_VERSION,
      seed: 12345,
      timeOfDay: 8,
      hero: { position: { x: 0, z: 0 }, hp: 100, maxHp: 100, gold: 0, rank: 'apprentice', regionId: 'tallowmere' },
      skills,
      inventory: [{ itemId: 'arrow', count: 20 }],
      squad: [],
      places: [{ id: 'fairlow', kind: 'town', name: 'Fairlow', position: { x: 10, z: -4 }, regionId: 'valley', captured: false }],
      households: [{ id: 'hesper', placeId: 'fairlow', windowCount: 1, litWindows: 0 }],
      openedChests: [],
    };
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('lists the nine skills of design section 6', () => {
    expect(SKILL_IDS).toHaveLength(9);
    expect(new Set(SKILL_IDS).size).toBe(9);
  });

  it('an experience event round-trips through JSON', () => {
    const event: ExperienceEvent = { skill: 'archery', action: 'weak-point-hit', targetId: 'bandit-brute', difficulty: 0.8, regionId: 'tallowmere' };
    expect(JSON.parse(JSON.stringify(event))).toEqual(event);
  });
});
