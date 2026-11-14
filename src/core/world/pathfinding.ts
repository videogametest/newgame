import type { Vec2 } from '../types';

/** Integer grid coordinates, not world metres. Obstacles include scenery and steep terrain. */
export interface WalkableGrid {
  width: number;
  depth: number;
  isBlocked: (x: number, z: number) => boolean;
}

/**
 * A grid prepared once for many searches: `blocked[z * width + x]` is 1 where a cell is an obstacle.
 * Building it calls the (possibly expensive) walk rule once per cell; searching never does.
 */
export interface WalkableCells {
  width: number;
  depth: number;
  blocked: Uint8Array;
}

const NO_CELL = -1;
const UNREACHED = 0x3fffffff;
/** Four cardinal steps, in the fixed order the tie-breaker depends on: +x, +z, -x, -z. */
const DX = [1, 0, -1, 0];
const DZ = [0, 1, 0, -1];

/** Evaluate the walk rule for every cell of `grid` once. Call from outside any search loop. */
export function buildWalkableCells(grid: WalkableGrid): WalkableCells {
  assertDimensions(grid.width, grid.depth);
  const blocked = new Uint8Array(grid.width * grid.depth);
  for (let z = 0; z < grid.depth; z++) {
    for (let x = 0; x < grid.width; x++) {
      blocked[z * grid.width + x] = grid.isBlocked(x, z) ? 1 : 0;
    }
  }
  return { width: grid.width, depth: grid.depth, blocked };
}

/**
 * Deterministic four-neighbour A* on prepared cells: the shortest cardinal path including endpoints.
 * No diagonal corner cutting. null means unreachable or invalid endpoints, never a partial path.
 * The search runs on typed arrays only: no callbacks, no allocation per step.
 * Ties on score go to the node opened first, so the same inputs always give the same path.
 */
export function findPathCells(cells: WalkableCells, start: Vec2, goal: Vec2): Vec2[] | null {
  const { width, depth, blocked } = cells;
  assertDimensions(width, depth);
  if (!inside(width, depth, start) || !inside(width, depth, goal)) return null;
  const n = width * depth;
  const startId = start.z * width + start.x;
  const goalId = goal.z * width + goal.x;
  if (blocked[startId] || blocked[goalId]) return null;

  const cost = new Int32Array(n).fill(UNREACHED);
  const cameFrom = new Int32Array(n).fill(NO_CELL);
  const seqOf = new Int32Array(n).fill(NO_CELL);
  const cellOfSeq = new Int32Array(n);
  const closed = new Uint8Array(n);
  // Each cell is closed once and pushes at most four entries, so 4n + 1 slots is enough.
  const heap = new Float64Array(4 * n + 1);
  let heapSize = 0;
  let nextSeq = 0;

  // Heap key = score * n + seq. Seq is unique per cell and below n, so this orders by (score, seq).
  const heuristic = (x: number, z: number) => Math.abs(goal.x - x) + Math.abs(goal.z - z);
  const push = (key: number) => {
    let i = heapSize++;
    heap[i] = key;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent] <= heap[i]) break;
      const t = heap[parent];
      heap[parent] = heap[i];
      heap[i] = t;
      i = parent;
    }
  };
  const pop = (): number => {
    const top = heap[0];
    heapSize--;
    if (heapSize > 0) {
      heap[0] = heap[heapSize];
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heapSize && heap[l] < heap[m]) m = l;
        if (r < heapSize && heap[r] < heap[m]) m = r;
        if (m === i) break;
        const t = heap[m];
        heap[m] = heap[i];
        heap[i] = t;
        i = m;
      }
    }
    return top;
  };

  cost[startId] = 0;
  seqOf[startId] = nextSeq;
  cellOfSeq[nextSeq] = startId;
  nextSeq++;
  push(heuristic(start.x, start.z) * n + seqOf[startId]);

  while (heapSize > 0) {
    const key = pop();
    const seq = key % n;
    const score = (key - seq) / n;
    const node = cellOfSeq[seq];
    if (closed[node]) continue;
    const x = node % width;
    const z = (node - x) / width;
    // A stale entry carries a larger score than the cell's current best; the best one pops first.
    if (score - heuristic(x, z) !== cost[node]) continue;
    if (node === goalId) return reconstruct(cameFrom, node, width);
    closed[node] = 1;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const nz = z + DZ[d];
      if (nx < 0 || nz < 0 || nx >= width || nz >= depth) continue;
      const id = nz * width + nx;
      if (closed[id] || blocked[id]) continue;
      const nextCost = cost[node] + 1;
      if (nextCost >= cost[id]) continue;
      cost[id] = nextCost;
      cameFrom[id] = node;
      if (seqOf[id] === NO_CELL) {
        seqOf[id] = nextSeq;
        cellOfSeq[nextSeq] = id;
        nextSeq++;
      }
      push((nextCost + heuristic(nx, nz)) * n + seqOf[id]);
    }
  }
  return null;
}

/** Same search on a `WalkableGrid`: prepares the cells once, then searches. For repeated queries use `buildWalkableCells` once. */
export function findPath(grid: WalkableGrid, start: Vec2, goal: Vec2): Vec2[] | null {
  assertDimensions(grid.width, grid.depth);
  return findPathCells(buildWalkableCells(grid), start, goal);
}

function reconstruct(cameFrom: Int32Array, goalId: number, width: number): Vec2[] {
  const path: Vec2[] = [];
  let id = goalId;
  while (id !== NO_CELL) {
    const x = id % width;
    path.push({ x, z: (id - x) / width });
    id = cameFrom[id];
  }
  return path.reverse();
}

function inside(width: number, depth: number, p: Vec2): boolean {
  return Number.isInteger(p.x) && Number.isInteger(p.z) && p.x >= 0 && p.z >= 0 && p.x < width && p.z < depth;
}

function assertDimensions(width: number, depth: number): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(depth) || width <= 0 || depth <= 0) {
    throw new RangeError('Grid dimensions must be positive integers');
  }
}
