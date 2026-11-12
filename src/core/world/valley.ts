// Tallowmere: the first valley's terrain as data. Pure: no Babylon imports.
// Layout is provisional. GAME_DESIGN §4 fixes the features (lake at the centre, Wick beside the lake,
// ridge between the patrol hut and the castle, signal hill highest); the exact metres below are our
// first placement and are tuned by eye in the valley view.

import { createHeightAt, type TerrainShape } from './terrain';

export const VALLEY_SEED = 1066;
/** The valley is about 800 m across, centred on the origin. */
export const VALLEY_HALF_EXTENT = 400;
/** Water surface height (m). Ground below it is lake or river. */
export const WATER_LEVEL = 2;

/** Named places in metres (x, z). Data, so the scene and tests read one list. */
export const VALLEY_PLACES = {
  lakeCentre: { x: 0, z: 0 },
  /** Village beside the lake's south-west shore. */
  wick: { x: -60, z: 50 },
  /** The valley's highest point. Sees over the ridge to the castle. */
  signalHill: { x: 240, z: -210 },
  /** The ridge runs between these two. */
  ridgeCrest: { x: 190, z: -300 },
  /** South of the ridge, out of sight of the castle. */
  patrolHut: { x: 120, z: -230 },
  /** North of the ridge, visible from the signal hill only. */
  castle: { x: 250, z: -400 },
  /** Where the hero starts: the valley's south-east edge. */
  start: { x: 300, z: 320 },
} as const;

export const VALLEY_SHAPE: TerrainShape = {
  baseHeight: 12,
  layers: [
    { wavelength: 140, amplitude: 6 },
    { wavelength: 60, amplitude: 3 },
    { wavelength: 18, amplitude: 1 },
  ],
  features: [
    // The lake: a broad basin at the centre.
    { x: 0, z: 0, radius: 110, height: -22 },
    // Hills and forest ground around the edge.
    { x: -190, z: 150, radius: 110, height: 26 },
    { x: 170, z: 130, radius: 95, height: 22 },
    { x: -260, z: -120, radius: 120, height: 24 },
    // The ridge between the patrol hut and the castle, a row of overlapping rises.
    { x: 120, z: -300, radius: 75, height: 26 },
    { x: 190, z: -300, radius: 75, height: 28 },
    { x: 260, z: -300, radius: 75, height: 26 },
    // The castle's rise, north of the ridge.
    { x: 250, z: -400, radius: 70, height: 16 },
    // The signal hill: the highest feature, higher than the ridge.
    { x: 240, z: -210, radius: 90, height: 40 },
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

/** Ground the hero may stand on: inside the valley and not in the lake or river. */
export function isWalkableGround(x: number, z: number): boolean {
  return insideValley(x, z) && !isWater(x, z);
}

/**
 * Points worth stopping for (GAME_DESIGN §4, review 015). Only places that exist in the data are listed
 * here; secrets, chests, campfires, signs and road junctions join this list as they are placed.
 * Excluded on purpose: lakeCentre (water) and castle (a horizon landmark on the valley edge, seen from afar).
 */
export const VALLEY_STOPS: ReadonlyArray<{ name: string; x: number; z: number }> = [
  { name: 'wick', ...VALLEY_PLACES.wick },
  { name: 'signalHill', ...VALLEY_PLACES.signalHill },
  { name: 'ridgeCrest', ...VALLEY_PLACES.ridgeCrest },
  { name: 'patrolHut', ...VALLEY_PLACES.patrolHut },
  { name: 'start', ...VALLEY_PLACES.start },
];
