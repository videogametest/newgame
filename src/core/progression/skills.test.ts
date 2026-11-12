import { describe, expect, it } from 'vitest';
import { ACTIONS, FORBIDDEN_ACTION_WORDS } from './actions';
import {
  addExperience, awardExperience, awardSharedEvent, catchUpMultiplier, createProgression, mainSkillLevels,
  multiplierFromShared, raiseRegionCap, repeatMultiplier, xpToNext, xpToReach,
} from './skills';
import { PROGRESSION_TUNING as T } from './tuning';
import { SKILLS } from './types';

describe('levels', () => {
  it('starts every skill at level 1', () => {
    const s = createProgression();
    for (const skill of SKILLS) expect(s.skills[skill]).toEqual({ level: 1, xp: 0 });
  });

  it('needs more experience for each level than the one before', () => {
    for (let l = 1; l < T.maxLevel; l++) expect(xpToNext(l + 1)).toBeGreaterThan(xpToNext(l));
  });

  it('levels up and carries the remainder', () => {
    const s = createProgression();
    const gain = addExperience(s, 'archery', xpToNext(1) + 7);
    expect(gain.levelAfter).toBe(2);
    expect(s.skills.archery).toEqual({ level: 2, xp: 7 });
  });

  it('can gain several levels from one award', () => {
    const s = createProgression();
    addExperience(s, 'archery', xpToReach(6));
    expect(s.skills.archery.level).toBe(6);
  });
});

describe('the region cap', () => {
  it('stops a skill at the cap and reports the rest as overflow', () => {
    const s = createProgression(20);
    const gain = addExperience(s, 'archery', xpToReach(20) + 500);
    expect(s.skills.archery.level).toBe(20);
    expect(gain.overflow).toBe(500);
  });

  it('never lets a skill pass the cap however much is earned', () => {
    const s = createProgression(20);
    for (let i = 0; i < 5000; i++) awardExperience(s, { action: 'weak_point_hit', difficulty: 4 });
    expect(s.skills.archery.level).toBe(20);
  });

  it('rises with a new region and never falls', () => {
    const s = createProgression(20);
    raiseRegionCap(s, 30);
    expect(s.regionCap).toBe(30);
    raiseRegionCap(s, 10);
    expect(s.regionCap).toBe(30);
    raiseRegionCap(s, 999);
    expect(s.regionCap).toBe(T.maxLevel);
  });
});

describe('experience comes from accomplishments only', () => {
  it('rejects an action that is not registered', () => {
    const s = createProgression();
    expect(() => awardExperience(s, { action: 'stood_near_enemy' })).toThrow();
    expect(() => awardExperience(s, { action: 'damage_taken' })).toThrow();
  });

  it('has no registered action for time passing or harm taken', () => {
    for (const id of Object.keys(ACTIONS)) {
      for (const word of FORBIDDEN_ACTION_WORDS) expect(id.includes(word), `${id} contains "${word}"`).toBe(false);
    }
  });

  it('gives Toughness nothing for being hit: only dodging and coming through', () => {
    const toughness = Object.entries(ACTIONS).filter(([, awards]) => awards.some((a) => a.skill === 'toughness')).map(([id]) => id);
    expect(toughness.sort()).toEqual(['fight_survived', 'perfect_dodge', 'place_freed']);
  });

  it('gives every skill at least one way to level', () => {
    const covered = new Set(Object.values(ACTIONS).flat().map((a) => a.skill));
    for (const skill of SKILLS) expect(covered.has(skill), skill).toBe(true);
  });
});

describe('harder feats teach more', () => {
  it('scales with difficulty', () => {
    const easy = createProgression();
    const hard = createProgression();
    const [e] = awardExperience(easy, { action: 'arrow_hit', difficulty: 1 });
    const [h] = awardExperience(hard, { action: 'arrow_hit', difficulty: 3 });
    expect(h.gained).toBe(e.gained * 3);
  });

  it('clamps difficulty so nothing is worth unlimited experience', () => {
    const a = createProgression();
    const b = createProgression();
    const [x] = awardExperience(a, { action: 'arrow_hit', difficulty: 1000 });
    const [y] = awardExperience(b, { action: 'arrow_hit', difficulty: T.difficultyMax });
    expect(x.gained).toBe(y.gained);
  });

  it('pays more for a weak point than a body shot', () => {
    expect(ACTIONS.weak_point_hit[0].base).toBeGreaterThan(ACTIONS.arrow_hit[0].base);
  });
});

describe('repetition pays less', () => {
  it('shrinks rewards under one repeat key down to nothing', () => {
    const s = createProgression();
    const gains: number[] = [];
    for (let i = 0; i < T.repeatFalloff.length + 3; i++) {
      gains.push(awardExperience(s, { action: 'arrow_hit', repeatKey: 'practice_target_1' })[0].gained);
    }
    for (let i = 1; i < gains.length; i++) expect(gains[i]).toBeLessThanOrEqual(gains[i - 1]);
    expect(gains[gains.length - 1]).toBe(0);
  });

  it('does not shrink rewards for ordinary fights with no repeat key', () => {
    const s = createProgression();
    const first = awardExperience(s, { action: 'blade_hit' })[0].gained;
    for (let i = 0; i < 20; i++) awardExperience(s, { action: 'blade_hit' });
    expect(repeatMultiplier(s, undefined)).toBe(1);
    expect(first).toBeGreaterThan(0);
  });

  it('tracks each key separately', () => {
    const s = createProgression();
    for (let i = 0; i < 10; i++) awardExperience(s, { action: 'forage', repeatKey: 'bush_a' });
    expect(repeatMultiplier(s, 'bush_a')).toBe(0);
    expect(repeatMultiplier(s, 'bush_b')).toBe(1);
  });
});

describe('catch-up', () => {
  it('leaves skills near the highest alone', () => {
    const s = createProgression();
    s.skills.archery.level = 10;
    s.skills.melee.level = 8;
    expect(catchUpMultiplier(s, 'melee')).toBe(1);
    expect(catchUpMultiplier(s, 'archery')).toBe(1);
  });

  it('speeds up a skill well below the highest, up to a limit', () => {
    const s = createProgression();
    s.skills.archery.level = 18;
    s.skills.melee.level = 12;
    s.skills.cooking.level = 1;
    expect(catchUpMultiplier(s, 'melee')).toBeGreaterThan(1);
    expect(catchUpMultiplier(s, 'cooking')).toBe(T.catchUpMax);
  });
});

describe('main skills', () => {
  it('reports the two highest levels', () => {
    const s = createProgression();
    s.skills.archery.level = 14;
    s.skills.stealth.level = 11;
    s.skills.melee.level = 5;
    expect(mainSkillLevels(s)).toEqual([14, 11]);
  });
});

describe('the curve, provisionally', () => {
  // A first calibration, to be replaced by the bot-driven pacing test in task 006.
  // Rough experience a main skill earns by each beat should land inside the pacing bands.
  it('puts plausible experience totals inside the bands', () => {
    const levelFor = (xp: number) => {
      const s = createProgression(20);
      addExperience(s, 'archery', xp);
      return s.skills.archery.level;
    };
    expect(levelFor(200)).toBeGreaterThanOrEqual(4);
    expect(levelFor(200)).toBeLessThanOrEqual(7);
    expect(levelFor(550)).toBeGreaterThanOrEqual(8);
    expect(levelFor(550)).toBeLessThanOrEqual(12);
    expect(levelFor(1300)).toBeGreaterThanOrEqual(13);
    expect(levelFor(1300)).toBeLessThanOrEqual(16);
    expect(levelFor(2700)).toBeGreaterThanOrEqual(18);
    expect(levelFor(2700)).toBeLessThanOrEqual(20);
  });
});

describe('the shared event form', () => {
  const event = { skill: 'archery', action: 'weak-point-hit', targetId: 'bandit-brute', difficulty: 0.2, regionId: 'tallowmere' } as const;

  it('accepts hyphenated action ids and awards the same as the direct form', () => {
    const a = createProgression();
    const b = createProgression();
    const [shared] = awardSharedEvent(a, event);
    const [direct] = awardExperience(b, { action: 'weak_point_hit', difficulty: multiplierFromShared(0.2) });
    expect(shared.gained).toBe(direct.gained);
  });

  it('treats a difficulty near 0.2 as ordinary and 1 as much harder', () => {
    expect(multiplierFromShared(0.2)).toBeCloseTo(1);
    expect(multiplierFromShared(1)).toBeGreaterThan(multiplierFromShared(0.2));
    expect(multiplierFromShared(5)).toBe(multiplierFromShared(1));
  });

  it('refuses an event that names a skill the action does not teach', () => {
    const s = createProgression();
    expect(() => awardSharedEvent(s, { ...event, skill: 'cooking' })).toThrow();
  });

  it('refuses an unknown action', () => {
    const s = createProgression();
    expect(() => awardSharedEvent(s, { ...event, action: 'damage-taken' })).toThrow();
  });

  it('shrinks rewards only when the target is marked repeatable', () => {
    const farmed = createProgression();
    const fought = createProgression();
    let lastFarmed = 0;
    let lastFought = 0;
    for (let i = 0; i < 10; i++) {
      lastFarmed = awardSharedEvent(farmed, { ...event, action: 'arrow-hit', targetId: 'practice-target', repeatable: true })[0].gained;
      lastFought = awardSharedEvent(fought, { ...event, action: 'arrow-hit', targetId: 'practice-target' })[0].gained;
    }
    expect(lastFarmed).toBe(0);
    expect(lastFought).toBeGreaterThan(0);
  });
});
