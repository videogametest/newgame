import { describe, expect, it } from 'vitest';
import { createHeightAt, type TerrainShape } from './terrain';

const shape: TerrainShape = {
  baseHeight: 2,
  layers: [{ wavelength: 40, amplitude: 8 }, { wavelength: 10, amplitude: 2 }],
  features: [],
};

describe('seeded height (§2, §7)', () => {
  it('reproduces samples from the save seed without dependence on call order', () => {
    const a = createHeightAt(123, shape);
    const b = createHeightAt(123, shape);
    for (const [x, z] of [[0, 0], [12.5, 70], [-11, -60], [400, -400]]) {
      a(999, -123);
      expect(a(x, z)).toBe(b(x, z));
      expect(a(x, z)).toBeGreaterThanOrEqual(-8);
      expect(a(x, z)).toBeLessThanOrEqual(12);
    }
  });
  it('changes the terrain with a different seed', () => {
    expect(createHeightAt(1, shape)(12, 5)).not.toBe(createHeightAt(2, shape)(12, 5));
  });
  it('is continuous across lattice and chunk boundaries including negative coordinates', () => {
    const heightAt = createHeightAt(3, shape);
    for (const x of [-40, -10, 0, 10, 40]) {
      expect(Math.abs(heightAt(x - 0.000001, 4) - heightAt(x + 0.000001, 4))).toBeLessThan(0.00001);
    }
  });
  it('reads raised/depressed features from data and has compact support', () => {
    const heightAt = createHeightAt(0, {
      baseHeight: 5, layers: [], features: [{ x: 3, z: 4, radius: 10, height: -8 }],
    });
    expect(heightAt(3, 4)).toBe(-3);
    expect(heightAt(8, 4)).toBe(1);
    expect(heightAt(13, 4)).toBe(5);
    expect(heightAt(100, 100)).toBe(5);
  });
  it('snapshots config rather than changing a sampler after creation', () => {
    const config = { baseHeight: 1, layers: [{ wavelength: 10, amplitude: 1 }], features: [] };
    const heightAt = createHeightAt(5, config);
    const before = heightAt(2, 3);
    config.baseHeight = 100;
    config.layers[0].amplitude = 100;
    expect(heightAt(2, 3)).toBe(before);
  });
  it('rejects invalid layer/feature dimensions', () => {
    expect(() => createHeightAt(0, { ...shape, layers: [{ wavelength: 0, amplitude: 1 }] })).toThrow(RangeError);
    expect(() => createHeightAt(0, { ...shape, features: [{ x: 0, z: 0, radius: 0, height: 1 }] })).toThrow(RangeError);
  });
});
