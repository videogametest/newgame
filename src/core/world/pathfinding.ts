import type { Vec2 } from '../types';

/** Integer grid coordinates, not world metres. Obstacles include scenery and steep terrain. */
export interface WalkableGrid {
  width: number;
  depth: number;
  isBlocked: (x: number, z: number) => boolean;
}

/** One open-set entry. Stale entries (an older, larger cost) are skipped when popped. */
interface OpenEntry { score: number; seq: number; id: number; cost: number }

/** Min-heap on (score, seq): the lowest score wins, and among equal scores the node opened first. */
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

/** Deterministic four-neighbour A*: shortest cardinal path including endpoints.
 * No diagonal corner cutting. null means unreachable/invalid endpoints, never a partial path.
 * Grid is finite and supplied from nearby chunks; callers decide when to retry/repath.
 * The open set is a binary heap, so a long route costs about n log n, not n per step.
 */
export function findPath(grid: WalkableGrid, start: Vec2, goal: Vec2): Vec2[] | null {
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
  // Fixed ordering is the tie-breaker; no RNG required.
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
