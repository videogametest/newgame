import { describe, expect, it } from 'vitest';
import { bowDamage, bowSpeed } from '../combat';
import { TUNING } from '../../config/tuning';
import { ARROW_TYPES, COMBAT_DEPTH_TUNING as D, DIFFICULTY_PRESETS, REGION_DIFFICULTY } from './data';
import { consumeDodgeOpening, drawTiming, isPerfectDodge, resolveArrowDamage, scaleEnemyStats, weakPointMultiplier } from './archery';
import type { ArrowHit } from './archery';

const hit: ArrowHit = { type: 'standard', zone: 'head', helmet: 'none', fromFront: true, unaware: false };

describe('weak points and arrow definitions (§5)', () => {
  it('has all four arrow types with fire and distraction effects as data', () => {
    expect(Object.keys(ARROW_TYPES)).toEqual(['standard', 'fire', 'blunt', 'whistling']);
    expect(ARROW_TYPES.fire).toMatchObject({ ignites: true, revealsAtNight: true, scarce: true });
    expect(ARROW_TYPES.whistling).toMatchObject({ damageMultiplier: 0, distracts: true, scarce: true });
  });
  it('a head shot is worth half as much again, not several times: heads are large on these models', () => {
    expect(weakPointMultiplier(hit)).toBe(D.weakPoints.head);
    expect(weakPointMultiplier(hit)).toBeGreaterThan(1);
    expect(weakPointMultiplier(hit)).toBeLessThanOrEqual(1.5);
    expect(weakPointMultiplier({ ...hit, zone: 'body' })).toBe(1);
  });
  it('a helmet removes the bonus from the front, and not from behind', () => {
    for (const helmet of ['ordinary', 'brute'] as const) {
      expect(weakPointMultiplier({ ...hit, helmet, fromFront: true })).toBe(1);
      expect(weakPointMultiplier({ ...hit, helmet, fromFront: false })).toBe(D.weakPoints.head);
    }
  });
  it('one arrow kills from surprise, not from the head alone', () => {
    const aware = resolveArrowDamage(10, hit).damage;
    const unaware = resolveArrowDamage(10, { ...hit, unaware: true }).damage;
    expect(unaware).toBeGreaterThan(aware * 2);
  });
  it('blunt arrows have lower damage and no ordinary head bonus', () => {
    const blunt = resolveArrowDamage(10, { ...hit, type: 'blunt' });
    expect(blunt).toEqual({ damage: 10 * ARROW_TYPES.blunt.damageMultiplier, lethal: false, instantKnockout: false });
    expect(blunt.damage).toBeLessThan(resolveArrowDamage(10, { ...hit, zone: 'body' }).damage);
  });
  it('an unaware blunt headshot knocks out immediately, but a body shot does not', () => {
    expect(resolveArrowDamage(1, { ...hit, type: 'blunt', unaware: true }).instantKnockout).toBe(true);
    expect(resolveArrowDamage(1, { ...hit, type: 'blunt', unaware: true, zone: 'body' }).instantKnockout).toBe(false);
  });
  it('the first arrow gains bonus damage, except against an unsurprisable target', () => {
    expect(resolveArrowDamage(10, { ...hit, unaware: true }).damage).toBe(10 * D.weakPoints.head * D.weakPoints.firstStrike);
    expect(resolveArrowDamage(10, { ...hit, unaware: true, cannotBeSurprised: true }).damage).toBe(10 * D.weakPoints.head);
    expect(resolveArrowDamage(10, { ...hit, type: 'blunt', unaware: true, cannotBeSurprised: true }).instantKnockout).toBe(false);
  });
  it('whistling arrows never damage, including on unaware heads', () => {
    expect(resolveArrowDamage(100, { ...hit, type: 'whistling', unaware: true })).toEqual({ damage: 0, lethal: false, instantKnockout: false });
  });
  it('accepts configurable weak-point tuning and never converts negative damage to healing', () => {
    expect(weakPointMultiplier(hit, { ...D.weakPoints, head: 7 })).toBe(7);
    expect(resolveArrowDamage(-5, hit).damage).toBe(0);
  });
});

describe('draw and dodge timing (§5)', () => {
  const full = TUNING.bow.fullDrawTime;
  it('reuses existing bow damage and speed before the perfect window', () => {
    expect(drawTiming(full / 2)).toMatchObject({ perfect: false, tired: false, damage: bowDamage(full / 2), speed: bowSpeed(full / 2), gravityMultiplier: 1 });
  });
  it('opens at full draw, closes at the exact upper boundary and tires afterward', () => {
    expect(drawTiming(full - 0.001).perfect).toBe(false);
    expect(drawTiming(full)).toMatchObject({ perfect: true, tired: false, gravityMultiplier: D.draw.gravityMultiplier });
    expect(drawTiming(full).damage).toBe(bowDamage(full) * D.draw.damageMultiplier);
    expect(drawTiming(full + D.draw.perfectSeconds)).toMatchObject({ perfect: false, tired: true, gravityMultiplier: 1, damage: bowDamage(full) });
    expect(drawTiming(full + 10).perfect).toBe(false);
  });
  it('widens the window via data; a zero window awards nothing', () => {
    expect(drawTiming(full + D.draw.perfectSeconds, 2).perfect).toBe(true);
    expect(drawTiming(full, 0).perfect).toBe(false);
  });
  it('only dodges before the strike and within the final window are perfect', () => {
    expect(isPerfectDodge(0, 1)).toBe(false);
    expect(isPerfectDodge(0.95, 1)).toBe(true);
    expect(isPerfectDodge(1, 1)).toBe(false);
    expect(isPerfectDodge(1.01, 1)).toBe(false);
    expect(isPerfectDodge(-0.01, 0)).toBe(false);
    expect(isPerfectDodge(0.8, 1, 2)).toBe(true);
    expect(isPerfectDodge(0.95, 1, 0)).toBe(false);
    expect(isPerfectDodge(0.875, 1, 1, 0.125)).toBe(true);
  });
  it('critical openings apply to the next damaging hit on that enemy once', () => {
    expect(consumeDodgeOpening('a', 'b', 10)).toEqual({ critical: false, damage: 10, openTarget: 'a' });
    expect(consumeDodgeOpening('a', 'a', 0).openTarget).toBe('a');
    const used = consumeDodgeOpening('a', 'a', 10);
    expect(used).toEqual({ critical: true, damage: 10 * D.dodge.criticalMultiplier, openTarget: null });
    expect(consumeDodgeOpening(used.openTarget, 'a', 10).critical).toBe(false);
  });
});

describe('fixed regions and difficulty (§3/§10)', () => {
  it('scales by region and preset, with no player-level parameter', () => {
    expect(scaleEnemyStats({ health: 10, damage: 5 }, { health: 2, damage: 3 }, 0.5)).toEqual({ health: 20, damage: 7.5 });
    expect(REGION_DIFFICULTY.tallowmere).toEqual({ health: 1, damage: 1 });
    expect(REGION_DIFFICULTY.castle).toBeUndefined();
  });
  it('keeps Dusk neutral and presets limited to allowed combat/supply fields', () => {
    expect(Object.values(DIFFICULTY_PRESETS.dusk).every(n => n === 1)).toBe(true);
    const allowed = ['enemyDamage', 'enemySenses', 'perfectDrawWindow', 'perfectDodgeWindow', 'arrowBreakChance', 'foodHealing', 'reinforcements', 'arrowSupply', 'foodSupply'];
    for (const preset of Object.values(DIFFICULTY_PRESETS)) expect(Object.keys(preset)).toEqual(allowed);
  });
  it('Lantern eases combat and Moonless hardens it without changing region health', () => {
    const { lantern, dusk, moonless } = DIFFICULTY_PRESETS;
    expect(lantern.enemyDamage).toBeLessThan(dusk.enemyDamage);
    expect(lantern.enemySenses).toBeLessThan(dusk.enemySenses);
    expect(lantern.perfectDrawWindow).toBeGreaterThan(1);
    expect(lantern.perfectDodgeWindow).toBeGreaterThan(1);
    expect(lantern.arrowBreakChance).toBeLessThan(1);
    expect(lantern.foodHealing).toBeGreaterThan(1);
    expect(moonless.enemyDamage).toBeGreaterThan(1);
    expect(moonless.enemySenses).toBeGreaterThan(1);
    expect(moonless.reinforcements).toBeGreaterThan(1);
    expect(moonless.arrowSupply).toBeLessThan(1);
    expect(moonless.foodSupply).toBeLessThan(1);
  });
});
