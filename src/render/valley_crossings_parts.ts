// The valley's three walkable crossings as pure geometry (review 025 item 2): the ford, the mill bridge and the
// stepping stones. No Babylon here, so the tests can check every part against core's walk surface.
// valley_crossings.ts turns these parts into merged meshes.
//
// Frame: a crossing runs from `from` to `to`. Along it, u = (ux, uz); across it, v = (uz, -ux), the same frame the gate
// uses, so a box's local x is across the crossing and its local z is along it, with yaw = atan2(ux, uz).
// Heights are never invented here: the deck and stone tops come from core's walkSurfaceAt, the ford's water depth and
// the stones' height above the water come from the layout data.
import { WATER_LEVEL } from '../core/world/valley';
import { VALLEY_CROSSINGS, VALLEY_RIVER_IN, type LayoutCrossing, type LayoutPoint } from '../core/world/valley_layout';

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
  /** The gravel slab's thickness (m), laid across the ford under the water. */
  gravelThick: 0.1,
  gravelInset: 0.2,
  gravelSlice: 1,
  /** Worn bank stones: along each edge of the ford, every BANK_SPACING m, just outside the crossing. */
  bankSpacing: 1.6,
  bankOut: 0.3,
} as const;

export type CrossingMaterial = 'wood' | 'stone' | 'gravel';

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

export type HeightFn = (x: number, z: number) => number;

/** Ford: a gravel slab under the 0.4 m of water, and worn stones along both banks. No walk surface of its own. */
export function fordParts(c: LayoutCrossing, heightAt: HeightFn): CrossingPart[] {
  const f = crossingFrame(c);
  // The gravel's top sits 3 cm above the ford bed, which is water_depth below the water.
  const top = WATER_LEVEL - (c.water_depth ?? 0.4) + 0.03;
  const parts: CrossingPart[] = [];
  const slices = Math.max(1, Math.round(f.len / CROSSING_TUNING.gravelSlice));
  const width = c.width - CROSSING_TUNING.gravelInset;
  for (let i = 0; i < slices; i++) {
    const p = crossingPoint(c, (i + 0.5) / slices, 0);
    parts.push({
      name: `ford_gravel_${i}`, material: 'gravel', x: p.x, z: p.z,
      w: width, d: f.len / slices, h: CROSSING_TUNING.gravelThick, y: top - CROSSING_TUNING.gravelThick, yaw: f.yaw,
    });
  }
  const bankAcross = c.width / 2 + CROSSING_TUNING.bankOut;
  const banks = Math.max(1, Math.round(f.len / CROSSING_TUNING.bankSpacing));
  for (const side of [-1, 1]) {
    for (let i = 0; i < banks; i++) {
      const p = crossingPoint(c, (i + 0.5) / banks, side * bankAcross);
      const ground = heightAt(p.x, p.z);
      parts.push({
        name: `ford_bank_${side < 0 ? 'a' : 'b'}_${i}`, material: 'stone', x: p.x, z: p.z,
        w: 0.7, d: 0.5, h: 0.3, y: ground - 0.1, yaw: f.yaw + ((i * 0.37 + (side > 0 ? 0.5 : 0)) % 1) * 0.6,
      });
    }
  }
  return parts;
}

/**
 * Mill bridge: the deck, slice by slice, at the walk surface core gives its middle, so the hero's feet and the wood
 * agree. Piers stand in the river between the ends, and a rail runs along the upstream edge.
 */
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

/** Every walkable crossing's parts, in layout order. The forge bridge is not walkable and is not drawn here. */
export function crossingParts(heightAt: HeightFn, surfaceAt: HeightFn, waterLevel: number,
  crossings: readonly LayoutCrossing[] = VALLEY_CROSSINGS, river: readonly LayoutPoint[] = VALLEY_RIVER_IN): CrossingPart[] {
  const out: CrossingPart[] = [];
  for (const c of crossings) {
    if (c.walkable === false) continue;
    if (c.surface === 'bed') out.push(...fordParts(c, heightAt));
    else if (c.surface === 'deck') out.push(...plankBridgeParts(c, heightAt, surfaceAt, upstreamPointOf(c, river)));
    else if (c.surface === 'stones') out.push(...steppingStoneParts(c, heightAt, waterLevel));
  }
  return out;
}
