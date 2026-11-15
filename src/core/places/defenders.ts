// Where the Mill's defenders are, by hour (GAME_DESIGN.md section 5; task 015). Pure: no Babylon.
// Reads the day data (place_days.ts, bandits.ts) and the Mill's spot positions (mill_spots.ts), and walks
// patrol legs over the valley's walk rule with A* (pathfinding.ts). Defenders stand unaware: no activation here.
import { garrisonOf, type BanditDef, type PlaceId } from '../../data/bandits';
import { ASSIGNMENTS, PLACE_DAYS, type PatrolRoute } from '../../data/place_days';
import { MILL_SPOTS } from '../../data/mill_spots';
import type { Vec2 } from '../types/shared';
import { findPath, type WalkableGrid } from '../world/pathfinding';
import { blocksHero, walkSurfaceAt } from '../world/valley';
import { routineOf, routeCycle } from './day';
import { hourOfDay, type Routine } from './schedules';

/** A patrol walks from its previous stop to the next over this many seconds, then stands. PLACEHOLDER pace, untuned. */
export const PATROL_WALK_SECONDS = 60;
/** Standing defenders are spaced this far apart around their spot so two of them never share a point. PLACEHOLDER. */
export const SLOT_SPACING = 0.9;

/** The walk grid around the Mill: 1 m cells from (originX, originZ). Covers every Mill spot with room to walk round. */
export const MILL_GRID = { originX: -200, originZ: 30, width: 60, depth: 56 } as const;

export type DefenderKind = 'soldier' | 'archer' | 'runner';

export interface Defender {
  /** The bandit id. */
  id: string;
  kind: DefenderKind;
  activity: Routine['activity'];
  /** Where the defender stands or is walking to. */
  spot: string;
  x: number;
  z: number;
  /** Heading in radians, atan2(dx, dz): the walking direction, or the way to face when standing. */
  yaw: number;
  moving: boolean;
  /** Keeps a lit torch (night watch). */
  torch: boolean;
  /** False while the post is empty at a guard change. */
  present: boolean;
}

export function spotPosition(placeId: PlaceId, spot: string): Vec2 {
  if (placeId !== 'mill') throw new Error(`No spot table for ${placeId}`);
  const p = MILL_SPOTS[spot];
  if (!p) throw new Error(`No world position for Mill spot ${spot}`);
  return p;
}

const legCache = new Map<string, Vec2[]>();

/** The walking polyline from one spot to another over the Mill grid, both ends exact. Throws if no path exists. */
export function legPath(from: Vec2, to: Vec2): Vec2[] {
  const key = `${from.x},${from.z}>${to.x},${to.z}`;
  const cached = legCache.get(key);
  if (cached) return cached;
  const g = MILL_GRID;
  const grid: WalkableGrid = {
    width: g.width,
    depth: g.depth,
    isBlocked: (i, j) => blocksHero(g.originX + i, g.originZ + j),
  };
  const toCell = (p: Vec2): Vec2 => ({ x: Math.round(p.x - g.originX), z: Math.round(p.z - g.originZ) });
  const cells = findPath(grid, toCell(from), toCell(to));
  if (!cells) throw new Error(`No walking path from (${from.x}, ${from.z}) to (${to.x}, ${to.z})`);
  const world = cells.map(c => ({ x: c.x + g.originX, z: c.z + g.originZ }));
  const line = [from, ...world.slice(1, -1), to];
  legCache.set(key, line);
  return line;
}

/** The point `fraction` (0 to 1) of the way along a polyline by arc length, and the heading there. */
export function alongPath(line: readonly Vec2[], fraction: number): { x: number; z: number; yaw: number } {
  const f = Math.min(1, Math.max(0, fraction));
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    const l = Math.hypot(line[i].x - line[i - 1].x, line[i].z - line[i - 1].z);
    lengths.push(l);
    total += l;
  }
  if (total === 0) return { x: line[0].x, z: line[0].z, yaw: 0 };
  let d = f * total;
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] === 0 ? 0 : Math.min(1, d / lengths[i]);
      const a = line[i], b = line[i + 1];
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
    }
    d -= lengths[i];
  }
  return { x: line[line.length - 1].x, z: line[line.length - 1].z, yaw: 0 };
}

/**
 * Where a patrol is `seconds` into the day. In the first PATROL_WALK_SECONDS of a stop it walks in from the previous stop;
 * after that it stands at the stop, facing the next one.
 */
export function patrolAt(route: PatrolRoute, placeId: PlaceId, seconds: number, phase: number): { spot: string; x: number; z: number; yaw: number; moving: boolean } {
  const cycle = routeCycle(route);
  let t = (((seconds + phase) % cycle) + cycle) % cycle;
  const stops = route.stops;
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    if (t < stop.seconds) {
      const here = spotPosition(placeId, stop.spot);
      const prev = stops[(i - 1 + stops.length) % stops.length];
      const next = stops[(i + 1) % stops.length];
      if (t < PATROL_WALK_SECONDS && prev.spot !== stop.spot) {
        const line = legPath(spotPosition(placeId, prev.spot), here);
        return { spot: stop.spot, ...alongPath(line, t / PATROL_WALK_SECONDS), moving: true };
      }
      const toNext = spotPosition(placeId, next.spot);
      return { spot: stop.spot, x: here.x, z: here.z, yaw: Math.atan2(toNext.x - here.x, toNext.z - here.z), moving: false };
    }
    t -= stop.seconds;
  }
  const last = spotPosition(placeId, stops[stops.length - 1].spot);
  return { spot: stops[stops.length - 1].spot, x: last.x, z: last.z, yaw: 0, moving: false };
}

/** The unit type a defender fights as. There is no runner unit yet: runners fight as soldiers (logged for the critique). */
function kindOf(b: BanditDef): DefenderKind {
  return b.unit === 'archer' ? 'archer' : b.unit === 'runner' ? 'runner' : 'soldier';
}

/** Everyone in the Mill's garrison at `hour` (in-game hours). `retaken` picks the garrison after the player takes it back. */
export function defendersAt(placeId: PlaceId, hour: number, retaken = false): Defender[] {
  const garrison = garrisonOf(placeId, retaken);
  const yardFace = spotPosition(placeId, PLACE_DAYS[placeId].fire);
  return garrison.map((b, index): Defender => {
    const r = routineOf(b.id, hour);
    const absent = r.activity === 'guard_change';
    const a = ASSIGNMENTS[b.id];
    let x = 0, z = 0, yaw = 0, moving = false, spot = r.locationId;
    if (r.activity === 'patrol' && r.routeId) {
      const route = PLACE_DAYS[placeId].routes.find(rt => rt.id === r.routeId);
      if (!route) throw new Error(`Unknown route ${r.routeId}`);
      const phase = a.day.kind === 'patrol' ? a.day.phase : 0;
      const p = patrolAt(route, placeId, hourOfDay(hour) * 3600, phase);
      ({ x, z, yaw, moving, spot } = p);
    } else if (!absent) {
      const p = spotPosition(placeId, spot);
      x = p.x; z = p.z; yaw = Math.atan2(yardFace.x - p.x, yardFace.z - p.z);
    }
    // Standing defenders spread out round their spot so two never share a point (order in the garrison).
    const ring = index * 1.1;
    const offX = moving || absent ? 0 : Math.cos(ring) * SLOT_SPACING;
    const offZ = moving || absent ? 0 : Math.sin(ring) * SLOT_SPACING;
    return {
      id: b.id,
      kind: kindOf(b),
      activity: r.activity,
      spot,
      x: x + offX,
      z: z + offZ,
      yaw,
      moving,
      torch: r.torch === true,
      present: !absent,
    };
  });
}

/** Ground height under a defender, from the valley's walk rule. */
export function defenderGround(d: Pick<Defender, 'x' | 'z'>): number {
  return walkSurfaceAt(d.x, d.z);
}
