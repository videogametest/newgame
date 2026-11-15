import { describe, expect, it } from 'vitest';
import { COMBAT_DEPTH_TUNING as D } from './data';
import { isBehind, resolveBladeDamage } from './blade';

describe('short-blade first strike (§5, "The first arrow")', () => {
  it('an unaware enemy struck from behind takes the same first-strike increase as an arrow', () => {
    expect(resolveBladeDamage(10, { unaware: true, fromBehind: true })).toBe(10 * D.weakPoints.firstStrike);
  });

  it('no bonus when the enemy is aware, or when the hero is in front of them', () => {
    expect(resolveBladeDamage(10, { unaware: false, fromBehind: true })).toBe(10);
    expect(resolveBladeDamage(10, { unaware: true, fromBehind: false })).toBe(10);
    expect(resolveBladeDamage(10, { unaware: false, fromBehind: false })).toBe(10);
  });

  it('Stane cannot be surprised, so he gets no bonus even from behind', () => {
    expect(resolveBladeDamage(10, { unaware: true, fromBehind: true, cannotBeSurprised: true })).toBe(10);
  });

  it('never returns negative damage', () => {
    expect(resolveBladeDamage(-4, { unaware: true, fromBehind: true })).toBe(0);
  });

  it('the bonus is the arrow first-strike value, not a second number', () => {
    expect(resolveBladeDamage(1, { unaware: true, fromBehind: true }, 2)).toBe(2);
  });
});

describe('from behind', () => {
  // An enemy at the origin facing +z (yaw 0).
  it('the hero directly behind the enemy counts as behind', () => {
    expect(isBehind(0, 0, 0, 0, -3)).toBe(true);
  });
  it('the hero directly in front does not', () => {
    expect(isBehind(0, 0, 0, 0, 3)).toBe(false);
  });
  it('the hero at the side is not behind (exactly a right angle is in front)', () => {
    expect(isBehind(0, 0, 0, 3, 0)).toBe(false);
    expect(isBehind(0, 0, 0, -3, 0)).toBe(false);
  });
  it('handles yaw wrap across ±π', () => {
    // Facing just under +π, the hero at +z is behind by a small wrap-around angle, not a large one.
    expect(isBehind(Math.PI - 0.1, 0, 0, 0, 3)).toBe(true);
    expect(isBehind(-Math.PI + 0.1, 0, 0, 0, -3)).toBe(false);
  });
});
