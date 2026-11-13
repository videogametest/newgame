// Overnight item 9: where the valley's trees and rocks stand. Pure data and placement, no Babylon.
// Scenery is drawn only; it does not block walking, so the walk gap and sight lines are unaffected.
// Keep-outs keep scenery off roads, crossings, places, houses, Wick's box and Hesper's sight line.
import { bearingVector, wickHouses, WICK_LANES } from '../../village/plan';
import { SHELF_TUNING } from '../../village/shelf';
import { VALLEY_SEED, VALLEY_PLACES, insideValley, valleyHeightAt, WATER_LEVEL } from './valley';
import { VALLEY_CROSSINGS, VALLEY_ROADS } from './valley_layout';
import { chunkAt, chunkKey, type ChunkCoord } from './chunks';
import { scatterChunk, type ExclusionZone, type ScatterPlacement, type ScatterRule } from './scatter';

export const SCENERY_CHUNK = 200;
/** Chunks cover the valley's square (±400 m) in 200 m bands. */
export const SCENERY_CHUNKS: readonly ChunkCoord[] = [-2, -1, 0, 1].flatMap(x => [-2, -1, 0, 1].map(z => ({ x, z })));

/** Lake floor below this height is 'floor'; ground above it is 'high', 'slope' or 'rim'. */
export const FLOOR_TOP = 16;
/** The valley rim begins this far from the centre. */
export const RIM_RADIUS = 300;
/** A slope where height rises by more than this per metre toward +z. */
export const SLOPE_GRADIENT = 0.03;

export const SCENERY_BIOMES = ['water', 'floor', 'slope', 'rim', 'high'] as const;
export type SceneryBiome = (typeof SCENERY_BIOMES)[number];

export const SCENERY_MODELS = ['tree_single_A', 'tree_single_B', 'trees_A_medium', 'trees_B_large', 'rock_single_B'] as const;
export type SceneryModel = (typeof SCENERY_MODELS)[number];

export interface SceneryRule extends ScatterRule {
  model: SceneryModel;
}

/** Native heights are about 1.1 m for trees and 0.13 m for the rock, so these scales give roughly 12 m trees (review 012). */
export const SCENERY_RULES: readonly SceneryRule[] = [
  { id: 'pine_thick', model: 'trees_A_medium', kind: 'tree', salt: 101, attempts: 40, biomes: ['rim', 'slope'], scale: [10, 13], clearance: 3 },
  { id: 'tree_rim', model: 'tree_single_A', kind: 'tree', salt: 102, attempts: 12, biomes: ['rim', 'slope'], scale: [10, 13], clearance: 3 },
  { id: 'oak_high', model: 'trees_B_large', kind: 'tree', salt: 103, attempts: 24, biomes: ['high'], scale: [10, 13], clearance: 3 },
  { id: 'sapling_floor', model: 'tree_single_B', kind: 'tree', salt: 104, attempts: 6, biomes: ['floor'], scale: [9, 12], clearance: 3 },
  { id: 'rock', model: 'rock_single_B', kind: 'rock', salt: 105, attempts: 10, biomes: ['rim', 'slope', 'high'], scale: [6, 10], clearance: 2 },
];

export interface ScenerySpot extends ScatterPlacement {
  model: SceneryModel;
}

/** The biome of a ground point. Water is checked first, so the lake never gets scenery. */
export function sceneryBiomeAt(x: number, z: number): SceneryBiome {
  const h = valleyHeightAt(x, z);
  if (h < WATER_LEVEL + 0.5) return 'water';
  if (h < FLOOR_TOP) return 'floor';
  if (Math.hypot(x, z) >= RIM_RADIUS) return 'rim';
  const dhdz = (valleyHeightAt(x, z + 1) - valleyHeightAt(x, z - 1)) / 2;
  return dhdz > SLOPE_GRADIENT ? 'slope' : 'high';
}

/** Hesper's lit window pane sits 2.5 m out (OPENINGS.home_A.window.out in village/build.ts) plus the 0.05 m the builder adds. */
const HESPER_PANE_OUT = 2.5 + 0.05;

/** The sight line from the arrival point to Hesper's window: scenery stays 12 m off it (docs/tasks/003-wick.md rule 6). */
export function hesperSightLine(): { from: { x: number; z: number }; to: { x: number; z: number } } {
  const hesper = wickHouses(VALLEY_SEED).find(h => h.id === 'hesper');
  if (!hesper) throw new Error('Hesper is missing from the Wick layout');
  const v = bearingVector(hesper.window);
  return { from: VALLEY_PLACES.start, to: { x: hesper.x + v.x * HESPER_PANE_OUT, z: hesper.z + v.z * HESPER_PANE_OUT } };
}

const SIGHT_HALF_WIDTH = 12;
/** Review 024 item 4: the last 150 m of the arrival line keeps scenery 25 m off, so no tree hides Wick's first view. */
export const SIGHT_NEAR_LENGTH = 150;
export const SIGHT_NEAR_HALF_WIDTH = 25;

/** The last SIGHT_NEAR_LENGTH metres of the sight line, ending at Hesper's window. */
export function hesperSightNearLine(): { from: { x: number; z: number }; to: { x: number; z: number } } {
  const sight = hesperSightLine();
  const dx = sight.to.x - sight.from.x, dz = sight.to.z - sight.from.z;
  const len = Math.hypot(dx, dz);
  const t = Math.max(0, (len - SIGHT_NEAR_LENGTH) / len);
  return { from: { x: sight.from.x + dx * t, z: sight.from.z + dz * t }, to: sight.to };
}
const ROAD_HALF_WIDTH = 4;
const LANE_HALF_WIDTH = 3;
const PLACE_RADIUS = 14;
const HOUSE_RADIUS = 8;
/** Keep-out radius (m) round the three landmark places that are built up (review 026 item 3). */
export const LANDMARK_CLEAR = { mill: 30, forge: 30, watchHouse: 26 } as const;

/** Everything scenery must stay clear of, built from the layout and Wick data. */
export function sceneryKeepOuts(): ExclusionZone[] {
  const zones: ExclusionZone[] = [];
  for (const pts of Object.values(VALLEY_ROADS)) {
    for (let i = 0; i + 1 < pts.length; i++) zones.push({ kind: 'road', from: pts[i], to: pts[i + 1], halfWidth: ROAD_HALF_WIDTH });
  }
  for (const c of VALLEY_CROSSINGS) {
    zones.push({ kind: 'road', from: c.from, to: c.to, halfWidth: c.width / 2 + 2 });
  }
  for (const pts of Object.values(WICK_LANES)) {
    for (let i = 0; i + 1 < pts.length; i++) {
      zones.push({ kind: 'road', from: { x: pts[i][0], z: pts[i][1] }, to: { x: pts[i + 1][0], z: pts[i + 1][1] }, halfWidth: LANE_HALF_WIDTH });
    }
  }
  for (const p of Object.values(VALLEY_PLACES)) zones.push({ kind: 'circle', centre: { x: p.x, z: p.z }, radius: PLACE_RADIUS });
  for (const h of wickHouses(VALLEY_SEED)) zones.push({ kind: 'circle', centre: { x: h.x, z: h.z }, radius: HOUSE_RADIUS });
  // Review 026 item 3: no scenery within 30 m of the Mill or the Forge, or in the Watch-house yard (its 40 m by 32 m
  // yard fits inside a 26 m circle, the yard's half-diagonal rounded up).
  zones.push({ kind: 'circle', centre: { x: VALLEY_PLACES.mill.x, z: VALLEY_PLACES.mill.z }, radius: LANDMARK_CLEAR.mill });
  zones.push({ kind: 'circle', centre: { x: VALLEY_PLACES.forge.x, z: VALLEY_PLACES.forge.z }, radius: LANDMARK_CLEAR.forge });
  zones.push({ kind: 'circle', centre: { x: VALLEY_PLACES.watchHouse.x, z: VALLEY_PLACES.watchHouse.z }, radius: LANDMARK_CLEAR.watchHouse });
  const box = SHELF_TUNING.box;
  zones.push({ kind: 'rectangle', minX: box.x0, minZ: box.z0, maxX: box.x1, maxZ: box.z1 });
  const sight = hesperSightLine();
  zones.push({ kind: 'road', from: sight.from, to: sight.to, halfWidth: SIGHT_HALF_WIDTH });
  const near = hesperSightNearLine();
  zones.push({ kind: 'road', from: near.from, to: near.to, halfWidth: SIGHT_NEAR_HALF_WIDTH });
  return zones;
}

/** Every scenery placement in the valley, deterministic from the seed. Load order has no effect. */
export function sceneryPlacements(zones: readonly ExclusionZone[] = sceneryKeepOuts()): ScenerySpot[] {
  const modelOf = new Map(SCENERY_RULES.map(r => [r.id, r.model] as const));
  const spots: ScenerySpot[] = [];
  for (const chunk of SCENERY_CHUNKS) {
    for (const p of scatterChunk(VALLEY_SEED, chunk, SCENERY_CHUNK, SCENERY_RULES, zones, sceneryBiomeAt, valleyHeightAt)) {
      if (!insideValley(p.x, p.z)) continue;
      spots.push({ ...p, model: modelOf.get(p.ruleId)! });
    }
  }
  return spots;
}

/** Number of draw calls scenery adds: one thin-instance mesh per model per chunk band that has any. */
export function sceneryBands(spots: readonly ScenerySpot[]): number {
  return new Set(spots.map(s => `${chunkKey(chunkAt(s, SCENERY_CHUNK))}:${s.model}`)).size;
}
