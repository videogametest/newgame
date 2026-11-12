// Star quads for the valley sky: every star is a valid triangle pair on the sky dome.
import { describe, expect, it } from 'vitest';
import { starQuads } from './valley_sky';

describe('star quads', () => {
  const count = 420;
  const { positions, indices } = starQuads(count);

  it('has four vertices and two triangles per star', () => {
    expect(positions.length).toBe(count * 4 * 3);
    expect(indices.length).toBe(count * 6);
  });

  it('every index points at a vertex of its own star', () => {
    const vertexCount = positions.length / 3;
    for (let i = 0; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThanOrEqual(0);
      expect(indices[i]).toBeLessThan(vertexCount);
    }
    for (let s = 0; s < count; s++) {
      const slice = indices.slice(s * 6, s * 6 + 6);
      const lo = Math.min(...slice);
      expect(Math.max(...slice) - lo).toBeLessThanOrEqual(3);
    }
  });

  it('every star sits above the horizon and on the sky dome', () => {
    for (let s = 0; s < count; s++) {
      for (let c = 0; c < 4; c++) {
        const k = (s * 4 + c) * 3;
        const x = positions[k];
        const y = positions[k + 1];
        const z = positions[k + 2];
        expect(Math.hypot(x, y, z)).toBeGreaterThan(600);
        expect(Math.hypot(x, y, z)).toBeLessThan(720);
        expect(y).toBeGreaterThan(0);
      }
    }
  });
});
