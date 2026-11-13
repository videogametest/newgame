import { describe, expect, it } from 'vitest';
import { insideFootprint, solidAt, type Footprint } from './solids';

const north: Footprint = { x: 0, z: 0, facing: 0, half: 4.5 };

describe('solid footprints', () => {
  it('an unturned square covers its side length in both directions', () => {
    expect(insideFootprint(north, 4.5, 0)).toBe(true);
    expect(insideFootprint(north, 0, -4.5)).toBe(true);
    expect(insideFootprint(north, 4.6, 0)).toBe(false);
    expect(insideFootprint(north, 0, 4.6)).toBe(false);
  });

  it('a square turned 45 degrees reaches its corner on the axis, not its side', () => {
    const turned: Footprint = { ...north, facing: 45 };
    const corner = 4.5 * Math.SQRT2;
    expect(insideFootprint(turned, 0, -corner + 0.01)).toBe(true);
    expect(insideFootprint(turned, 0, -corner - 0.05)).toBe(false);
    // Along a diagonal the flat sides are 4.5 m out, so a point 4.5 m east is still inside the diamond.
    expect(insideFootprint(turned, 4.5, 0)).toBe(true);
    expect(insideFootprint(turned, 4.5, 4.5)).toBe(false);
  });

  it('turning by a compass bearing moves the square with the bearing (90 degrees is east)', () => {
    const east: Footprint = { x: 0, z: 0, facing: 90, half: 2 };
    expect(insideFootprint(east, 1.5, 0)).toBe(true);
    expect(insideFootprint(east, 0, -1.5)).toBe(true);
  });

  it('solidAt is true inside any footprint and false outside all of them', () => {
    const fs: Footprint[] = [north, { x: 20, z: 0, facing: 0, half: 1 }];
    expect(solidAt(fs, 20.5, 0.5)).toBe(true);
    expect(solidAt(fs, 10, 0)).toBe(false);
    expect(solidAt([], 0, 0)).toBe(false);
  });
});
