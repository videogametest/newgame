import { describe, expect, it } from 'vitest';
import { addArrows, arrowCount, emptyQuiver, landArrow, looseArrow, recoverArrow } from './quiver';
import type { RecoverableArrow } from './quiver';
import { randomStep } from './random';

const arrow: RecoverableArrow = { id: 'a', type: 'blunt', location: 'ground', landedAt: 10, broken: false, pickedUp: false };
describe('physical quiver and recovery (§5)', () => {
  it('starts empty with a configurable integer capacity', () => {
    expect(arrowCount(emptyQuiver())).toBe(0);
    expect(emptyQuiver(3.5).capacity).toBe(3);
    expect(emptyQuiver(-1).capacity).toBe(0);
  });
  it('shares the capacity across all types and reports overflow', () => {
    const first = addArrows(emptyQuiver(3), 'standard', 2);
    const next = addArrows(first.quiver, 'fire', 10);
    expect(next.accepted).toBe(1);
    expect(arrowCount(next.quiver)).toBe(3);
    expect(first.quiver.arrows.fire).toBe(0);
  });
  it('rejects negative additions and only accepts whole arrows', () => {
    expect(addArrows(emptyQuiver(), 'standard', -10).accepted).toBe(0);
    expect(addArrows(emptyQuiver(), 'standard', 2.7).accepted).toBe(2);
  });
  it('fires only an available selected type without mutating the original', () => {
    const q = addArrows(emptyQuiver(), 'blunt', 1).quiver;
    expect(looseArrow(q, 'fire').fired).toBe(false);
    const fired = looseArrow(q, 'blunt');
    expect(fired.fired).toBe(true);
    expect(q.arrows.blunt).toBe(1);
    expect(looseArrow(fired.quiver, 'blunt').fired).toBe(false);
  });
  it('missed arrows stick intact in both ground and scenery', () => {
    for (const location of ['ground', 'scenery'] as const) {
      const landed = landArrow({ id: 'a', type: 'standard', location, landedAt: 0 }, 123, 1);
      expect(landed.arrow.broken).toBe(false);
      expect(landed.seed).toBe(123);
    }
  });
  it('hit breakage is seeded, clamped and resolved once at landing', () => {
    const args = { id: 'a', type: 'standard' as const, location: 'enemy' as const, landedAt: 0 };
    expect(landArrow(args, 42)).toEqual(landArrow(args, 42));
    expect(landArrow(args, 42, 2).arrow.broken).toBe(true);
    expect(landArrow(args, 42, -1).arrow.broken).toBe(false);
    expect(landArrow(args, 42).seed).not.toBe(42);
  });
  it('advancing time alone never refills the quiver', () => {
    const q = emptyQuiver();
    expect(recoverArrow(q, arrow, 10000, false, true).quiver).toBe(q);
    expect(recoverArrow(q, arrow, 9, true, true).recovered).toBe(false);
  });
  it('physical pickup at landing time restores the original type only once', () => {
    const q = emptyQuiver();
    const recovered = recoverArrow(q, arrow, 10, true, false);
    expect(recovered.recovered).toBe(true);
    expect(recovered.quiver.arrows.blunt).toBe(1);
    expect(arrow.pickedUp).toBe(false);
    expect(recoverArrow(recovered.quiver, recovered.arrow, 11, true, false).recovered).toBe(false);
  });
  it('enemy arrows require a fallen target, and broken arrows never return', () => {
    expect(recoverArrow(emptyQuiver(), { ...arrow, location: 'enemy' }, 10, true, false).recovered).toBe(false);
    expect(recoverArrow(emptyQuiver(), { ...arrow, location: 'enemy' }, 10, true, true).recovered).toBe(true);
    expect(recoverArrow(emptyQuiver(), { ...arrow, broken: true }, 10, true, true).recovered).toBe(false);
  });
  it('a full quiver leaves the arrow for a later pickup', () => {
    const full = addArrows(emptyQuiver(1), 'standard', 1).quiver;
    const blocked = recoverArrow(full, arrow, 10, true, true);
    expect(blocked.recovered).toBe(false);
    expect(blocked.arrow.pickedUp).toBe(false);
    expect(recoverArrow(looseArrow(full, 'standard').quiver, blocked.arrow, 11, true, true).recovered).toBe(true);
  });
  it('PRNG is replayable and returns values in [0, 1)', () => {
    let seed = 0;
    for (let n = 0; n < 100; n++) {
      const roll = randomStep(seed);
      expect(roll).toEqual(randomStep(seed));
      expect(roll.value).toBeGreaterThanOrEqual(0);
      expect(roll.value).toBeLessThan(1);
      seed = roll.seed;
    }
  });
});
