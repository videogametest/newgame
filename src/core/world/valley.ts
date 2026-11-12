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
  type LayoutFeature,
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
/** Ground within this distance of a river's centre line is river bank, not walkable. */
const RIVER_CORRIDOR = 6;
/** Crossings open a walkable disc this wide, even where the river is water. */
const CROSSING_RADIUS = 11;
/** Steepest walkable slope (rise over run). */
const MAX_WALK_SLOPE = 0.7;

/** The river bed: overlapping depressions along a centre line. */
function riverBed(line: readonly LayoutPoint[], radius: number, height: number, step: number): LayoutFeature[] {
  const out: LayoutFeature[] = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i];
    const b = line[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / step));
    for (let k = 0; k < n; k++) {
      out.push({ x: Math.round(a.x + ((b.x - a.x) * k) / n), z: Math.round(a.z + ((b.z - a.z) * k) / n), radius, height });
    }
  }
  const last = line[line.length - 1];
  out.push({ x: last.x, z: last.z, radius, height });
  return out;
}

/** Tuned against the water-width test in valley.test.ts (8 to 12 m across, at several cross-sections). */
const RIVER_RADIUS = 10;
const RIVER_HEIGHT = -12;
const RIVER_STEP = 6;

export const VALLEY_SHAPE: TerrainShape = {
  baseHeight: VALLEY_BASE_HEIGHT,
  layers: VALLEY_LAYERS,
  features: [
    ...VALLEY_TERRAIN_FEATURES,
    ...riverBed(VALLEY_RIVER_IN, RIVER_RADIUS, RIVER_HEIGHT, RIVER_STEP),
    ...riverBed(VALLEY_RIVER_OUT, RIVER_RADIUS, RIVER_HEIGHT, RIVER_STEP),
  ],
};

const heightSampler = createHeightAt(VALLEY_SEED, VALLEY_SHAPE);

/** Ground height (m) at a valley point. Same answer for the same (x, z) on every call. */
export function valleyHeightAt(x: number, z: number): number {
  return heightSampler(x, z);
}

export function isWater(x: number, z: number): boolean {
  return valleyHeightAt(x, z) < WATER_LEVEL;
}

export function insideValley(x: number, z: number): boolean {
  return Math.abs(x) <= VALLEY_HALF_EXTENT && Math.abs(z) <= VALLEY_HALF_EXTENT;
}

/** True within a crossing's disc: the ford, the mill bridge and the stepping stones. */
export function isCrossing(x: number, z: number): boolean {
  return VALLEY_CROSSINGS.some((c) => Math.hypot(x - c.x, z - c.z) < CROSSING_RADIUS);
}

/** Water the hero cannot walk into: lake and river, except at a crossing. Swimming is a separate rule. */
export function blocksWalking(x: number, z: number): boolean {
  return isWater(x, z) && !isCrossing(x, z);
}

/** Distance from (x, z) to the segment a-b. */
function distanceToSegment(x: number, z: number, a: LayoutPoint, b: LayoutPoint): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}

function nearRiver(x: number, z: number): boolean {
  for (const line of [VALLEY_RIVER_IN, VALLEY_RIVER_OUT]) {
    for (let i = 0; i + 1 < line.length; i++) {
      if (distanceToSegment(x, z, line[i], line[i + 1]) < RIVER_CORRIDOR) return true;
    }
  }
  return false;
}

function inOpenZone(x: number, z: number, zone: { x: number; z: number; radius: number }): boolean {
  return Math.hypot(x - zone.x, z - zone.z) < zone.radius;
}

/** Slope (rise over run) from ±1 m central differences. */
function slopeAt(x: number, z: number): number {
  const dx = valleyHeightAt(x + 1, z) - valleyHeightAt(x - 1, z);
  const dz = valleyHeightAt(x, z + 1) - valleyHeightAt(x, z - 1);
  return Math.hypot(dx, dz) / 2;
}

/**
 * Ground the hero may walk on. Water is not ground (it is swum), the rivers have banks the hero does not walk,
 * the edge ring is closed except the patrol hut's zone and the north-west pass, and the walk must be gentle.
 * The three crossings are open.
 */
export function isWalkableGround(x: number, z: number): boolean {
  if (!insideValley(x, z)) return false;
  if (isCrossing(x, z)) return true;
  if (isWater(x, z)) return false;
  if (nearRiver(x, z)) return false;
  const r = Math.hypot(x, z);
  if (r > EDGE_RADIUS && !inOpenZone(x, z, PATROL_HUT_OPEN) && !inOpenZone(x, z, NW_PASS_OPEN)) return false;
  return slopeAt(x, z) < MAX_WALK_SLOPE;
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
