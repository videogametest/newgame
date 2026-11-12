import { describe, expect, it } from 'vitest';
import { findPath, type WalkableGrid } from './pathfinding';

const start = { x: 0, z: 1 };
const goal = { x: 4, z: 1 };
const grid: WalkableGrid = { width: 5, depth: 3, isBlocked: () => false };
describe('grid A* (§7)', () => {
  it('finds the shortest unobstructed path including endpoints', () => {
    expect(findPath(grid, start, goal)).toEqual([
      start, { x: 1, z: 1 }, { x: 2, z: 1 }, { x: 3, z: 1 }, goal,
    ]);
  });
  it('routes around an obstacle blocking the straight line', () => {
    const obstructed = { ...grid, isBlocked: (x: number, z: number) => x === 2 && z === 1 };
    const path = findPath(obstructed, start, goal)!;
    expect(path).toHaveLength(7);
    expect(path[0]).toEqual(start);
    expect(path.at(-1)).toEqual(goal);
    for (let i = 0; i < path.length; i++) {
      expect(obstructed.isBlocked(path[i].x, path[i].z)).toBe(false);
      if (i) expect(Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].z - path[i - 1].z)).toBe(1);
    }
    expect(findPath(obstructed, start, goal)).toEqual(path);
  });
  it('returns null for a fully blocked route instead of an incomplete path', () => {
    expect(findPath({ ...grid, isBlocked: x => x === 2 }, start, goal)).toBeNull();
  });
  it('never cuts diagonally through blocked corners', () => {
    expect(findPath({ width: 2, depth: 2, isBlocked: (x, z) => x !== z }, { x: 0, z: 0 }, { x: 1, z: 1 })).toBeNull();
  });
  it('returns the single start when already at the goal', () => {
    expect(findPath(grid, start, start)).toEqual([start]);
  });
  it('rejects blocked, outside and fractional endpoints', () => {
    expect(findPath({ ...grid, isBlocked: () => true }, start, start)).toBeNull();
    expect(findPath(grid, { x: -1, z: 0 }, goal)).toBeNull();
    expect(findPath(grid, start, { x: 5, z: 1 })).toBeNull();
    expect(findPath(grid, start, { x: 1.5, z: 1 })).toBeNull();
  });
  it('accepts obstacle data for steep terrain as well as scenery', () => {
    const heights = [0, 0, 50, 0, 0];
    expect(findPath({ ...grid, isBlocked: x => heights[x] > 10 }, start, goal)).toBeNull();
    expect(() => findPath({ ...grid, width: 0 }, start, goal)).toThrow(RangeError);
  });
});
