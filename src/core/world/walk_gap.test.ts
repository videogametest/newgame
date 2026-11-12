import { describe, expect, it } from 'vitest';
import { longestStopGap } from './walk_gap';

const open = () => true;
/** A grid of walkable cells with a solid wall at x in [wallMin, wallMax] for z in [-halfZ, halfZ]. */
function wallWorld(wallX: number, halfZ: number) {
  return (x: number, z: number) => !(Math.abs(x - wallX) < 0.5 && Math.abs(z) <= halfZ);
}

describe('longestStopGap', () => {
  it('measures the straight-line gap on open ground', () => {
    // One stop at the origin on a 100 m square. The farthest cell is a corner at (50,50): a pure diagonal walk, 50*sqrt(2) m.
    const r = longestStopGap({
      cell: 1, halfExtent: 50, walkable: open, stops: [{ x: 0, z: 0 }], start: { x: 0, z: 0 },
    });
    expect(r.stranded).toBe(0);
    expect(r.longest).toBeGreaterThan(70.5);
    expect(r.longest).toBeLessThan(71.5);
    expect(Math.hypot(r.at!.x, r.at!.z)).toBeGreaterThan(70);
  });

  it('takes the walk around a blocked path, not the straight line', () => {
    // A wall at x=0 from z=-40 to 40 on a 100 m square. Stop at (-20,0); the cell at (20,0) lies behind the wall,
    // and the only way round is the gap past z=±40, so the walk is longer than the 40 m straight line.
    const walkable = wallWorld(0, 40);
    const straight = longestStopGap({
      cell: 1, halfExtent: 50, walkable: open, stops: [{ x: -20, z: 0 }], start: { x: 0, z: 0 },
    });
    const walled = longestStopGap({
      cell: 1, halfExtent: 50, walkable, stops: [{ x: -20, z: 0 }], start: { x: 20, z: 0 },
    });
    expect(walled.stranded).toBe(0);
    expect(walled.longest).toBeGreaterThan(straight.longest);
    // The walk from (20,0) to (-20,0) must go over z=±41: about 2*sqrt(20²+41²) ≈ 91 m, not 40 m.
    expect(walled.longest).toBeGreaterThan(80);
  });

  it('reports reachable cells that cannot walk to any stop', () => {
    // Two walkable islands: the stop is on the west, the start on the east. Nothing connects them.
    const islands = (x: number) => x <= 0 || x >= 20;
    const r = longestStopGap({
      cell: 1, halfExtent: 25, walkable: (x) => islands(x), stops: [{ x: -10, z: 0 }], start: { x: 22, z: 0 },
    });
    expect(r.reachableCells).toBeGreaterThan(0);
    expect(r.stranded).toBe(r.reachableCells);
  });

  it('does not cut blocked corners diagonally', () => {
    // Only (0,0) and (1,1) are walkable. They touch at a corner, so no step connects them.
    // Stop at (1,1), start at (0,0): the start cell is reachable but cannot walk to the stop.
    const pair = (x: number, z: number) => (x === 0 && z === 0) || (x === 1 && z === 1);
    const r = longestStopGap({
      cell: 1, halfExtent: 1, walkable: pair, stops: [{ x: 1, z: 1 }], start: { x: 0, z: 0 },
    });
    expect(r.reachableCells).toBe(1);
    expect(r.stranded).toBe(1);
  });

  it('rejects a non-positive cell size', () => {
    expect(() => longestStopGap({ cell: 0, halfExtent: 10, walkable: open, stops: [], start: { x: 0, z: 0 } })).toThrow(RangeError);
  });
});
