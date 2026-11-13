import { describe, expect, it } from 'vitest';
import { FAR_LAND, farLandData } from './valley_far';
import { VALLEY_HALF_EXTENT, valleyHeightAt } from '../core/world/valley';

describe('the far land: the whole valley is always drawn', () => {
  const d = farLandData();
  it('covers the valley from edge to edge in one mesh of modest size', () => {
    const xs = d.positions.filter((_, i) => i % 3 === 0);
    expect(Math.min(...xs)).toBe(-VALLEY_HALF_EXTENT);
    expect(Math.max(...xs)).toBe(VALLEY_HALF_EXTENT);
    expect(d.indices.length / 3).toBeLessThanOrEqual(25_000);
  });
  it('sits just under the true ground everywhere it samples, so the fine land always covers it', () => {
    for (let k = 0; k < d.positions.length; k += 3 * 97) {
      const [x, y, z] = [d.positions[k], d.positions[k + 1], d.positions[k + 2]];
      expect(valleyHeightAt(x, z) - y).toBeCloseTo(FAR_LAND.drop, 6);
    }
  });
});
