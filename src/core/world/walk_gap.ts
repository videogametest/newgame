// Walking distance from every walkable point to the nearest point worth stopping for (GAME_DESIGN §4,
// review 015). Pure: no Babylon imports. Uses a grid so the answer is walking distance around water
// and steep ground, not a straight line.

import type { GroundPoint } from './walk';

export interface GapInput {
  /** Grid cell size (m). */
  cell: number;
  /** The grid covers [-halfExtent, halfExtent] on both axes. */
  halfExtent: number;
  /** True where a hero may stand, at the cell centre. */
  walkable: (x: number, z: number) => boolean;
  /** Points worth stopping for. Each snaps to its nearest walkable cell. */
  stops: readonly GroundPoint[];
  /** The hero's start. Only cells reachable from here are measured. */
  start: GroundPoint;
}

export interface GapReport {
  /** Longest walking distance (m) from a reachable cell to its nearest stop. */
  longest: number;
  /** Centre of the cell where that longest distance is measured. */
  at: GroundPoint | null;
  /** Reachable walkable cells measured. */
  reachableCells: number;
  /** Reachable cells from which no stop can be walked to. */
  stranded: number;
}

const SQRT2 = Math.SQRT2;
const NEIGHBOURS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2],
];

/** Minimal binary heap of [priority, index] pairs. */
class Heap {
  private readonly keys: number[] = [];
  private readonly vals: number[] = [];
  get size(): number { return this.keys.length; }
  push(key: number, val: number): void {
    this.keys.push(key); this.vals.push(val);
    let i = this.keys.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      this.swap(i, p); i = p;
    }
  }
  pop(): [number, number] {
    const key = this.keys[0];
    const val = this.vals[0];
    const lastKey = this.keys.pop() as number;
    const lastVal = this.vals.pop() as number;
    if (this.keys.length > 0) {
      this.keys[0] = lastKey; this.vals[0] = lastVal;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.keys.length && this.keys[l] < this.keys[m]) m = l;
        if (r < this.keys.length && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return [key, val];
  }
  private swap(a: number, b: number): void {
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
    [this.vals[a], this.vals[b]] = [this.vals[b], this.vals[a]];
  }
}

/**
 * Measures the longest walk from any reachable walkable cell to the nearest stop.
 * Multi-source Dijkstra from the stops over 8-neighbour moves; a diagonal is allowed only when both
 * orthogonal neighbours are walkable, so the hero cannot cut a blocked corner.
 */
export function longestStopGap(input: GapInput): GapReport {
  const { cell, halfExtent, walkable, stops, start } = input;
  if (!(cell > 0) || !(halfExtent > 0) || !Number.isFinite(cell) || !Number.isFinite(halfExtent)) {
    throw new RangeError('longestStopGap requires a positive cell size and half extent');
  }
  const n = Math.round((2 * halfExtent) / cell) + 1;
  const xOf = (i: number): number => -halfExtent + i * cell;
  const idx = (i: number, j: number): number => j * n + i;
  const ok = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) ok[idx(i, j)] = walkable(xOf(i), xOf(j)) ? 1 : 0;
  }
  const at = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < n && j < n && ok[idx(i, j)] === 1;

  const nearestOk = (p: GroundPoint): number => {
    let best = -1, bestD = Infinity;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        if (!at(i, j)) continue;
        const d = Math.hypot(xOf(i) - p.x, xOf(j) - p.z);
        if (d < bestD) { bestD = d; best = idx(i, j); }
      }
    }
    return best;
  };

  // Reachable set from the start (cell connectivity, 8-neighbour with the corner rule).
  const startCell = nearestOk(start);
  const reach = new Uint8Array(n * n);
  if (startCell >= 0) {
    const stack = [startCell];
    reach[startCell] = 1;
    while (stack.length) {
      const c = stack.pop() as number;
      const i = c % n, j = Math.floor(c / n);
      for (const [di, dj] of NEIGHBOURS) {
        const ni = i + di, nj = j + dj;
        if (!canStep(i, j, di, dj)) continue;
        const nc = idx(ni, nj);
        if (!reach[nc]) { reach[nc] = 1; stack.push(nc); }
      }
    }
  }
  function canStep(i: number, j: number, di: number, dj: number): boolean {
    if (!at(i + di, j + dj)) return false;
    if (di !== 0 && dj !== 0) return at(i + di, j) && at(i, j + dj);
    return true;
  }

  // Multi-source Dijkstra from the stops.
  const dist = new Float64Array(n * n).fill(Infinity);
  const heap = new Heap();
  for (const s of stops) {
    const c = nearestOk(s);
    if (c < 0 || !reach[c]) continue;
    dist[c] = 0;
    heap.push(0, c);
  }
  while (heap.size > 0) {
    const [d, c] = heap.pop();
    if (d > dist[c]) continue;
    const i = c % n, j = Math.floor(c / n);
    for (const [di, dj, w] of NEIGHBOURS) {
      if (!canStep(i, j, di, dj)) continue;
      const nc = idx(i + di, j + dj);
      const nd = d + w * cell;
      if (nd < dist[nc]) { dist[nc] = nd; heap.push(nd, nc); }
    }
  }

  let longest = 0, longestAt: GroundPoint | null = null, reachable = 0, stranded = 0;
  for (let c = 0; c < n * n; c++) {
    if (!reach[c]) continue;
    reachable++;
    if (!Number.isFinite(dist[c])) { stranded++; continue; }
    if (dist[c] > longest) {
      longest = dist[c];
      longestAt = { x: xOf(c % n), z: xOf(Math.floor(c / n)) };
    }
  }
  return { longest, at: longestAt, reachableCells: reachable, stranded };
}
