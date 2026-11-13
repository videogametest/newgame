// Overnight item 6: Wick's houses and the well are solid, and every lane through the village can still be walked.
import { describe, expect, it } from 'vitest';
import { WICK_LANES, WICK_THINGS, wickHouses } from '../../village/plan';
import { findPath, type WalkableGrid } from './pathfinding';
import { insideFootprint } from './solids';
import { blocksHero, isWalkableGround, VALLEY_SEED, VALLEY_SOLIDS } from './valley';

const houses = wickHouses(VALLEY_SEED);
const footprintOf = (h: { x: number; z: number; facing: number }) => ({ x: h.x, z: h.z, facing: h.facing, half: 4.5 });

/** Points inside a footprint on a 0.5 m lattice, centres of the sub-cells. */
function pointsIn(f: { x: number; z: number; facing: number; half: number }, step = 0.5): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const span = f.half + 1;
  for (let x = f.x - span; x <= f.x + span; x += step) {
    for (let z = f.z - span; z <= f.z + span; z += step) {
      if (insideFootprint(f, x, z)) out.push([x, z]);
    }
  }
  return out;
}

describe('Wick is solid', () => {
  it('every house is 9 m square and every point inside it blocks the hero', () => {
    expect(houses.length).toBeGreaterThan(0);
    for (const h of houses) {
      const pts = pointsIn(footprintOf(h));
      expect(pts.length, `house ${h.id} has points`).toBeGreaterThan(0);
      for (const [x, z] of pts) {
        expect(blocksHero(x, z), `house ${h.id} at (${x}, ${z})`).toBe(true);
        expect(isWalkableGround(x, z), `house ${h.id} at (${x}, ${z})`).toBe(false);
      }
    }
  });

  it('no walkable lattice cell lies inside any house', () => {
    for (const h of houses) {
      for (const [x, z] of pointsIn(footprintOf(h), 1)) {
        expect(isWalkableGround(x, z), `walkable inside ${h.id} at (${x}, ${z})`).toBe(false);
      }
    }
  });

  it('the well blocks the hero', () => {
    const well = WICK_THINGS.find((t) => t.id === 'well');
    expect(well).toBeDefined();
    expect(VALLEY_SOLIDS.length).toBe(houses.length + 1);
    expect(blocksHero(well!.x, well!.z)).toBe(true);
  });
});

/** Walkable lattice over an integer box, one metre per cell, as the hero's walk rule sees it. */
function latticeFor(points: ReadonlyArray<{ x: number; z: number }>, margin = 12): { grid: WalkableGrid; toCell: (p: { x: number; z: number }) => { x: number; z: number } } {
  const minX = Math.floor(Math.min(...points.map((p) => p.x))) - margin;
  const maxX = Math.ceil(Math.max(...points.map((p) => p.x))) + margin;
  const minZ = Math.floor(Math.min(...points.map((p) => p.z))) - margin;
  const maxZ = Math.ceil(Math.max(...points.map((p) => p.z))) + margin;
  const width = maxX - minX + 1;
  const depth = maxZ - minZ + 1;
  const grid: WalkableGrid = {
    width,
    depth,
    isBlocked: (i, j) => !isWalkableGround(minX + i, minZ + j),
  };
  return { grid, toCell: (p) => ({ x: Math.round(p.x) - minX, z: Math.round(p.z) - minZ }) };
}

describe('every Wick lane can still be walked end to end', () => {
  for (const [name, pts] of Object.entries(WICK_LANES)) {
    it(`lane ${name}`, () => {
      const lane = pts.map(([x, z]) => ({ x, z }));
      const { grid, toCell } = latticeFor(lane);
      const from = toCell(lane[0]);
      const to = toCell(lane[lane.length - 1]);
      const path = findPath(grid, from, to);
      expect(path, `lane ${name} from (${lane[0].x}, ${lane[0].z}) to (${lane[lane.length - 1].x}, ${lane[lane.length - 1].z})`).not.toBeNull();
      // A detour round a house or the well is allowed, but not a long one: at most 1.5 times the lane's length plus 12 m.
      let laneLen = 0;
      for (let i = 1; i < lane.length; i++) laneLen += Math.hypot(lane[i].x - lane[i - 1].x, lane[i].z - lane[i - 1].z);
      expect((path!.length - 1), `lane ${name} path length`).toBeLessThanOrEqual(laneLen * 1.5 + 12);
    });
  }
});
