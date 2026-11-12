import { describe, expect, it } from 'vitest';
import { chunkAt, chunkBounds, chunkKey, chunksWithinRadius, diffChunks } from './chunks';

describe('chunk bookkeeping (§7)', () => {
  it('floors positive and negative world positions into distinct keys', () => {
    expect(chunkKey(chunkAt({ x: -0.1, z: 10 }, 10))).toBe('-1,1');
    expect(chunkKey(chunkAt({ x: -10, z: 9.99 }, 10))).toBe('-1,0');
    expect(chunkKey(chunkAt({ x: 0, z: 0 }, 10))).toBe('0,0');
  });
  it('returns shared half-open bounds with no gaps', () => {
    expect(chunkBounds({ x: -1, z: 2 }, 10)).toEqual({ minX: -10, maxX: 0, minZ: 20, maxZ: 30 });
    expect(chunkBounds({ x: 0, z: 2 }, 10).minX).toBe(chunkBounds({ x: -1, z: 2 }, 10).maxX);
  });
  it('radius zero asks only for the containing chunk', () => {
    expect(chunksWithinRadius({ x: 0, z: 0 }, 0, 10)).toEqual([{ x: 0, z: 0 }]);
  });
  it('covers intersections not just centres, and excludes distant corners', () => {
    const keys = chunksWithinRadius({ x: 5, z: 5 }, 6, 10).map(chunkKey);
    expect(keys.sort()).toEqual(['-1,0', '0,-1', '0,0', '0,1', '1,0'].sort());
  });
  it('includes exact tangencies and all four quadrants at a boundary', () => {
    expect(chunksWithinRadius({ x: 5, z: 5 }, 5, 10)).toHaveLength(5);
    const keys = chunksWithinRadius({ x: 0, z: 0 }, 1, 10).map(chunkKey);
    expect(keys.sort()).toEqual(['-1,-1', '-1,0', '0,-1', '0,0']);
  });
  it('computes disjoint load/unload sets without mutating inputs', () => {
    const loaded = new Set(['0,0', '-1,0']);
    const wanted = [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 1, z: 0 }];
    expect(diffChunks(loaded, wanted)).toEqual({ load: ['1,0'], unload: ['-1,0'] });
    expect([...loaded]).toEqual(['0,0', '-1,0']);
    expect(diffChunks(new Set(['0,0']), [{ x: 0, z: 0 }])).toEqual({ load: [], unload: [] });
  });
  it('rejects invalid sizes and radii', () => {
    expect(() => chunkAt({ x: 0, z: 0 }, 0)).toThrow(RangeError);
    expect(() => chunksWithinRadius({ x: 0, z: 0 }, -1, 10)).toThrow(RangeError);
  });
});
