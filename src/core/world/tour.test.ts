import { describe, expect, it } from 'vitest';
import { TOUR_VIEWS, nextTourIndex, tourIndexOf } from './tour';
import { blocksHero, isWalkableGround } from './valley';

describe('tour views', () => {
  it('every hero point stands on walkable, unblocked ground', () => {
    for (const v of TOUR_VIEWS) {
      expect(isWalkableGround(v.hero.x, v.hero.z), `${v.name} hero point is not walkable`).toBe(true);
      expect(blocksHero(v.hero.x, v.hero.z), `${v.name} hero point is blocked`).toBe(false);
    }
  });

  it('names are unique and every view has a clock hour in the day', () => {
    const names = TOUR_VIEWS.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length);
    for (const v of TOUR_VIEWS) expect(v.tod).toBeGreaterThanOrEqual(0);
    for (const v of TOUR_VIEWS) expect(v.tod).toBeLessThan(24);
  });

  it('stepping wraps at both ends', () => {
    expect(nextTourIndex(0, -1, 5)).toBe(4);
    expect(nextTourIndex(4, 1, 5)).toBe(0);
    expect(nextTourIndex(2, 3, 5)).toBe(0);
    expect(nextTourIndex(0, 1, 5)).toBe(1);
  });

  it('finds views by name', () => {
    expect(tourIndexOf('arrival')).toBe(0);
    expect(tourIndexOf('nope')).toBe(-1);
  });
});
