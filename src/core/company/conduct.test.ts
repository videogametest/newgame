import { describe, expect, it } from 'vitest';
import { companionMayAttack, companionMayStand, enemiesSenseCompanions, FALLEN_NEEDS_RESCUE, followDistance } from './conduct';

describe('companions are never in the way', () => {
  it('no enemy senses a companion until one is alert to the hero', () => {
    expect(enemiesSenseCompanions([])).toBe(false);
    expect(enemiesSenseCompanions(['unaware', 'suspicious', 'unaware'])).toBe(false);
    expect(enemiesSenseCompanions(['unaware', 'alert'])).toBe(true);
  });
  it('they never start a fight, and under hold they only defend themselves', () => {
    expect(companionMayAttack('follow', false, false)).toBe(false);
    expect(companionMayAttack('follow', false, true)).toBe(false);
    expect(companionMayAttack('follow', true, false)).toBe(true);
    expect(companionMayAttack('hold', true, false)).toBe(false);
    expect(companionMayAttack('hold', true, true)).toBe(true);
  });
  it('they keep close while the hero is crouched, so the hero is not alone', () => {
    expect(followDistance(true)).toBeLessThan(followDistance(false));
    expect(followDistance(true)).toBeGreaterThan(0);
  });
  it('they never stand in a doorway, on a narrow path, or in the line of fire, and never need rescuing', () => {
    expect(companionMayStand({ doorway: false, narrow: false, inLineOfFire: false })).toBe(true);
    for (const k of ['doorway', 'narrow', 'inLineOfFire'] as const) {
      expect(companionMayStand({ doorway: false, narrow: false, inLineOfFire: false, [k]: true })).toBe(false);
    }
    expect(FALLEN_NEEDS_RESCUE).toBe(false);
  });
});
