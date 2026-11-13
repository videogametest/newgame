import { describe, expect, it } from 'vitest';
import { waterSheet } from './valley_water';
import { valleyHeightAt, WATER_LEVEL } from '../core/world/valley';

describe('the water sheet', () => {
  const d = waterSheet();
  it('lies at the water level and carries the depth of the bed under it', () => {
    for (let k = 0; k < d.depth.length; k += 211) {
      const [x, y, z] = [d.positions[k * 3], d.positions[k * 3 + 1], d.positions[k * 3 + 2]];
      expect(y).toBe(WATER_LEVEL);
      expect(d.depth[k]).toBeCloseTo(Math.max(0, WATER_LEVEL - valleyHeightAt(x, z)), 6);
    }
  });
  it('is drawn only where there is water: the middle of the lake is covered and dry hills are not', () => {
    const covered = new Set<number>(d.indices);
    const at = (x: number, z: number) => { const half = (d.side - 1) * 2; return Math.round((z + half) / 4) * d.side + Math.round((x + half) / 4); };
    expect(covered.has(at(0, 0))).toBe(true);
    expect(covered.has(at(-76, -296))).toBe(false);
    expect(d.indices.length / 3).toBeLessThan(60_000);
  });
});
