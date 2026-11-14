// The typed-array search must return exactly the path the original heap-and-Map search returned.
// `referenceFindPath` below is that original implementation, kept verbatim as the oracle.
import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../types';
import { buildWalkableCells, findPath, findPathCells, type WalkableGrid } from './pathfinding';

interface OpenEntry { score: number; seq: number; id: number; cost: number }

class OpenHeap {
  private items: OpenEntry[] = [];
  get size(): number { return this.items.length; }
  push(e: OpenEntry): void {
    const a = this.items;
    a.push(e);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!before(a[i], a[parent])) break;
      [a[i], a[parent]] = [a[parent], a[i]];
      i = parent;
    }
  }
  pop(): OpenEntry | undefined {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length && last) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && before(a[l], a[m])) m = l;
        if (r < a.length && before(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function before(x: OpenEntry, y: OpenEntry): boolean {
  return x.score !== y.score ? x.score < y.score : x.seq < y.seq;
}

function referenceFindPath(grid: WalkableGrid, start: Vec2, goal: Vec2): Vec2[] | null {
  if (!Number.isSafeInteger(grid.width) || !Number.isSafeInteger(grid.depth) || grid.width <= 0 || grid.depth <= 0) {
    throw new RangeError('Grid dimensions must be positive integers');
  }
  const valid = (p: Vec2) => Number.isInteger(p.x) && Number.isInteger(p.z)
    && p.x >= 0 && p.z >= 0 && p.x < grid.width && p.z < grid.depth;
  if (!valid(start) || !valid(goal) || grid.isBlocked(start.x, start.z) || grid.isBlocked(goal.x, goal.z)) return null;
  const key = (p: Vec2) => p.z * grid.width + p.x;
  const heuristic = (x: number, z: number) => Math.abs(goal.x - x) + Math.abs(goal.z - z);
  const startKey = key(start);
  const goalKey = key(goal);
  const heap = new OpenHeap();
  const cost = new Map<number, number>([[startKey, 0]]);
  const seqOf = new Map<number, number>([[startKey, 0]]);
  let nextSeq = 1;
  const cameFrom = new Map<number, number>();
  const closed = new Set<number>();
  const directions = [{ x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }, { x: 0, z: -1 }];
  heap.push({ score: heuristic(start.x, start.z), seq: 0, id: startKey, cost: 0 });
  while (heap.size) {
    const entry = heap.pop()!;
    const bestKey = entry.id;
    if (closed.has(bestKey) || cost.get(bestKey) !== entry.cost) continue;
    if (bestKey === goalKey) {
      const path: Vec2[] = [];
      let id: number | undefined = goalKey;
      while (id !== undefined) {
        path.push({ x: id % grid.width, z: Math.floor(id / grid.width) });
        id = cameFrom.get(id);
      }
      return path.reverse();
    }
    closed.add(bestKey);
    const cx = bestKey % grid.width;
    const cz = Math.floor(bestKey / grid.width);
    for (const dir of directions) {
      const next = { x: cx + dir.x, z: cz + dir.z };
      if (!valid(next)) continue;
      const id = key(next);
      if (closed.has(id) || grid.isBlocked(next.x, next.z)) continue;
      const nextCost = entry.cost + 1;
      if (nextCost >= (cost.get(id) ?? Infinity)) continue;
      cost.set(id, nextCost);
      cameFrom.set(id, bestKey);
      if (!seqOf.has(id)) seqOf.set(id, nextSeq++);
      heap.push({ score: nextCost + heuristic(next.x, next.z), seq: seqOf.get(id)!, id, cost: nextCost });
    }
  }
  return null;
}

/** Seeded PRNG so a failure reproduces. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('typed-array search matches the reference search exactly', () => {
  it('gives the same path, or the same null, on random grids and random endpoints', () => {
    const rand = rng(20261114);
    let compared = 0;
    let found = 0;
    for (let trial = 0; trial < 300; trial++) {
      const width = 2 + Math.floor(rand() * 40);
      const depth = 2 + Math.floor(rand() * 40);
      const density = rand() * 0.45;
      const blockedSet = new Set<number>();
      for (let i = 0; i < width * depth; i++) if (rand() < density) blockedSet.add(i);
      const grid: WalkableGrid = { width, depth, isBlocked: (x, z) => blockedSet.has(z * width + x) };
      for (let q = 0; q < 8; q++) {
        const start = { x: Math.floor(rand() * width), z: Math.floor(rand() * depth) };
        const goal = { x: Math.floor(rand() * width), z: Math.floor(rand() * depth) };
        const expected = referenceFindPath(grid, start, goal);
        expect(findPath(grid, start, goal), `trial ${trial} query ${q}`).toEqual(expected);
        compared++;
        if (expected) found++;
      }
    }
    // The comparison must cover real routes, not only nulls.
    expect(found).toBeGreaterThan(300);
    expect(compared).toBe(2400);
  });

  it('gives the reference route for the rejected and trivial endpoint cases', () => {
    const grid: WalkableGrid = { width: 5, depth: 3, isBlocked: (x, z) => x === 2 && z === 1 };
    const cases: [Vec2, Vec2][] = [
      [{ x: 0, z: 0 }, { x: 0, z: 0 }],
      [{ x: 2, z: 1 }, { x: 4, z: 1 }],
      [{ x: 0, z: 1 }, { x: 2, z: 1 }],
      [{ x: -1, z: 0 }, { x: 4, z: 2 }],
      [{ x: 0, z: 0 }, { x: 4.5, z: 2 }],
    ];
    for (const [s, g] of cases) {
      expect(findPath(grid, s, g)).toEqual(referenceFindPath(grid, s, g));
    }
  });

  it('reads the walk rule once per cell when preparing, and never during a search', () => {
    let calls = 0;
    const grid: WalkableGrid = { width: 30, depth: 30, isBlocked: (x, z) => { calls++; return (x * 7 + z * 3) % 11 === 0; } };
    const cells = buildWalkableCells(grid);
    expect(calls).toBe(900);
    const before = calls;
    for (let q = 0; q < 20; q++) findPathCells(cells, { x: 0, z: q }, { x: 29, z: 29 - q });
    expect(calls, 'the search must not call the walk rule').toBe(before);
  });
});
