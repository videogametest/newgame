// The valley's walkable crossings as pure geometry (review 025 item 2): the ford, the mill bridge and the stepping
// stones. No Babylon here, so the tests can check every part against core's walk surface.
// valley_crossings.ts turns these parts into merged meshes, and the ford's ribbon into one more.
//
// Frame: a crossing runs from `from` to `to`. Along it, u = (ux, uz); across it, v = (uz, -ux), the same frame the gate
// uses, so a box's local x is across the crossing and its local z is along it, with yaw = atan2(ux, uz).
// Heights are never invented here: the deck and stone tops come from core's walkSurfaceAt, the ford's water depth and
// the stones' height above the water come from the layout data.
import { VALLEY_SEED, WATER_LEVEL, isRoadId, valleyHeightAt } from '../core/world/valley';
import { seededValue } from '../core/world/terrain';
import { VALLEY_CROSSINGS, VALLEY_RIVER_IN, VALLEY_ROADS, type LayoutCrossing, type LayoutPoint } from '../core/world/valley_layout';
import { ROADS, drawnHeightAt, roadHidden, roadLine } from './valley_roads';

export const CROSSING_TUNING = {
  /** Length (m) of one deck slice. Each slice takes the walk surface at its middle, so the deck follows core. */
  deckSlice: 0.5,
  deckThick: 0.2,
  /** Rail posts stand this far in from the deck's edge, every RAIL_SPACING m, and RAIL_HEIGHT m above the deck. */
  railInset: 0.12,
  railSpacing: 2,
  railHeight: 1,
  /** Piers under the deck, every PIER_SPACING m between the two ends. */
  pierSpacing: 2.5,
} as const;

/**
 * The ford (review 027 item 2). The east road goes down into the river as a shallow gravel bed with worn earth banks,
 * 3.6 m wide, and it is the same strip valley_roads.ts draws: the ribbon starts and ends on that strip's own rows, so
 * the two meet with no seam and no block.
 */
export const FORD = {
  road: 'east_road',
  /** The gravel's top sits this far above the ford bed (the bed is water_depth below the water). */
  gravelLift: 0.03,
  /** Pale gravel, a little lighter than the water over it. */
  gravel: { r: 0.66, g: 0.62, b: 0.54 },
} as const;

export type CrossingMaterial = 'wood' | 'stone';

export interface CrossingPart {
  name: string;
  material: CrossingMaterial;
  /** Centre on the ground plane. */
  x: number;
  z: number;
  /** Size across the crossing (local x), along it (local z), and up (y). */
  w: number;
  d: number;
  h: number;
  /** Bottom of the box. */
  y: number;
  yaw: number;
}

export interface CrossingFrame {
  ux: number;
  uz: number;
  vx: number;
  vz: number;
  len: number;
  yaw: number;
}

export type HeightFn = (x: number, z: number) => number;

export function crossingFrame(c: LayoutCrossing): CrossingFrame {
  const dx = c.to.x - c.from.x, dz = c.to.z - c.from.z;
  const len = Math.hypot(dx, dz);
  const ux = dx / len, uz = dz / len;
  return { ux, uz, vx: uz, vz: -ux, len, yaw: Math.atan2(ux, uz) };
}

/** The point at `t` along the crossing (0 at `from`, 1 at `to`) and `across` metres to the v side of its centre line. */
export function crossingPoint(c: LayoutCrossing, t: number, across: number): { x: number; z: number } {
  const f = crossingFrame(c);
  const along = t * f.len;
  return {
    x: c.from.x + f.ux * along + f.vx * across,
    z: c.from.z + f.uz * along + f.vz * across,
  };
}

/** Which side of the crossing the river's upstream point lies on: +1 for the v side, -1 for the other. */
export function upstreamSide(c: LayoutCrossing, upstream: LayoutPoint): number {
  const f = crossingFrame(c);
  const dot = (upstream.x - c.x) * f.vx + (upstream.z - c.z) * f.vz;
  return dot >= 0 ? 1 : -1;
}

/**
 * The river point just upstream of the crossing: the start of the river's segment nearest the crossing's centre. The
 * river runs from its first point to its last, so the segment's start is the upstream end.
 */
export function upstreamPointOf(c: LayoutCrossing, river: readonly LayoutPoint[]): LayoutPoint {
  let best = { d: Infinity, at: river[0] };
  for (let i = 0; i + 1 < river.length; i++) {
    const a = river[i], b = river[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.z - a.z) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(c.x - (a.x + dx * t), c.z - (a.z + dz * t));
    if (d < best.d) best = { d, at: a };
  }
  return best.at;
}

/** Mill bridge: the deck, slice by slice, at the walk surface core gives its middle, so the hero's feet and the wood agree. */
export function plankBridgeParts(c: LayoutCrossing, heightAt: HeightFn, surfaceAt: HeightFn, upstream: LayoutPoint): CrossingPart[] {
  const f = crossingFrame(c);
  const parts: CrossingPart[] = [];
  const slices = Math.max(1, Math.round(f.len / CROSSING_TUNING.deckSlice));
  const sliceLen = f.len / slices;
  const edge = c.width / 2 - CROSSING_TUNING.railInset;
  const railSide = upstreamSide(c, upstream);
  for (let i = 0; i < slices; i++) {
    const p = crossingPoint(c, (i + 0.5) / slices, 0);
    const top = surfaceAt(p.x, p.z);
    parts.push({
      name: `deck_${i}`, material: 'wood', x: p.x, z: p.z, w: c.width, d: sliceLen,
      h: CROSSING_TUNING.deckThick, y: top - CROSSING_TUNING.deckThick, yaw: f.yaw,
    });
    const rp = crossingPoint(c, (i + 0.5) / slices, railSide * edge);
    parts.push({
      name: `rail_top_${i}`, material: 'wood', x: rp.x, z: rp.z, w: 0.1, d: sliceLen, h: 0.1,
      y: top + CROSSING_TUNING.railHeight - 0.05, yaw: f.yaw,
    });
  }
  const railPosts = Math.max(2, Math.round(f.len / CROSSING_TUNING.railSpacing) + 1);
  for (let i = 0; i < railPosts; i++) {
    const p = crossingPoint(c, i / (railPosts - 1), railSide * edge);
    const top = surfaceAt(p.x, p.z);
    parts.push({ name: `rail_post_${i}`, material: 'wood', x: p.x, z: p.z, w: 0.14, d: 0.14, h: CROSSING_TUNING.railHeight, y: top, yaw: f.yaw });
  }
  const piers = Math.max(0, Math.round(f.len / CROSSING_TUNING.pierSpacing) - 1);
  for (let i = 1; i <= piers; i++) {
    for (const side of [-1, 1]) {
      const p = crossingPoint(c, i / (piers + 1), side * edge);
      const top = surfaceAt(p.x, p.z) - CROSSING_TUNING.deckThick;
      const bed = heightAt(p.x, p.z) - 0.2;
      if (top <= bed) continue;
      parts.push({ name: `pier_${i}_${side < 0 ? 'a' : 'b'}`, material: 'wood', x: p.x, z: p.z, w: 0.3, d: 0.3, h: top - bed, y: bed, yaw: f.yaw });
    }
  }
  return parts;
}

/**
 * Stepping stones: flat-topped stones, each the crossing's width across and stone_size along, with gap_between_stones
 * between them, centred on the crossing. Each stone's top is top_above_water above the water (its walk surface).
 */
export function steppingStoneParts(c: LayoutCrossing, heightAt: HeightFn, waterLevel: number): CrossingPart[] {
  const f = crossingFrame(c);
  const size = c.stone_size ?? 1.2;
  const gap = c.gap_between_stones ?? 0.5;
  const top = waterLevel + (c.top_above_water ?? 0.3);
  const count = Math.max(1, Math.floor((f.len + gap) / (size + gap)));
  const extent = count * size + (count - 1) * gap;
  const start = (f.len - extent) / 2;
  const parts: CrossingPart[] = [];
  for (let i = 0; i < count; i++) {
    const along = start + size / 2 + i * (size + gap);
    const p = crossingPoint(c, along / f.len, 0);
    const bed = Math.min(heightAt(p.x, p.z), waterLevel);
    parts.push({
      name: `stone_${i}`, material: 'stone', x: p.x, z: p.z, w: c.width, d: size, h: top - (bed - 0.2), y: bed - 0.2, yaw: f.yaw,
    });
  }
  return parts;
}

/** The ford's layout entry. Core names exactly one ford; a missing one is a broken layout, not a skipped part. */
export function fordCrossing(crossings: readonly LayoutCrossing[] = VALLEY_CROSSINGS): LayoutCrossing {
  const ford = crossings.find((c) => c.name === 'ford');
  if (!ford) throw new Error('the layout has no ford');
  return ford;
}

/** Every walkable box-built crossing's parts, in layout order. The ford is a ribbon (fordRibbon), not boxes. */
export function crossingParts(heightAt: HeightFn, surfaceAt: HeightFn, waterLevel: number,
  crossings: readonly LayoutCrossing[] = VALLEY_CROSSINGS, river: readonly LayoutPoint[] = VALLEY_RIVER_IN): CrossingPart[] {
  const out: CrossingPart[] = [];
  for (const c of crossings) {
    if (c.walkable === false) continue;
    if (c.surface === 'deck') out.push(...plankBridgeParts(c, heightAt, surfaceAt, upstreamPointOf(c, river)));
    else if (c.surface === 'stones') out.push(...steppingStoneParts(c, heightAt, waterLevel));
  }
  return out;
}

export interface FordRow {
  /** The centre line's point at this row. */
  x: number;
  z: number;
  /** True where the centre line is under the water: the gravel bed. */
  wet: boolean;
}

export interface FordRibbon {
  /** Four vertices per row, across: verge, earth/gravel, earth/gravel, verge. */
  positions: number[];
  colors: number[];
  indices: number[];
  rows: FordRow[];
  /** Road sample index of the ribbon's first and last rows: the two rows valley_roads.ts's strip also has. */
  firstSample: number;
  lastSample: number;
}

/**
 * Pure: the east road through the ford as one ribbon. It runs along the road's own sampled line from the last dry row
 * on one bank to the first on the other, with the road's width and wobble, so its end rows are the road strip's
 * rows exactly. A row is wet when its centre is under the water: there the top is the gravel, never above the water;
 * elsewhere it is the road's surface.
 */
export function fordRibbon(heightAt: HeightFn = valleyHeightAt, ford: LayoutCrossing = fordCrossing()): FordRibbon {
  const line = roadLine(VALLEY_ROADS[FORD.road]);
  const hidden = line.map((p) => roadHidden(p.x, p.z, heightAt));
  let centre = 0, best = Infinity;
  line.forEach((p, i) => {
    const d = Math.hypot(p.x - ford.x, p.z - ford.z);
    if (d < best) { best = d; centre = i; }
  });
  if (!hidden[centre]) throw new Error('the ford centre is not under the water on the east road');
  let lo = centre, hi = centre;
  while (lo > 0 && hidden[lo - 1]) lo--;
  while (hi < line.length - 1 && hidden[hi + 1]) hi++;
  if (lo === 0 || hi === line.length - 1) throw new Error('the east road does not leave the water on both banks');
  const first = lo - 1, last = hi + 1;
  // The same index and seeds valley_roads.ts uses for this road, so the wobble and shade match its strip row for row.
  const roadIndex = Object.keys(VALLEY_ROADS).indexOf(FORD.road);
  if (roadIndex < 0 || !isRoadId(FORD.road)) throw new Error(`the ford's road ${FORD.road} is not a road`);
  const width = ROADS.roadWidth;
  const seed = (i: number, salt: number) => seededValue(VALLEY_SEED, roadIndex * 4099 + i, salt, 31);
  const gravelTop = WATER_LEVEL - (ford.water_depth ?? 0.4) + FORD.gravelLift;
  const gravel = [FORD.gravel.r, FORD.gravel.g, FORD.gravel.b];
  const positions: number[] = [], colors: number[] = [], indices: number[] = [], rows: FordRow[] = [];
  const across = [-0.5, -0.3, 0.3, 0.5];
  for (let i = first; i <= last; i++) {
    const p = line[i];
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / len, nz = (b.x - a.x) / len;
    const wob = 1 + (seed(i, 0) - 0.5) * 2 * ROADS.wander;
    const shade = 0.92 + 0.16 * seed(i, 1);
    const wet = heightAt(p.x, p.z) < WATER_LEVEL;
    rows.push({ x: p.x, z: p.z, wet });
    for (const t of across) {
      const x = p.x + nx * t * width * wob, z = p.z + nz * t * width * wob;
      const ground = drawnHeightAt(x, z, heightAt);
      // A wet vertex is the bed, never above the water: where the bank rises past the surface the terrain covers it.
      positions.push(x, wet ? Math.min(Math.max(ground, gravelTop), WATER_LEVEL - 0.02) : ground + ROADS.lift, z);
      let c: { r: number; g: number; b: number };
      if (wet) c = { r: gravel[0], g: gravel[1], b: gravel[2] };
      else {
        const earth = Math.abs(t) === 0.5 ? ROADS.verge : ROADS.road.scale(shade);
        c = { r: earth.r, g: earth.g, b: earth.b };
      }
      colors.push(c.r, c.g, c.b, 1);
    }
  }
  for (let r = 0; r + 1 < rows.length; r++) {
    const q0 = r * 4;
    for (let k = 0; k < 3; k++) {
      const q = q0 + k;
      indices.push(q, q + 4, q + 1, q + 1, q + 4, q + 5);
    }
  }
  return { positions, colors, indices, rows, firstSample: first, lastSample: last };
}
