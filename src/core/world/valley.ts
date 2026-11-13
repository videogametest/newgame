// Tallowmere: the first valley as data. Pure: no Babylon imports.
// The places, roads, rivers, edge and stops come from docs/tasks/003-layout/layout.json through the generated
// valley_layout.ts (do not edit that by hand). This file turns them into the terrain and the walking rules.

import { createHeightAt, type TerrainShape } from './terrain';
import { SHELF_TUNING, withWickShelf } from '../../village/shelf';
import { withGradedRoads, type Graded } from './grading';
import { WICK_THINGS, wickHouses } from '../../village/plan';
import { solidAt, type Footprint } from './solids';
import { landmarkSolids } from '../../landmarks/plan';
import {
  VALLEY_BASE_HEIGHT,
  VALLEY_CROSSINGS,
  VALLEY_LAYERS,
  VALLEY_PLACES as LAYOUT_PLACES,
  VALLEY_RIVER_IN,
  VALLEY_RIVER_OUT,
  VALLEY_ROADS,
  VALLEY_STOPS as LAYOUT_STOPS,
  VALLEY_TERRAIN_FEATURES,
  type LayoutCrossing,
  type LayoutPoint,
} from './valley_layout';

export const VALLEY_SEED = 1066;
/** The valley is 800 m across, centred on the origin. */
export const VALLEY_HALF_EXTENT = 400;
/** Water surface height (m). Ground below it is lake or river. */
export const WATER_LEVEL = 2;

/** Named places in metres (x, z). Placed by the layout; not moved here. */
export const VALLEY_PLACES = LAYOUT_PLACES;

/** Points worth stopping for: the places, the signposts and the placed stops (GAME_DESIGN §4, review 015). */
export const VALLEY_STOPS: ReadonlyArray<{ name: string; x: number; z: number }> = LAYOUT_STOPS;

/** Outside this radius the ground is the valley's edge: a ring of high ground, not walkable. */
export const EDGE_RADIUS = 335;
/** The patrol hut's open zone: the one edge-side walk the layout allows. */
const PATROL_HUT_OPEN = { x: VALLEY_PLACES.patrolHut.x, z: VALLEY_PLACES.patrolHut.z, radius: 60 };
/** Steepest walkable slope (rise over run). */
const MAX_WALK_SLOPE = 0.7;
/**
 * The rim: a band RIM_START..RIM_FULL that climbs to a crest. The crest is the land plus RIM_RISE, capped at RIM_CAP,
 * which keeps the rim below the signal hill's top (63.1 m). The band always rises at least RIM_STEP_MIN, so it is a
 * wall (slope >= 1), not a slope: steep, not tall (review 020).
 */
const RIM_START = EDGE_RADIUS - 5;
const RIM_FULL = EDGE_RADIUS + 3;
const RIM_RISE = 10;
const RIM_CAP = 58;
const RIM_STEP_MIN = 8;
/**
 * The soldiers' road gate (design v34): a fixed line across the road where it crosses GATE_RADIUS. The road's
 * corridor through the rim (GATE_HALF_WIDTH to each side, valley side only) is the one opening; the gate wall fills
 * it, GATE_WALL_HALF thick either side of the line. The wall is thicker than a 4 m grid step in its direction, so a
 * grid walk cannot step over it.
 */
export const GATE_RADIUS = 336;
export const GATE_HALF_WIDTH = 6;
export const GATE_WALL_HALF = 2;
const GATE_CORRIDOR_DEPTH = 15;
/** The pass floor is level over this many metres before the gate, and to PASS_FLOOR_TO m beyond the gate line (inside the wall). */
const PASS_FLOOR_RUN = 10;
const PASS_FLOOR_TO = 2;
/** How far the pass stays open behind the gate: seen through the bars, never reached. */
const GATE_PASS_BEYOND = 60;
/** The gorge: the last GORGE_RUN m of river out. Channel within GORGE_CHANNEL of the centre line; walls rise to WALL_TOP. */
const GORGE_RUN = 100;
const GORGE_CHANNEL = 5;
const GORGE_WALL_TOP_AT = 10;
const GORGE_PLATEAU_END = 25;
const GORGE_END = 35;
const GORGE_WALL_TOP = WATER_LEVEL + 15;
/** Stepping stones: their tops sit this far above the water (design section 4, "The crossings"). */
const STONE_TOP = WATER_LEVEL + 0.3;
/** Length (m) of the landing at each end of the stepping stones: the bank is cut down to the stone top over it (review 021). */
const LANDING_RUN = 6;
/** A bridge deck is never lower than this above the water (design section 4, "The crossings"). */
const DECK_MIN = WATER_LEVEL + 1.0;

/** Height (m) of the river bed on its centre line. Mid-stream depth is WATER_LEVEL - RIVER_BED = 1.5 m. */
const RIVER_BED = 0.5;
/** Rise (m) per metre away from the centre line. The water is about 10 m wide where the bank reaches WATER_LEVEL. */
const RIVER_BANK_SLOPE = 0.3;
/** The ford is 0.4 m of water over stones, so its bed sits 0.4 m below the water (design section 4, "The crossings"). */
const FORD_BED = WATER_LEVEL - 0.4;
/** The ford bed is FORD_BED inside FORD_FULL m of the ford and fades back to RIVER_BED by FORD_FADE m. */
const FORD_FULL = 8;
const FORD_FADE = 14;

export const VALLEY_SHAPE: TerrainShape = {
  baseHeight: VALLEY_BASE_HEIGHT,
  layers: VALLEY_LAYERS,
  features: VALLEY_TERRAIN_FEATURES,
};

const heightSampler = createHeightAt(VALLEY_SEED, VALLEY_SHAPE);

/** Ground height (m) at a valley point. Same answer for the same (x, z) on every call. */
export function valleyHeightAt(x: number, z: number): number {
  return passFloor(x, z, (graded ??= gradeTheRoads()).heightAt(x, z));
}

/**
 * The pass floor is level for the last PASS_FLOOR_RUN m before the gate and across the gate line to PASS_FLOOR_TO m
 * beyond it (review 025 item 1). Each cross-section holds the height it has PASS_FLOOR_RUN m out on the valley side, so
 * the ground meets the natural slope continuously there and the gate's foot is not hidden by the rise.
 */
function passFloor(x: number, z: number, h: number): number {
  const dx = x - GATE.x;
  const dz = z - GATE.z;
  const s = dx * GATE.ux + dz * GATE.uz;
  if (s < -PASS_FLOOR_RUN || s > PASS_FLOOR_TO + 1e-6) return h;
  const a = dx * GATE.uz - dz * GATE.ux;
  if (Math.abs(a) > GATE_HALF_WIDTH + 1e-6) return h;
  const floorS = -PASS_FLOOR_RUN;
  const fx = GATE.x + GATE.ux * floorS + GATE.uz * a;
  const fz = GATE.z + GATE.uz * floorS - GATE.ux * a;
  return (graded ??= gradeTheRoads()).heightAt(fx, fz);
}
let graded: Graded | null = null;

/** Roads keep to 0.2 along their line and paths to 0.45 (design section 4; review 018 item 6). */
export const ROAD_LIMIT = 0.2;
export const PATH_LIMIT = 0.45;
export const isRoadId = (id: string): boolean => id === 'road_in' || id.endsWith('_road');

/** The land with Wick's shelf cut into it, before the roads are graded. */
export function shelvedHeightAt(x: number, z: number): number {
  return (shelved ??= withWickShelf(landHeightAt, WATER_LEVEL, riverDistance))(x, z);
}
let shelved: ((x: number, z: number) => number) | null = null;

function gradeTheRoads(): Graded {
  const roads = Object.entries(VALLEY_ROADS).map(([id, points]) => ({ id, points, limit: isRoadId(id) ? ROAD_LIMIT : PATH_LIMIT }));
  return withGradedRoads(shelvedHeightAt, roads, {
    // A road's height is fixed where it stands on a crossing or in water, close to a river, and from the gate outward.
    pinned: (x, z) => nearCrossing(x, z) || insideWickBox(x, z) || shelvedHeightAt(x, z) < WATER_LEVEL + 0.2 || riverDistance(x, z) < RIVER_KEEP || Math.hypot(x, z) > GATE_RADIUS - 1,
  });
}
/** Wick's shelf is already level; roads are left as the shelf made them inside the village. */
export const insideWickBox = (x: number, z: number): boolean => { const b = SHELF_TUNING.box; return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1; };
/** Within this distance of a crossing's line, bank to bank: the crossing and its landings are left as built. */
const CROSSING_KEEP = 9;
export function nearCrossing(x: number, z: number): boolean {
  return VALLEY_CROSSINGS.some((c) => {
    const dx = c.to.x - c.from.x, dz = c.to.z - c.from.z;
    const u = Math.min(1, Math.max(0, ((x - c.from.x) * dx + (z - c.from.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - (c.from.x + dx * u), z - (c.from.z + dz * u)) < CROSSING_KEEP;
  });
}
/** Roads leave the rivers' channels and banks as the valley cut them: no grading this close to a river's centre line. */
const RIVER_KEEP = 4;

/** What the grading did to each road: largest cut, largest fill, and samples it could not bring within the limit. */
export const gradingReport = () => (graded ??= gradeTheRoads()).report();

/** The valley's land before Wick's shelf and bay are cut into it (docs/tasks/003-wick.md, rules 4 and 5). */
export function landHeightAt(x: number, z: number): number {
  const d = riverDistance(x, z);
  // The bed is flat where it is lifted (the ford), and the banks keep the river's usual V: lifting the bed must not
  // pinch the river to a trickle (review 028). Away from the ford riverBedAt is RIVER_BED and this is the plain V.
  const bank = Math.min(heightSampler(x, z), Math.max(riverBedAt(x, z), RIVER_BED + RIVER_BANK_SLOPE * d));
  return landingAdjust(gorgeAdjust(bank, rimHold(bank, x, z, d), x, z), x, z);
}

/**
 * Stepping-stone landings (review 021): within LANDING_RUN m beyond each end of the stones, and within the path's width
 * plus a metre each side, the ground ramps from the stone top at the stones' end up to the bank at LANDING_RUN m out.
 * It only ever lowers the ground, so the bank is untouched beyond the cut.
 */
function landingAdjust(h: number, x: number, z: number): number {
  for (const c of VALLEY_CROSSINGS) {
    if (c.walkable === false || c.surface !== 'stones') continue;
    const { t, across } = stripFrame(x, z, c);
    if (across > c.width / 2 + 1) continue;
    const len = Math.hypot(c.to.x - c.from.x, c.to.z - c.from.z);
    const beyond = t < 0 ? -t * len : t > 1 ? (t - 1) * len : -1;
    if (beyond < 0 || beyond >= LANDING_RUN) continue;
    return Math.min(h, STONE_TOP + (h - STONE_TOP) * (beyond / LANDING_RUN));
  }
  return h;
}

export function isWater(x: number, z: number): boolean {
  return valleyHeightAt(x, z) < WATER_LEVEL;
}

export function insideValley(x: number, z: number): boolean {
  return Math.abs(x) <= VALLEY_HALF_EXTENT && Math.abs(z) <= VALLEY_HALF_EXTENT;
}

/**
 * Where (x, z) falls on a crossing's strip: `t` is the place along it (0 at `from`, 1 at `to`) and `across` is the
 * distance (m) from its centre line.
 */
function stripFrame(x: number, z: number, c: LayoutCrossing): { t: number; across: number } {
  const dx = c.to.x - c.from.x;
  const dz = c.to.z - c.from.z;
  const len2 = dx * dx + dz * dz;
  const t = ((x - c.from.x) * dx + (z - c.from.z) * dz) / len2;
  const across = Math.abs((x - c.from.x) * dz - (z - c.from.z) * dx) / Math.sqrt(len2);
  return { t, across };
}

/** The walkable crossing whose strip holds (x, z), if any. The forge bridge is listed but not walkable yet. */
function crossingAt(x: number, z: number): LayoutCrossing | undefined {
  return VALLEY_CROSSINGS.find((c) => {
    if (c.walkable === false) return false;
    const { t, across } = stripFrame(x, z, c);
    return t >= 0 && t <= 1 && across <= c.width / 2;
  });
}

/** True on a walkable crossing's strip: the ford, the mill bridge and the stepping stones. */
export function isCrossing(x: number, z: number): boolean {
  return crossingAt(x, z) !== undefined;
}

/**
 * Height (m) the hero stands on at (x, z). On a bridge deck it is the deck, never below DECK_MIN, rising linearly
 * between the ground at the two ends. On stepping stones it is the stones' tops. Everywhere else, including the
 * ford bed the hero wades, it is the ground.
 */
export function walkSurfaceAt(x: number, z: number): number {
  const c = crossingAt(x, z);
  if (!c) return valleyHeightAt(x, z);
  if (c.surface === 'stones') return STONE_TOP;
  if (c.surface === 'deck') {
    const { t } = stripFrame(x, z, c);
    const along = valleyHeightAt(c.from.x, c.from.z) * (1 - t) + valleyHeightAt(c.to.x, c.to.z) * t;
    return Math.max(along, DECK_MIN);
  }
  return valleyHeightAt(x, z);
}

/** Water the hero cannot walk into: lake and river, except at a crossing. Swimming is a separate rule. */
export function blocksWalking(x: number, z: number): boolean {
  return isWater(x, z) && !isCrossing(x, z);
}

/**
 * What stops the hero in play: water (outside a crossing) and ground too steep to climb (MAX_WALK_SLOPE). The rim and
 * the gorge walls are walls by slope, not by radius.
 */
export function blocksHero(x: number, z: number): boolean {
  return onGateWall(x, z) || blocksWalking(x, z) || solidAt(valleySolids(), x, z)
    || (!isCrossing(x, z) && walkSlopeAt(x, z) >= MAX_WALK_SLOPE);
}

/** Half the side of the well's square footprint (m). The well is a ring of stone about 2.4 m across. */
export const WELL_HALF = 1.2;

/** Solid footprints in Wick: every house (9 m square, turned by its facing) and the well. Fences and gate posts are not solid. */
export const WICK_SOLIDS: readonly Footprint[] = [
  ...wickHouses(VALLEY_SEED).map((h) => ({ x: h.x, z: h.z, facing: h.facing, half: 4.5 })),
  ...WICK_THINGS.filter((t) => t.id === 'well').map((t) => ({ x: t.x, z: t.z, facing: 0, half: WELL_HALF })),
];

let landmarkFootprints: Footprint[] | undefined;
/**
 * The landmarks' buildings, walls and tents as footprints (review 026 item 1). Built on first use, not at import:
 * landmarks/plan.ts reads VALLEY_PLACES from this file, so the two modules import each other.
 * Babylon yaw is π − bearing, so the footprint's compass facing is π − yaw in degrees.
 */
function landmarkFootprintList(): Footprint[] {
  if (!landmarkFootprints) {
    landmarkFootprints = landmarkSolids().map((s) => ({
      x: s.x, z: s.z, facing: (((Math.PI - s.yaw) * 180) / Math.PI + 360) % 360, half: s.half,
    }));
  }
  return landmarkFootprints;
}

/** Every solid footprint in the valley: Wick's houses and well, then the landmarks. */
export function valleySolids(): readonly Footprint[] {
  return [...WICK_SOLIDS, ...landmarkFootprintList()];
}

/** Distance from (x, z) to the segment a-b. */
function distanceToSegment(x: number, z: number, a: LayoutPoint, b: LayoutPoint): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}

/**
 * Distance (m) from (x, z) to the nearer river centre line. The river in's first segment is the falls: a drop over
 * the west rim with no water on it, so it is not cut (GAME_DESIGN section 4, "Banks and beds").
 */
function riverDistance(x: number, z: number): number {
  let best = Infinity;
  for (let i = 1; i + 1 < VALLEY_RIVER_IN.length; i++) best = Math.min(best, distanceToSegment(x, z, VALLEY_RIVER_IN[i], VALLEY_RIVER_IN[i + 1]));
  for (let i = 0; i + 1 < VALLEY_RIVER_OUT.length; i++) best = Math.min(best, distanceToSegment(x, z, VALLEY_RIVER_OUT[i], VALLEY_RIVER_OUT[i + 1]));
  return best;
}

/** Bed height (m) at (x, z): RIVER_BED, lifted to FORD_BED around the ford so the crossing is 0.4 m of water. */
function riverBedAt(x: number, z: number): number {
  const ford = VALLEY_CROSSINGS.find((c) => c.name === 'ford');
  if (!ford) return RIVER_BED;
  const r = Math.hypot(x - ford.x, z - ford.z);
  const t = Math.max(0, Math.min(1, (FORD_FADE - r) / (FORD_FADE - FORD_FULL)));
  return RIVER_BED + (FORD_BED - RIVER_BED) * t * t * (3 - 2 * t);
}

function inOpenZone(x: number, z: number, zone: { x: number; z: number; radius: number }): boolean {
  return Math.hypot(x - zone.x, z - zone.z) < zone.radius;
}

/** Where (x, z) falls on the gate: `s` along the soldiers' road (m, 0 on the gate line, negative on the valley side) and `across` (m) from the road's centre line. */
export interface GateFrame {
  s: number;
  across: number;
}

interface GateLine {
  x: number;
  z: number;
  ux: number;
  uz: number;
}

/** The gate line: where the soldiers' road crosses GATE_RADIUS going outward, with the road's direction there. */
function buildGateLine(): GateLine {
  const road = VALLEY_ROADS.soldiers_road;
  for (let i = 0; i + 1 < road.length; i++) {
    const a = road[i];
    const b = road[i + 1];
    if (Math.hypot(a.x, a.z) >= GATE_RADIUS || Math.hypot(b.x, b.z) < GATE_RADIUS) continue;
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 60; k++) {
      const m = (lo + hi) / 2;
      if (Math.hypot(a.x + (b.x - a.x) * m, a.z + (b.z - a.z) * m) < GATE_RADIUS) lo = m;
      else hi = m;
    }
    const m = (lo + hi) / 2;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    return { x: a.x + (b.x - a.x) * m, z: a.z + (b.z - a.z) * m, ux: (b.x - a.x) / len, uz: (b.z - a.z) / len };
  }
  throw new Error(`soldiers_road does not cross r=${GATE_RADIUS}`);
}
const GATE = buildGateLine();

/** Where (x, z) falls on the gate's frame. */
export function gateFrameAt(x: number, z: number): GateFrame {
  const dx = x - GATE.x;
  const dz = z - GATE.z;
  return { s: dx * GATE.ux + dz * GATE.uz, across: Math.abs(dx * GATE.uz - dz * GATE.ux) };
}

/** The gate line: its centre (x, z) on the road and the road's unit direction (ux, uz) outward, for tests. */
export const GATE_LINE: Readonly<GateLine> = GATE;

/** The gate wall: across the road at the gate line, GATE_WALL_HALF thick. Walking and blocking both stop there. */
export function onGateWall(x: number, z: number): boolean {
  const f = gateFrameAt(x, z);
  return Math.abs(f.s) <= GATE_WALL_HALF && f.across <= GATE_HALF_WIDTH;
}

/** Beyond the gate line, outside the valley. Nothing on this side is walkable to reach it (the wall is across the road). */
export function beyondGate(x: number, z: number): boolean {
  return gateFrameAt(x, z).s > 0;
}

/**
 * The road's corridor through the rim on the valley side of the gate line: the one opening in the rim besides the
 * patrol hut. Only GATE_CORRIDOR_DEPTH m deep: the road is radial, so the gate frame's line runs on through the valley
 * centre and out the far side of the rim, and an unbounded corridor would open a second hole there.
 */
function inGateCorridor(x: number, z: number): boolean {
  const f = gateFrameAt(x, z);
  // The pass runs on behind the gate, so the gate stands in an opening between cliffs and not against a wall (review 025).
  return f.s <= GATE_PASS_BEYOND && f.s >= -GATE_CORRIDOR_DEPTH && f.across <= GATE_HALF_WIDTH;
}

/** The openings in the rim: the patrol hut's zone and the gate corridor. The rim is not lifted inside them. */
export function isRimOpening(x: number, z: number): boolean {
  return inOpenZone(x, z, PATROL_HUT_OPEN) || inGateCorridor(x, z);
}

/**
 * Rim height (m) at (x, z). The crest is the land plus RIM_RISE, capped at RIM_CAP. Across RIM_START..RIM_FULL the rim
 * climbs from its foot to the crest; the foot is the land, lowered if needed so the climb is at least RIM_STEP_MIN.
 * Beyond RIM_FULL it is the crest.
 */
function rimHeightAt(x: number, z: number): number {
  const land = heightSampler(x, z);
  const crest = Math.min(land + RIM_RISE, RIM_CAP);
  const t = Math.max(0, Math.min(1, (Math.hypot(x, z) - RIM_START) / (RIM_FULL - RIM_START)));
  const foot = Math.min(land, crest - RIM_STEP_MIN);
  return foot + (crest - foot) * t;
}

/**
 * The rim holds: beyond RIM_START the ground is the rim, so a river cut or a gorge wall cannot lower it into a walkable
 * way out, and the rim never rises above RIM_CAP. Not applied in the river channel (the water runs through) or in the openings.
 */
function rimTopAt(x: number, z: number): number {
  if (Math.hypot(x, z) < RIM_START || isRimOpening(x, z)) return -Infinity;
  return rimHeightAt(x, z);
}

function rimHold(h: number, x: number, z: number, riverD: number): number {
  if (Math.hypot(x, z) < RIM_START || riverD < GORGE_CHANNEL || isRimOpening(x, z)) return h;
  return rimHeightAt(x, z);
}

/** The gorge's centre line: the last GORGE_RUN m of the river out, cut at the right arc length. */
function buildGorge(): { a: LayoutPoint; b: LayoutPoint }[] {
  const pts = VALLEY_RIVER_OUT;
  const lens: number[] = [];
  for (let i = 0; i + 1 < pts.length; i++) lens.push(Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z));
  const total = lens.reduce((s, v) => s + v, 0);
  const start = Math.max(0, total - GORGE_RUN);
  const out: { a: LayoutPoint; b: LayoutPoint }[] = [];
  let acc = 0;
  for (let i = 0; i < lens.length; i++) {
    const s0 = acc;
    acc += lens[i];
    if (acc <= start) continue;
    const t = Math.max(0, (start - s0) / lens[i]);
    const a = { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, z: pts[i].z + (pts[i + 1].z - pts[i].z) * t };
    out.push({ a, b: pts[i + 1] });
  }
  return out;
}
const GORGE_SEGMENTS = buildGorge();

/** Distance (m) from (x, z) to the gorge's centre line. */
function gorgeDistance(x: number, z: number): number {
  let best = Infinity;
  GORGE_SEGMENTS.forEach((s, i) => {
    // Points upstream of the cut (before the first gorge segment's start) are not gorge: no cap-shaped walls.
    const dx = s.b.x - s.a.x;
    const dz = s.b.z - s.a.z;
    const u = ((x - s.a.x) * dx + (z - s.a.z) * dz) / (dx * dx + dz * dz);
    if (i === 0 && u < 0) return;
    best = Math.min(best, distanceToSegment(x, z, s.a, s.b));
  });
  return best;
}

/**
 * Gorge walls (GAME_DESIGN section 4): from the channel's bank the wall climbs to GORGE_WALL_TOP (a face steeper than
 * 0.7), stands on a plateau, and falls back to the land by GORGE_END. Where the gorge meets the rim its top is the rim,
 * so the walls there close the edge. `bank` is the channel's own bank; `land` is the ground off the gorge.
 */
function gorgeAdjust(bank: number, land: number, x: number, z: number): number {
  const d = gorgeDistance(x, z);
  if (d < GORGE_CHANNEL || d >= GORGE_END) return land;
  const top = Math.max(GORGE_WALL_TOP, rimTopAt(x, z));
  if (d < GORGE_WALL_TOP_AT) return bank + ((top - bank) * (d - GORGE_CHANNEL)) / (GORGE_WALL_TOP_AT - GORGE_CHANNEL);
  if (d < GORGE_PLATEAU_END) return top;
  const t = (d - GORGE_PLATEAU_END) / (GORGE_END - GORGE_PLATEAU_END);
  const s = t * t * (3 - 2 * t);
  return top + (land - top) * s;
}

/** True on the gorge: the walls and the channel between them (the last GORGE_RUN m of the river out). */
export function isGorge(x: number, z: number): boolean {
  return gorgeDistance(x, z) < GORGE_END;
}

/** Slope (rise over run) from ±1 m central differences: the walking rule's measure. */
export function walkSlopeAt(x: number, z: number): number {
  const dx = valleyHeightAt(x + 1, z) - valleyHeightAt(x - 1, z);
  const dz = valleyHeightAt(x, z + 1) - valleyHeightAt(x, z - 1);
  return Math.hypot(dx, dz) / 2;
}

/**
 * Ground the hero may walk on. Water is not ground (it is swum), river banks are walkable down to the water,
 * the rim is a climb too steep to make (its openings are the patrol hut's zone and the north-west pass), and the walk must be gentle.
 * The walkable crossings' strips are open (walkSurfaceAt gives their height); the forge bridge's strip is not.
 */
export function isWalkableGround(x: number, z: number): boolean {
  if (!insideValley(x, z) || onGateWall(x, z) || solidAt(valleySolids(), x, z)) return false;
  if (isCrossing(x, z)) return true;
  if (isWater(x, z)) return false;
  return walkSlopeAt(x, z) < MAX_WALK_SLOPE;
}

/**
 * Clearance of the straight sight line from a to b, eye heights included: the smallest gap (m) between the line
 * and the ground along it. Positive means the line clears the ground everywhere.
 */
export function sightMargin(
  a: { x: number; z: number },
  b: { x: number; z: number },
  eyeA: number,
  eyeB: number,
): number {
  const n = 500;
  const ya = valleyHeightAt(a.x, a.z) + eyeA;
  const yb = valleyHeightAt(b.x, b.z) + eyeB;
  let worst = Infinity;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const ground = valleyHeightAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
    worst = Math.min(worst, ya + (yb - ya) * t - ground);
  }
  return worst;
}
