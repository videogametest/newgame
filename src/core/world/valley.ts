// Tallowmere: the first valley as data. Pure: no Babylon imports.
// The places, roads, rivers, edge and stops come from docs/tasks/003-layout/layout.json through the generated
// valley_layout.ts (do not edit that by hand). This file turns them into the terrain and the walking rules.

import { createHeightAt, type TerrainShape } from './terrain';
import {
  VALLEY_BASE_HEIGHT,
  VALLEY_CROSSINGS,
  VALLEY_LAYERS,
  VALLEY_PLACES as LAYOUT_PLACES,
  VALLEY_RIVER_IN,
  VALLEY_RIVER_OUT,
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
/** The north-west pass, where the soldiers' road leaves the valley. */
const NW_PASS_OPEN = { x: -250, z: -262, radius: 40 };
/** Steepest walkable slope (rise over run). */
const MAX_WALK_SLOPE = 0.7;
/** The rim: ground rises by RIM_RISE across the band RIM_START..RIM_FULL, a 1.25 slope, so the edge is land the hero cannot climb. */
const RIM_START = EDGE_RADIUS - 5;
const RIM_FULL = EDGE_RADIUS + 3;
const RIM_RISE = 10;
/** The gorge: the last GORGE_RUN m of river out. Channel within GORGE_CHANNEL of the centre line; walls rise to WALL_TOP. */
const GORGE_RUN = 100;
const GORGE_CHANNEL = 5;
const GORGE_WALL_TOP_AT = 10;
const GORGE_PLATEAU_END = 25;
const GORGE_END = 35;
const GORGE_WALL_TOP = WATER_LEVEL + 15;
/** Stepping stones: their tops sit this far above the water (design section 4, "The crossings"). */
const STONE_TOP = WATER_LEVEL + 0.3;
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
  const d = riverDistance(x, z);
  const bank = Math.min(heightSampler(x, z), riverBedAt(x, z) + RIVER_BANK_SLOPE * d);
  return gorgeAdjust(bank, rimHold(bank, x, z, d), x, z);
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
  return blocksWalking(x, z) || (!isCrossing(x, z) && walkSlopeAt(x, z) >= MAX_WALK_SLOPE);
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

/** The openings in the rim: the patrol hut's zone and the north-west pass. The rim is not lifted inside them. */
function inOpening(x: number, z: number): boolean {
  return inOpenZone(x, z, PATROL_HUT_OPEN) || inOpenZone(x, z, NW_PASS_OPEN);
}

/** Rim height (m) at (x, z): the land's own height, lifted by RIM_RISE across the band RIM_START..RIM_FULL. */
function rimHeightAt(x: number, z: number): number {
  const t = Math.max(0, Math.min(1, (Math.hypot(x, z) - RIM_START) / (RIM_FULL - RIM_START)));
  return heightSampler(x, z) + RIM_RISE * t;
}

/**
 * The rim holds: beyond RIM_START the ground is never lower than the rim, so a river cut or a gorge wall cannot
 * lower it into a walkable way out. Not applied in the river channel (the water runs through) or in the openings.
 */
function rimTopAt(x: number, z: number): number {
  if (Math.hypot(x, z) < RIM_START || inOpening(x, z)) return -Infinity;
  return rimHeightAt(x, z);
}

function rimHold(h: number, x: number, z: number, riverD: number): number {
  if (Math.hypot(x, z) < RIM_START || riverD < GORGE_CHANNEL || inOpening(x, z)) return h;
  return Math.max(h, rimHeightAt(x, z));
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
  if (!insideValley(x, z)) return false;
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
