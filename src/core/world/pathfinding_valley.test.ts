// Task 004 step 1: A* over the valley's real walk rules. Water is only ever crossed at a crossing.
import { describe, expect, it } from 'vitest';
import { buildWalkableCells, findPath, findPathCells, type WalkableGrid } from './pathfinding';
import { isCrossing, isWalkableGround, isWater } from './valley';

type Cell = { x: number; z: number };

/**
 * The valley's walk rule on a lattice of `cell` metres over the world box [x0, x1] x [z0, z1].
 * `extraBlocked` closes more ground (for example every crossing, to test a river with no way over).
 */
function valleyLattice(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  cell = 0.5,
  extraBlocked: (x: number, z: number) => boolean = () => false,
) {
  const width = Math.round((x1 - x0) / cell) + 1;
  const depth = Math.round((z1 - z0) / cell) + 1;
  const worldAt = (i: number, j: number) => ({ x: x0 + i * cell, z: z0 + j * cell });
  const grid: WalkableGrid = {
    width,
    depth,
    isBlocked: (i, j) => {
      const p = worldAt(i, j);
      return !isWalkableGround(p.x, p.z) || extraBlocked(p.x, p.z);
    },
  };
  const cellOf = (x: number, z: number): Cell => ({ x: Math.round((x - x0) / cell), z: Math.round((z - z0) / cell) });
  return { grid, worldAt, cellOf };
}

/** The world points of a path that lie on water. */
function wetPoints(path: Cell[], worldAt: (i: number, j: number) => { x: number; z: number }) {
  return path.map((c) => worldAt(c.x, c.z)).filter((p) => isWater(p.x, p.z));
}

function expectWetOnlyAtCrossings(path: Cell[], worldAt: (i: number, j: number) => { x: number; z: number }) {
  for (const p of wetPoints(path, worldAt)) {
    expect(isCrossing(p.x, p.z), `water at (${p.x}, ${p.z}) outside a crossing`).toBe(true);
  }
}

describe('valley paths cross water only at a crossing', () => {
  it('wades the ford, the only way over that stretch', () => {
    const { grid, worldAt, cellOf } = valleyLattice(120, -40, 165, 15);
    const path = findPath(grid, cellOf(142, -30), cellOf(142, 5));
    expect(path, 'ford: north bank to south bank').not.toBeNull();
    expect(wetPoints(path!, worldAt).length, 'the route wades the river').toBeGreaterThan(0);
    expectWetOnlyAtCrossings(path!, worldAt);
  });

  it('has no route across the river when every crossing is closed', () => {
    const open = valleyLattice(120, -40, 165, 15);
    expect(findPath(open.grid, open.cellOf(130, -30), open.cellOf(130, 5)), 'x=130 bank to bank, via the ford').not.toBeNull();

    const closed = valleyLattice(120, -40, 165, 15, 0.5, (x, z) => isCrossing(x, z));
    const noFord = findPath(closed.grid, closed.cellOf(130, -30), closed.cellOf(130, 5));
    expect(noFord, 'with every crossing closed, no route over the river').toBeNull();
  });

  it('crosses the mill bridge', () => {
    const { grid, worldAt, cellOf } = valleyLattice(-210, 8, -170, 52);
    const path = findPath(grid, cellOf(-191, 20), cellOf(-191, 50));
    expect(path, 'mill: south of the river to north of it').not.toBeNull();
    expect(wetPoints(path!, worldAt).length, 'the route crosses under the bridge line').toBeGreaterThan(0);
    expectWetOnlyAtCrossings(path!, worldAt);
  });

  it('crosses the stepping stones at 0.5 m, where the stones join', () => {
    // At 1 m the stones do not join diagonally (11 of 29 stone cells reachable), so the valley planner uses 0.5 m.
    const { grid, worldAt, cellOf } = valleyLattice(-275, -18, -228, 18, 0.5);
    const path = findPath(grid, cellOf(-270, 0), cellOf(-234, 0));
    expect(path, 'stones: west bank to east bank').not.toBeNull();
    // A straight walk is 36 m (72 cells); the stones should not force a long detour.
    expect(path!.length - 1, 'stones path length (cells of 0.5 m)').toBeLessThanOrEqual(2 * 36 * 1.5 + 24);
    expectWetOnlyAtCrossings(path!, worldAt);
  });
});

describe('valley path time budget (0.5 m cells, search only)', () => {
  // The grid is prepared once outside the timed call, as the valley planner will do per region.
  // Each target is the fastest of five runs, so one slow run on a busy machine does not fail it.
  function timedSearch(grid: WalkableGrid, from: Cell, to: Cell) {
    const cells = buildWalkableCells(grid);
    let best = Infinity;
    let path: Cell[] | null = null;
    for (let run = 0; run < 5; run++) {
      const start = performance.now();
      path = findPathCells(cells, from, to);
      best = Math.min(best, performance.now() - start);
    }
    return { path, ms: best };
  }

  it('a route 200 m long is found in under 50 ms', () => {
    // Straight north along the x=100 line from z=-100 to z=100, inside a 80 m by 240 m lattice.
    const { grid, cellOf } = valleyLattice(60, -120, 140, 120, 0.5);
    const { path, ms } = timedSearch(grid, cellOf(100, -100), cellOf(100, 100));
    expect(path, 'a 200 m route exists').not.toBeNull();
    expect(ms, `200 m route took ${ms.toFixed(2)} ms`).toBeLessThan(50);
  });

  it('a route 70 m long is found in under 10 ms', () => {
    // West along the z=120 line from x=-40 to x=-110, inside a 100 m by 40 m lattice.
    const { grid, cellOf } = valleyLattice(-130, 100, -30, 140, 0.5);
    const { path, ms } = timedSearch(grid, cellOf(-40, 120), cellOf(-110, 120));
    expect(path, 'a 70 m route exists').not.toBeNull();
    expect(ms, `70 m route took ${ms.toFixed(2)} ms`).toBeLessThan(10);
  });
});
