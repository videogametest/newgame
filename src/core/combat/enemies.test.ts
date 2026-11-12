import { describe, expect, it } from 'vitest';
import { changeMorale, mayAttackHero, moraleReaction, resolveDefeat, shouldStagger, wakeBandit } from './enemies';
import type { HitTool, StaggerHit } from './enemies';

const hit: StaggerHit = { weight: 'light', phase: 'windup', damage: 1, critical: false };
describe('stagger (§5, §9)', () => {
  it('any damaging wind-up hit interrupts a light enemy', () => {
    expect(shouldStagger(hit)).toBe(true);
    expect(shouldStagger({ ...hit, knife: true })).toBe(true);
  });
  it('heavy enemies ignore ordinary and knife hits but not criticals', () => {
    expect(shouldStagger({ ...hit, weight: 'heavy' })).toBe(false);
    expect(shouldStagger({ ...hit, weight: 'heavy', knife: true })).toBe(false);
    expect(shouldStagger({ ...hit, weight: 'heavy', critical: true })).toBe(true);
    expect(shouldStagger({ ...hit, weight: 'heavy', staggersHeavy: true })).toBe(true);
  });
  it('zero damage and non-wind-up phases do not interrupt a wind-up', () => {
    expect(shouldStagger({ ...hit, damage: 0 })).toBe(false);
    for (const phase of ['idle', 'draw', 'swing', 'release'] as const) expect(shouldStagger({ ...hit, phase })).toBe(false);
  });
  it('the perfect-dodge-only boss rule overrides ordinary criticals', () => {
    expect(shouldStagger({ ...hit, critical: true, perfectDodgeOnly: true })).toBe(false);
    expect(shouldStagger({ ...hit, perfectDodgeOnly: true, afterPerfectDodge: true })).toBe(true);
  });
});

describe('attack turns (§5/§9)', () => {
  it('allows at most two ordinary attackers; active attackers keep their turn', () => {
    expect(mayAttackHero('a', [])).toBe(true);
    expect(mayAttackHero('b', ['a'])).toBe(true);
    expect(mayAttackHero('c', ['a', 'b'])).toBe(false);
    expect(mayAttackHero('a', ['a', 'b'])).toBe(true);
  });
  it('counts unique ids and permits a third guard under Stane command only', () => {
    expect(mayAttackHero('b', ['a', 'a'])).toBe(true);
    expect(mayAttackHero('c', ['a', 'b'], true)).toBe(true);
    expect(mayAttackHero('d', ['a', 'b', 'c'], true)).toBe(false);
    expect(mayAttackHero('d', ['a', 'b', 'c'])).toBe(false);
  });
});

describe('place morale (§5)', () => {
  it.each(['defenderBeaten', 'leaderBeaten', 'surprised', 'fireSpread'] as const)('%s lowers morale', event => {
    expect(changeMorale(0.8, event)).toBeLessThan(0.8);
  });
  it('reinforcements raise morale; losses and gains clamp to [0, 1]', () => {
    expect(changeMorale(0.5, 'reinforcements')).toBeGreaterThan(0.5);
    expect(changeMorale(0.99, 'reinforcements')).toBe(1);
    expect(changeMorale(0.01, 'leaderBeaten')).toBe(0);
  });
  it('supports configured flee/surrender below, but not at, the threshold', () => {
    expect(moraleReaction(0.2, 0.3, 'flee')).toBe('flee');
    expect(moraleReaction(0.2, 0.3, 'surrender')).toBe('surrender');
    expect(moraleReaction(0.3, 0.3, 'surrender')).toBe('fight');
    expect(moraleReaction(0, 1, 'surrender', true)).toBe('fight');
  });
});

describe('kill or knock out (§5)', () => {
  it.each(['standard', 'fire', 'blade', 'knife'] satisfies HitTool[])('%s kills at zero HP', tool => {
    expect(resolveDefeat({ hp: 10, state: 'alive' }, 10, tool)).toMatchObject({ hp: 0, state: 'dead', yielded: false });
  });
  it.each(['blunt', 'shield', 'stealth_knockout'] satisfies HitTool[])('%s knocks out at zero HP', tool => {
    expect(resolveDefeat({ hp: 10, state: 'alive' }, 10, tool).state).toBe('knocked_out');
  });
  it('keeps a surviving enemy alive and rejects negative damage', () => {
    expect(resolveDefeat({ hp: 10, state: 'alive' }, 3, 'blade')).toMatchObject({ hp: 7, state: 'alive' });
    expect(resolveDefeat({ hp: 10, state: 'alive' }, -3, 'blade').hp).toBe(10);
  });
  it('supports instant blunt headshot KO but cannot turn a lethal tool into one', () => {
    expect(resolveDefeat({ hp: 100, state: 'alive' }, 1, 'blunt', true).state).toBe('knocked_out');
    expect(resolveDefeat({ hp: 100, state: 'alive' }, 1, 'blade', true).state).toBe('alive');
  });
  it('whistling never defeats a target, even with an invalid instant-KO flag', () => {
    expect(resolveDefeat({ hp: 1, state: 'alive' }, 100, 'whistling', true)).toMatchObject({ hp: 1, state: 'alive', rewardsAllowed: false });
  });
  it('attacking surrenderers grants no reward; inactive states are unchanged', () => {
    expect(resolveDefeat({ hp: 10, state: 'spared' }, 10, 'blade')).toMatchObject({ state: 'dead', rewardsAllowed: false });
    for (const state of ['dead', 'knocked_out', 'stayed', 'left', 'returned_to_stane'] as const) {
      expect(resolveDefeat({ hp: 0, state }, 10, 'blade')).toMatchObject({ state, rewardsAllowed: false });
    }
  });
  it('Stane yields under either lethal or nonlethal damage, with configurable threshold', () => {
    for (const tool of ['blade', 'blunt'] as const) {
      expect(resolveDefeat({ hp: 10, state: 'alive', alwaysYields: true }, 100, tool)).toMatchObject({ state: 'spared', yielded: true });
      expect(resolveDefeat({ hp: 10, state: 'alive', alwaysYields: true, yieldBelowHp: 5 }, 5, tool)).toMatchObject({ hp: 5, state: 'spared', yielded: true });
    }
  });
  it('only a held place and an ally can wake a knocked-out enemy', () => {
    expect(wakeBandit('knocked_out', 'held', true)).toBe('alive');
    expect(wakeBandit('knocked_out', 'held', false)).toBe('knocked_out');
    expect(wakeBandit('knocked_out', 'cleared', true)).toBe('knocked_out');
    expect(wakeBandit('knocked_out', 'freed', true)).toBe('knocked_out');
    expect(wakeBandit('dead', 'held', true)).toBe('dead');
    expect(wakeBandit('spared', 'held', true)).toBe('spared');
  });
});
