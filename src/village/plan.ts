// Wick, house by house (docs/tasks/003-wick.md). Claude's. Pure: no engine imports. Reads the plan's data and
// decides, from the seed, exactly where each house stands and how it is turned, so the village is never a grid
// and is the same every time.
import wick from '../../docs/tasks/003-layout/wick.json';

export type HouseState = 'lit' | 'dark' | 'boarded' | 'roofless';
export type RoofColour = 'blue' | 'green' | 'red' | 'yellow';
export interface House {
  id: string;
  who: string;
  x: number;
  z: number;
  /** Compass bearing the door looks toward, in degrees: 0 north (-z), 90 east (+x). */
  facing: number;
  /** Compass bearing the window that will be lit looks toward. */
  window: number;
  model: 'home_A' | 'home_B' | 'destroyed';
  colour: RoofColour;
  state: HouseState;
}
export interface Spot { id: string; x: number; z: number }

export const WICK_TUNING = {
  /** Rule 1: each house is turned up to this many degrees and shifted up to this many metres, from the seed. */
  maxTurn: 12,
  maxShift: 2,
  /** Hesper's house is not moved: her window and the arrival line were measured from the plan. */
  fixed: ['hesper'] as readonly string[],
} as const;

const COLOURS: readonly RoofColour[] = ['blue', 'green', 'red', 'yellow'];

/** A small, stable hash to a number in [0, 1). */
export function chance(seed: number, key: string): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < key.length; i++) { h = Math.imul(h ^ key.charCodeAt(i), 0x01000193) >>> 0; h ^= h >>> 13; }
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

const stateOf = (raw: string): HouseState =>
  raw.startsWith('open, lit') ? 'lit' : raw.startsWith('lived in') ? 'dark' : raw.startsWith('roofless') ? 'roofless' : 'boarded';

/** Every building in Wick as it stands at the start of the game. */
export function wickHouses(seed: number): House[] {
  const out: House[] = [];
  for (const b of wick.buildings) {
    const fixed = WICK_TUNING.fixed.includes(b.id);
    const turn = fixed ? 0 : (chance(seed, `${b.id}:turn`) * 2 - 1) * WICK_TUNING.maxTurn;
    const angle = chance(seed, `${b.id}:dir`) * Math.PI * 2;
    const far = fixed ? 0 : chance(seed, `${b.id}:far`) * WICK_TUNING.maxShift;
    const state = stateOf(b.state);
    out.push({
      id: b.id, who: b.who,
      x: b.x + Math.cos(angle) * far, z: b.z + Math.sin(angle) * far,
      facing: (b.facing + turn + 360) % 360, window: (b.window + turn + 360) % 360,
      model: state === 'roofless' ? 'destroyed' : b.model === 'home_B' ? 'home_B' : 'home_A',
      colour: 'blue', state,
    });
  }
  // Rule 2: neighbours differ. Each house takes, from the seed, a colour none of its three nearest already has.
  for (const h of out) {
    const near = out.filter(o => o !== h).sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z)).slice(0, 3);
    const taken = new Set(near.filter(o => out.indexOf(o) < out.indexOf(h)).map(o => o.colour));
    const free = COLOURS.filter(c => !taken.has(c));
    h.colour = free[Math.floor(chance(seed, `${h.id}:colour`) * free.length)];
  }
  return out;
}

export const WICK_GATES: readonly Spot[] = wick.gates.map(g => ({ id: g.id, x: g.x, z: g.z }));
export const WICK_THINGS: readonly Spot[] = wick.things.map(t => ({ id: t.id, x: t.x, z: t.z }));
export const WICK_LANES: Readonly<Record<string, readonly (readonly [number, number])[]>> =
  Object.fromEntries(Object.entries(wick.lanes).map(([k, pts]) => [k, (pts as number[][]).map(p => [p[0], p[1]] as const)]));

/** The unit vector a compass bearing points along, on the ground. */
export const bearingVector = (bearing: number): { x: number; z: number } => {
  const r = (bearing * Math.PI) / 180;
  return { x: Math.sin(r), z: -Math.cos(r) };
};

/**
 * The scarecrow in Hesper's yard: the dark figure in the brightness picture (design section "Brightness"), and the
 * thing the hero creeps up on and marks on the first evening (task 010 step 4). In view from the `hesper_door` stop.
 */
export const SCARECROW = { x: 85.8, z: 107.3, height: 1.9 } as const;
