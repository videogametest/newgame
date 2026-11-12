// Mercy has its own tools, and is never the duller path (GAME_DESIGN.md section 5; second research pass).
import { describe, expect, it } from 'vitest';
import { COMBAT_DEPTH_TUNING as DEPTH } from './data';
import {
  bluntKnockdownSeconds, companionDamageMultiplier, LETHAL, NONLETHAL, pommelStrike, resolveDefeat, wake, yieldsAtArrowPoint,
} from './enemies';
import { BANDITS } from './bandit-data';

describe('mercy has as many tools as killing', () => {
  it('there are at least as many ways to knock out as to kill', () => {
    expect(NONLETHAL.length).toBeGreaterThanOrEqual(LETHAL.length);
    for (const tool of NONLETHAL) expect(LETHAL).not.toContain(tool);
  });
  it('every non-lethal tool knocks out and none of them kills', () => {
    for (const tool of NONLETHAL) expect(resolveDefeat({ hp: 10, state: 'alive' }, 50, tool).state).toBe('knocked_out');
    for (const tool of LETHAL) expect(resolveDefeat({ hp: 10, state: 'alive' }, 50, tool).state).toBe('dead');
  });
  it('a blunt arrow puts a light enemy on the ground, and a heavy one only from a perfect draw', () => {
    expect(bluntKnockdownSeconds('light', false)).toBeGreaterThan(0);
    expect(bluntKnockdownSeconds('heavy', false)).toBe(0);
    expect(bluntKnockdownSeconds('heavy', true)).toBeGreaterThan(0);
    expect(bluntKnockdownSeconds('heavy', true)).toBeLessThan(bluntKnockdownSeconds('light', false));
  });
  it('the pommel answers a perfect dodge without killing: light enemies go down, heavy ones are hurt badly', () => {
    expect(pommelStrike(null, 'a', 'light', 10)).toBeNull();
    expect(pommelStrike('b', 'a', 'light', 10)).toBeNull();
    const light = pommelStrike('a', 'a', 'light', 10)!;
    expect(light).toMatchObject({ instantKnockout: true, openTarget: null });
    expect(resolveDefeat({ hp: 80, state: 'alive' }, light.damage, light.tool, light.instantKnockout).state).toBe('knocked_out');
    const heavy = pommelStrike('a', 'a', 'heavy', 10)!;
    expect(heavy.instantKnockout).toBe(false);
    // Worth more than the killing answer to the same opening, so mercy is not the slower way through a brute.
    expect(heavy.damage).toBeGreaterThan(10 * DEPTH.dodge.criticalMultiplier);
    expect(resolveDefeat({ hp: 20, state: 'alive' }, heavy.damage, heavy.tool).state).toBe('knocked_out');
  });
  it('no kind of enemy has to be killed: every unit can be brought down by a tool that does not kill', () => {
    const weights = { soldier: 'light', archer: 'light', shield_bearer: 'light', runner: 'light', brute: 'heavy' } as const;
    for (const unit of new Set(BANDITS.map(b => b.unit))) {
      const w = weights[unit];
      const pommel = pommelStrike('x', 'x', w, 10)!;
      expect(pommel.instantKnockout || pommel.damage > 0, unit).toBe(true);
      expect(resolveDefeat({ hp: 1, state: 'alive' }, 1, 'blunt').state, unit).toBe('knocked_out');
    }
  });
});

describe('called on to yield', () => {
  const held = { heldSeconds: 2, seesHero: true, alone: true, healthShare: 1, loyalty: 'low' as const };
  it('a low-loyalty bandit caught alone yields unhurt to a held draw', () => {
    expect(yieldsAtArrowPoint(held)).toBe(true);
  });
  it('not before the draw has been held, not if they cannot see it, and not with a friend in sight', () => {
    expect(yieldsAtArrowPoint({ ...held, heldSeconds: 0.5 })).toBe(false);
    expect(yieldsAtArrowPoint({ ...held, seesHero: false })).toBe(false);
    expect(yieldsAtArrowPoint({ ...held, alone: false })).toBe(false);
  });
  it('the loyal must be hurt first, and leaders and Stane never yield this way', () => {
    expect(yieldsAtArrowPoint({ ...held, loyalty: 'middling' })).toBe(false);
    expect(yieldsAtArrowPoint({ ...held, loyalty: 'middling', healthShare: 0.5 })).toBe(true);
    expect(yieldsAtArrowPoint({ ...held, loyalty: 'high', healthShare: 0.5 })).toBe(false);
    expect(yieldsAtArrowPoint({ ...held, loyalty: 'high', healthShare: 0.25 })).toBe(true);
    expect(yieldsAtArrowPoint({ ...held, unbreakable: true })).toBe(false);
  });
});

describe('binding, and companions who finish what the hero starts', () => {
  it('a bound bandit keeps their finder busy longer and gets up out of the fight', () => {
    const woken = wake('knocked_out', 'held', true, 100)!;
    const freed = wake('knocked_out', 'held', true, 100, true)!;
    expect(woken.state).toBe('alive');
    expect(freed.state).toBe('spared');
    expect(freed.afterSeconds).toBeGreaterThan(woken.afterSeconds * 2);
    expect(freed.alert).toBe(true);
  });
  it('a companion does full damage only to those the hero has marked or struck', () => {
    expect(companionDamageMultiplier(true)).toBe(1);
    expect(companionDamageMultiplier(false)).toBeLessThan(1);
  });
});
