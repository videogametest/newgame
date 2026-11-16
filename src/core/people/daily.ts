// Item 28: the people of Wick through the day (GAME_DESIGN.md section 9, "A daily life"; section 5, "The clock").
// Pure and deterministic: hour and saved households in, where everyone stands out. No engine imports.
// Wake at dawn and walk to work, work by day, gather at the well at dusk, walk home, indoors at night.
// Walks follow grid A* (src/core/world/pathfinding.ts) over Wick's walkable ground, so they go round houses, the
// well and the water. A window is lit only when its household is home, someone is indoors, and the clock allows.
import { TUNING } from '../../config/tuning';
import { CLOCK_DAY_TUNING } from '../world/clock';
import { buildWalkableCells, findPathCells, type WalkableCells } from '../world/pathfinding';
import { blocksHero, isWalkableGround, VALLEY_SEED } from '../world/valley';
import { bearingVector, WICK_GATES, WICK_THINGS, wickHouses, type House } from '../../village/plan';
import { HOUSEHOLDS, meetsTrigger, type HouseholdDef, type PeopleWorld, type Trigger } from './households';

export interface WickDay {
  household: string;
  /** A Wick plan "things" or "gates" id, or 'door' for the household's own door. */
  work: string;
  /** Stands at the door all day instead of walking to work and the well. */
  stays?: boolean;
}

/** Written members who are not drawn as walking villagers, and members drawn only once something is true. */
export const NOT_DRAWN: readonly string[] = ['Bracken']; // a sheepdog: no dog model in the CC0 packs used
export const DRAWN_ONLY_IF: Readonly<Record<string, Trigger>> = {
  // Tobin is the Pikes' son who joined Stane; he is in Wick only once won back.
  'Tobin Pike': { kind: 'bandit', id: 'tobin_pike', outcome: 'stayed' },
};

export type Activity = 'indoors' | 'standing' | 'walking' | 'working' | 'gathering';
export interface Villager {
  id: string;
  household: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  activity: Activity;
  /** False indoors: there are no interiors yet, so someone at home is simply not drawn. */
  visible: boolean;
}

type P = { x: number; z: number };
const HOUSES = wickHouses(VALLEY_SEED);
const houseOf = (d: HouseholdDef): House => {
  const h = HOUSES.find(x => x.id === d.houseId);
  if (!h) throw new Error(`No house ${d.houseId} in the Wick plan for ${d.id}`);
  return h;
};

// ---- The walking grid: Wick's box, 1 m cells, built once on first use. ----
export const WICK_GRID = { x0: 30, z0: 40, width: 150, depth: 95, cell: 1 } as const;
let cells: WalkableCells | undefined;
const centre = (i: number, j: number): P => ({ x: WICK_GRID.x0 + (i + 0.5) * WICK_GRID.cell, z: WICK_GRID.z0 + (j + 0.5) * WICK_GRID.cell });
/** Ground a villager may stand on: the hero's walk rule, solids and water included. */
export const villagerGround = (x: number, z: number): boolean => isWalkableGround(x, z) && !blocksHero(x, z);
function grid(): WalkableCells {
  return cells ??= buildWalkableCells({ width: WICK_GRID.width, depth: WICK_GRID.depth,
    isBlocked: (i, j) => { const c = centre(i, j); return !villagerGround(c.x, c.z); } });
}
const toCell = (p: P) => ({ x: Math.floor((p.x - WICK_GRID.x0) / WICK_GRID.cell), z: Math.floor((p.z - WICK_GRID.z0) / WICK_GRID.cell) });
const open = (g: WalkableCells, i: number, j: number) => i >= 0 && j >= 0 && i < g.width && j < g.depth && !g.blocked[j * g.width + i];

/** The nearest walkable cell centre to p (rings outward, fixed order), so every spot can be stood on. */
export function snap(p: P): P {
  const g = grid(); const c = toCell(p);
  for (let r = 0; r <= 12; r++)
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      if (open(g, c.x + di, c.z + dj)) return centre(c.x + di, c.z + dj);
    }
  throw new Error(`No walkable ground near ${p.x}, ${p.z}`);
}

const paths = new Map<string, P[]>();
/** A walk from a to b round solids and water. Falls back to nothing: unreachable pairs throw (tested). */
export function walkPath(a: P, b: P): P[] {
  const key = `${a.x},${a.z}>${b.x},${b.z}`;
  const known = paths.get(key); if (known) return known;
  const found = findPathCells(grid(), toCell(a), toCell(b));
  if (!found) throw new Error(`No walk in Wick from ${key}`);
  const pts = [a, ...found.slice(1, -1).map(c => centre(c.x, c.z)), b];
  paths.set(key, pts);
  return pts;
}
const lengthOf = (pts: readonly P[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.z - pts[i].z), 0);
function along(pts: readonly P[], d: number): { p: P; yaw: number } {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.z - a.z);
    if (d <= l || i === pts.length - 1) {
      const t = l > 0 ? Math.min(1, Math.max(0, d / l)) : 1;
      return { p: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
    }
    d -= l;
  }
  return { p: pts[pts.length - 1], yaw: 0 };
}

// ---- Spots ----
export function doorOf(d: HouseholdDef): P {
  const h = houseOf(d); const f = bearingVector(h.facing);
  return snap({ x: h.x + f.x * TUNING.wickPeople.doorStep, z: h.z + f.z * TUNING.wickPeople.doorStep });
}
function workOf(d: HouseholdDef, day: WickDay, index: number): P {
  if (day.work === 'door') {
    const h = houseOf(d); const f = bearingVector(h.facing); const r = { x: -f.z, z: f.x };
    const out = TUNING.wickPeople.doorStep + 1, side = (index - 0.5) * TUNING.wickPeople.spacing * 2;
    return snap({ x: h.x + f.x * out + r.x * side, z: h.z + f.z * out + r.z * side });
  }
  const spot = [...WICK_THINGS, ...WICK_GATES].find(s => s.id === day.work);
  if (!spot) throw new Error(`Unknown work spot ${day.work}`);
  return snap({ x: spot.x + index * TUNING.wickPeople.spacing, z: spot.z });
}
const WELL = WICK_THINGS.find(t => t.id === 'well')!;
function wellOf(slot: number): P {
  const a = slot * 2.399963; // golden angle: a ring of distinct places round the well
  const r = TUNING.wickPeople.wellRing;
  return snap({ x: WELL.x + Math.sin(a) * r, z: WELL.z + Math.cos(a) * r });
}

export interface Walker { id: string; def: HouseholdDef; day: WickDay; name: string; door: P; work: P; well: P }
let walkers: Walker[] | undefined;
/** Everyone who could ever be drawn, with their fixed spots. Written names only, never invented. */
export function allWalkers(plan: readonly WickDay[]): Walker[] {
  if (walkers && plan === lastPlan) return walkers;
  lastPlan = plan;
  const out: Walker[] = [];
  for (const day of plan) {
    const def = HOUSEHOLDS.find(d => d.id === day.household);
    if (!def) throw new Error(`Unknown household ${day.household}`);
    def.members.filter(m => !NOT_DRAWN.includes(m)).forEach((name, i) => {
      out.push({ id: `${def.id}:${i}`, def, day, name, door: doorOf(def), work: workOf(def, day, i), well: wellOf(out.length) });
    });
  }
  return walkers = out;
}
let lastPlan: readonly WickDay[] | undefined;

const within = (h: number, a: number, b: number) => (a > b ? h >= a || h < b : h >= a && h < b);
const metresPerHour = () => TUNING.wickPeople.walkSpeed * CLOCK_DAY_TUNING.realSecondsPerDay / 24;

function walk(from: P, to: P, hour: number, start: number, end: number): Pick<Villager, 'x' | 'z' | 'yaw' | 'activity'> {
  const pts = walkPath(from, to), len = lengthOf(pts);
  const span = end - start, needed = len / metresPerHour();
  const t = needed <= span ? (hour - start) / needed : (hour - start) / span;
  if (t >= 1) return { ...to, yaw: along(pts, len).yaw, activity: 'standing' };
  const at = along(pts, Math.max(0, t) * len);
  return { ...at.p, yaw: at.yaw, activity: 'walking' };
}
const facing = (from: P, to: P) => Math.atan2(to.x - from.x, to.z - from.z);

/** Where one walker is at this hour, and doing what. */
export function routine(w: Walker, hour: number): Omit<Villager, 'id' | 'household' | 'name'> {
  const T = TUNING.wickPeople, h = ((hour % 24) + 24) % 24;
  const doorYaw = facing(houseOf(w.def), w.door);
  if (within(h, T.home, T.wake)) return { ...w.door, yaw: doorYaw, activity: 'indoors', visible: false };
  if (w.day.stays) return { ...w.door, yaw: doorYaw, activity: 'standing', visible: true };
  if (h < T.atWork) return { ...walk(w.door, w.work, h, T.wake, T.atWork), visible: true };
  if (h < T.workEnd) return { ...w.work, yaw: doorYaw, activity: 'working', visible: true };
  if (h < T.atWell) return { ...walk(w.work, w.well, h, T.workEnd, T.atWell), visible: true };
  if (h < T.leaveWell) return { ...w.well, yaw: facing(w.well, WELL), activity: 'gathering', visible: true };
  return { ...walk(w.well, w.door, h, T.leaveWell, T.home), visible: true };
}

/** Present in Wick: home, or (Old Maren) never left. Members who need a condition (Tobin) wait for it. */
function present(w: Walker, world: PeopleWorld): boolean {
  const home = world.households.some(h => h.id === w.def.id && h.home);
  if (!home && !w.def.presentFromStart) return false;
  const cond = DRAWN_ONLY_IF[w.name];
  return !cond || meetsTrigger(cond, world);
}

/** Everyone in Wick at this hour. Only present people are returned; indoors they are returned but not visible. */
export function wickVillagers(world: PeopleWorld, hour: number, plan: readonly WickDay[]): Villager[] {
  return allWalkers(plan).filter(w => present(w, world)).map(w => ({ id: w.id, household: w.def.id, name: w.name, ...routine(w, hour) }));
}

/** Ids of the plan's houses whose window is lit now. Hesper's lamp keeps its existing gold-hour start, to dawn. */
export function litWindows(world: PeopleWorld, hour: number, plan: readonly WickDay[]): Set<string> {
  const T = TUNING.wickPeople, h = ((hour % 24) + 24) % 24;
  const inside = new Set(wickVillagers(world, h, plan).filter(v => v.activity === 'indoors').map(v => v.household));
  const out = new Set<string>();
  for (const d of HOUSEHOLDS) {
    if (d.villageId !== 'wick' || !world.households.some(x => x.id === d.id && x.home)) continue;
    if (d.id === 'hesper') { if (within(h, T.hesperFrom, T.wake)) out.add(d.houseId); continue; }
    if (inside.has(d.id) && within(h, T.windowsOn, T.windowsOff)) out.add(d.houseId);
  }
  return out;
}

/** Houses whose household is home: their window boards come down (doors and rooms are a later item). */
export function openHouses(world: PeopleWorld): Set<string> {
  return new Set(HOUSEHOLDS.filter(d => world.households.some(x => x.id === d.id && x.home)).map(d => d.houseId));
}
