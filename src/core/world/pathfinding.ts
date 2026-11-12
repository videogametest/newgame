import type { Vec2 } from '../types';

/** Integer grid coordinates, not world metres. Obstacles include scenery and steep terrain. */
export interface WalkableGrid {
  width: number;
  depth: number;
  isBlocked: (x: number, z: number) => boolean;
}

/** Deterministic four-neighbour A*: shortest cardinal path including endpoints.
 * No diagonal corner cutting. null means unreachable/invalid endpoints, never a partial path.
 * Grid is finite and supplied from nearby chunks; callers decide when to retry/repath.
 */
export function findPath(grid: WalkableGrid, start: Vec2, goal: Vec2): Vec2[] | null {
  if (!Number.isSafeInteger(grid.width) || !Number.isSafeInteger(grid.depth) || grid.width <= 0 || grid.depth <= 0) {
    throw new RangeError('Grid dimensions must be positive integers');
  }
  const valid = (p: Vec2) => Number.isInteger(p.x) && Number.isInteger(p.z)
    && p.x >= 0 && p.z >= 0 && p.x < grid.width && p.z < grid.depth;
  if (!valid(start) || !valid(goal) || grid.isBlocked(start.x, start.z) || grid.isBlocked(goal.x, goal.z)) return null;
  const key = (p: Vec2) => p.z * grid.width + p.x;
  const heuristic = (p: Vec2) => Math.abs(goal.x - p.x) + Math.abs(goal.z - p.z);
  const startKey = key(start);
  const goalKey = key(goal);
  const open = new Map<number, Vec2>([[startKey, { ...start }]]);
  const cost = new Map<number, number>([[startKey, 0]]);
  const cameFrom = new Map<number, number>();
  const closed = new Set<number>();
  // Fixed ordering is the tie-breaker; no RNG required.
  const directions = [{ x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }, { x: 0, z: -1 }];
  while (open.size) {
    let bestKey = startKey;
    let bestScore = Infinity;
    for (const [id, p] of open) {
      const score = cost.get(id)! + heuristic(p);
      if (score < bestScore) { bestScore = score; bestKey = id; }
    }
    const current = open.get(bestKey)!;
    if (bestKey === goalKey) {
      const path: Vec2[] = [];
      let id: number | undefined = goalKey;
      while (id !== undefined) {
        path.push({ x: id % grid.width, z: Math.floor(id / grid.width) });
        id = cameFrom.get(id);
      }
      return path.reverse();
    }
    open.delete(bestKey);
    closed.add(bestKey);
    for (const dir of directions) {
      const next = { x: current.x + dir.x, z: current.z + dir.z };
      if (!valid(next)) continue;
      const id = key(next);
      if (closed.has(id) || grid.isBlocked(next.x, next.z)) continue;
      const nextCost = cost.get(bestKey)! + 1;
      if (nextCost >= (cost.get(id) ?? Infinity)) continue;
      cost.set(id, nextCost);
      cameFrom.set(id, bestKey);
      open.set(id, next);
    }
  }
  return null;
}
