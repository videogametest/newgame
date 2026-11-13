// What stands in the valley besides Wick (GAME_DESIGN.md sections 4 and 9). Claude's. Pure: no engine imports.
// The Mill, the Forge, and the Watch-house as the places they were under what Stane's people have done to them;
// the castle on the horizon; the patrol hut; the cold brazier on the signal hill; the family stones on the road
// in; the campfires; the signposts. Every piece is placed from the layout's own points, so nothing here can drift
// from the roads and rivers it belongs beside.
import { VALLEY_PLACES } from '../core/world/valley';
import { VALLEY_ROADS, VALLEY_SIGNPOSTS, VALLEY_STOPS } from '../core/world/valley_layout';
import { chance } from '../village/plan';

export type PlaceId = 'mill' | 'forge' | 'watch_house';
/** What a piece does when its place changes hands. */
export type Role = 'banner' | 'lantern' | 'wheel' | 'forge_fire' | 'gate_door' | 'beacon';
export type Stuff = 'wood' | 'grey_wood' | 'stone' | 'dark_stone' | 'iron' | 'coal' | 'canvas' | 'straw' | 'ash';

interface Common { site: string; x: number; z: number; /** Babylon yaw, radians. */ yaw: number; role?: Role }
export interface ModelPiece extends Common {
  kind: 'model';
  /** Path under the KayKit hexagon pack, without extension. */
  file: string;
  scale: number;
  /** Metres to sink below the ground at its centre, so it never floats on a slope. */
  sink?: number;
  /** Where the model's own geometry is centred, in its own units, if not at its origin. */
  pivot?: readonly [number, number];
  /** Darkened and never lit by lamps: for the castle, which is a shape on the horizon. */
  far?: boolean;
  /** The half-size of its footprint on the ground, metres, for keeping roads clear of it. */
  half: number;
}
export interface BoxPiece extends Common {
  kind: 'box' | 'drum' | 'mound';
  stuff: Stuff;
  /** Width (or diameter), height, depth. */
  w: number; h: number; d: number;
  /** Height of its base above the ground at its centre. */
  lift?: number;
  tilt?: number; roll?: number;
}
export type Piece = ModelPiece | BoxPiece;

/** Buildings at 9.6, as in Wick (review 024). */
export const BUILDING = 9.6;
const WALL = 4;      // a wall section: 8 m long, 4.4 m high
const FENCE = 2.6;   // a fence panel: 3 m long, 1.3 m high
const SEED = 1066;

/** A place's own frame: `f` runs out of its front, `r` to the right of someone standing inside looking out. */
interface Frame { x: number; z: number; bearing: number }
const frame = (x: number, z: number, bearing: number): Frame => ({ x, z, bearing });
const at = (fr: Frame, r: number, f: number): { x: number; z: number } => {
  const b = (fr.bearing * Math.PI) / 180;
  const fx = Math.sin(b), fz = -Math.cos(b);
  return { x: fr.x + fx * f - fz * r, z: fr.z + fz * f + fx * r };
};
/** Babylon yaw for a model whose front looks along +z to look along a bearing given relative to the frame's front. */
const yaw = (fr: Frame, turn = 0): number => Math.PI - ((fr.bearing + turn) * Math.PI) / 180;
const bearingOf = (dx: number, dz: number): number => ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;

class Site {
  readonly pieces: Piece[] = [];
  constructor(readonly id: string, readonly fr: Frame) {}
  model(file: string, r: number, f: number, scale: number, half: number, o: Partial<ModelPiece> & { turn?: number } = {}): this {
    const p = at(this.fr, r, f);
    this.pieces.push({ kind: 'model', site: this.id, file, x: p.x, z: p.z, yaw: yaw(this.fr, o.turn ?? 0), scale, half, ...o });
    return this;
  }
  box(stuff: Stuff, r: number, f: number, w: number, h: number, d: number, o: Partial<BoxPiece> & { turn?: number; kind?: BoxPiece['kind'] } = {}): this {
    const p = at(this.fr, r, f);
    this.pieces.push({ kind: o.kind ?? 'box', site: this.id, stuff, x: p.x, z: p.z, yaw: yaw(this.fr, o.turn ?? 0), w, h, d, ...o });
    return this;
  }
  /** A bell on a post: every held place has one (section 5, "The alarm bell"). */
  bell(r: number, f: number): this {
    return this.box('wood', r - 0.9, f, 0.3, 3.4, 0.3).box('wood', r + 0.9, f, 0.3, 3.4, 0.3).box('wood', r, f, 2.4, 0.26, 0.3, { lift: 3.3 })
      .box('iron', r, f, 0.9, 0.9, 0.9, { kind: 'drum', lift: 2.3 });
  }
  /** The place's lantern: unlit until the place is freed (section 9, "The lantern ritual"). */
  lantern(r: number, f: number): this {
    return this.box('wood', r, f, 0.24, 2.6, 0.24).box('wood', r + 0.45, f, 1.0, 0.16, 0.16, { lift: 2.45 })
      .box('iron', r + 0.85, f, 0.42, 0.56, 0.42, { lift: 1.82, role: 'lantern' });
  }
  /** Stane's banner on a pole: it comes down when the place is freed. */
  banner(r: number, f: number, turn = 0): this {
    return this.box('grey_wood', r, f, 0.2, 6, 0.2).model('props/flag_red', r, f, 13, 0.3, { sink: -3.2, turn, role: 'banner' });
  }
  /** A run of timber fence, panel by panel, with every `gapEvery`-th panel missing. */
  fence(r0: number, f0: number, r1: number, f1: number, key: string, gapEvery = 0): this {
    const len = Math.hypot(r1 - r0, f1 - f0), n = Math.max(1, Math.round(len / 3));
    const turn = bearingOf(r1 - r0, -(f1 - f0)); // panels run along z in their own space
    for (let k = 0; k < n; k++) {
      if (gapEvery && k % gapEvery === gapEvery - 1) continue;
      const t = (k + 0.5) / n;
      const lean = (chance(SEED, `${this.id}:${key}:${k}`) - 0.5) * 8;
      this.model('buildings/fence_wood_straight', r0 + (r1 - r0) * t, f0 + (f1 - f0) * t, FENCE, 1.5, { turn: turn + lean, pivot: [-1, 0] });
    }
    return this;
  }
  /** A cold fire: a ring of stones, burnt logs, ash, and a log to sit on. */
  campfire(r: number, f: number): this {
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; this.box('stone', r + Math.cos(a) * 0.9, f + Math.sin(a) * 0.9, 0.42, 0.3, 0.36, { turn: k * 47 }); }
    this.box('ash', r, f, 1.3, 0.08, 1.3, { kind: 'drum' });
    this.box('coal', r - 0.2, f, 1.1, 0.16, 0.18, { turn: 30, lift: 0.06 }).box('coal', r + 0.15, f + 0.1, 1.0, 0.16, 0.18, { turn: 100, lift: 0.1 });
    return this.box('grey_wood', r + 0.4, f - 2.2, 2.4, 0.42, 0.45, { turn: 8 });
  }
}

function mill(): Piece[] {
  // The marker is on the bank. The yard is south of it; the wheel is on the river side.
  const m = VALLEY_PLACES.mill;
  const s = new Site('mill', frame(m.x, m.z + 10, 0));
  // West of where the road reaches the bank, so the road runs past its door to the water.
  s.model('buildings/building_watermill_red', -9, 3, BUILDING, 5.5, { sink: 0.3, role: 'wheel' });
  s.model('buildings/building_grain', -19, -9, 5, 5, { turn: 20 });
  // The camp, east of the road.
  s.model('props/tent', 26, -13, 7, 2, { turn: 290 }).model('props/tent', 31, -7, 7, 2, { turn: 250 }).model('props/tent', 24, -19, 7, 2, { turn: 330 });
  s.campfire(25, -7);
  // Bran's woodpile, where he sleeps through his watch.
  s.model('props/resource_lumber', -8, -9, 4, 1.5, { turn: 10 }).model('props/resource_lumber', -10.6, -8.2, 3.6, 1.5, { turn: 95 }).box('grey_wood', -6, -10.4, 0.9, 0.75, 0.9);
  // The goose pen, by the water.
  s.fence(15, 6, 21, 6, 'pen_a').fence(21, 6, 21, 0, 'pen_b').fence(21, 0, 15, 0, 'pen_c').fence(15, 0, 15, 6, 'pen_d', 2);
  s.model('props/bucket_water', 16.2, 4.6, 3.2, 0.5).box('straw', 18.5, 2.5, 2.6, 0.18, 2.2, { kind: 'drum' });
  // The yard's fence on the landward side, broken where the road comes in.
  s.fence(-22, -18, 4, -18, 'yard_s', 5).fence(-22, -18, -22, 4, 'yard_w', 4);
  s.bell(4, -10).lantern(4.5, -3).banner(-16, 6, 90).banner(9, -18, 0);
  s.model('props/sack', -2.6, 2.2, 3.2, 0.5).model('props/sack', -1.6, 3, 3.2, 0.5, { turn: 60 }).model('props/crate_A_big', -4, -3.4, 3.2, 0.5).model('props/barrel', -5.2, -2.8, 3.2, 0.5)
    .model('props/wheelbarrow', -2, -1, 3.2, 0.8, { turn: 140 }).model('props/weaponrack', -3, -12, 5, 0.6, { turn: 180 });
  return s.pieces;
}

function forge(): Piece[] {
  const p = VALLEY_PLACES.forge, road = VALLEY_ROADS.east_road, from = road[road.length - 2];
  const s = new Site('forge', frame(p.x, p.z, bearingOf(from.x - p.x, from.z - p.z)));
  s.model('buildings/building_blacksmith_red', 0, -11, BUILDING, 6.5, { role: 'forge_fire' });
  // The strongroom: a low stone store with one door. Hob Tarn sleeps across its step.
  s.box('stone', -15, -12, 5.4, 2.6, 4.4).box('dark_stone', -15, -12, 6, 0.4, 5, { lift: 2.6 }).box('wood', -15, -9.75, 1.2, 1.9, 0.14).box('stone', -15, -9.2, 2, 0.3, 1);
  // The coal heap behind, and the hatch at the back wall that Hob does not fit through.
  s.box('coal', 6, -19, 5, 1.5, 4, { kind: 'mound' }).box('coal', 9, -17.5, 2.6, 0.8, 2.4, { kind: 'mound' }).box('grey_wood', 2, -17.6, 1.1, 0.12, 0.9, { lift: 0.05, tilt: 0.25 });
  // The anvil outside, where Dunmore uses the smith's hammer badly.
  s.box('grey_wood', 7, -3, 0.9, 0.7, 0.9, { kind: 'drum' }).box('iron', 7, -3, 0.9, 0.3, 0.36, { lift: 0.7 }).box('iron', 7.5, -3, 0.5, 0.16, 0.2, { lift: 0.84 });
  s.model('props/weaponrack', 10, -6, 5, 0.6, { turn: 270 }).model('props/weaponrack', 10, -8.4, 5, 0.6, { turn: 270 }).model('props/resource_stone', -6, -3, 3.2, 0.7).model('props/crate_long_A', 4.5, -5.6, 3.2, 0.6, { turn: 15 });
  s.model('props/tent', -8, 6, 7, 2, { turn: 150 }).model('props/tent', -13, 1, 7, 2, { turn: 110 });
  s.campfire(-7, 0);
  // The east fence, where Tobin stands every evening. Third rail from the gate is loose.
  const east = (((90 - s.fr.bearing) % 360) + 360) % 360 < 180 ? 1 : -1;
  s.fence(east * 20, 8, east * 20, -22, 'east', 0);
  s.box('grey_wood', east * 20, 3.5, 2.9, 0.1, 0.07, { lift: 0.45, turn: 90, roll: 0.3 });
  s.fence(-east * 20, 8, -east * 20, -22, 'west', 4).fence(-20, -22, 20, -22, 'back', 5);
  s.bell(3, 3).lantern(-3, 5).banner(-5, -4, 0).banner(9, 9, 30);
  return s.pieces;
}

/** The Watch-house's yard: 40 m across its front and 32 m deep, with the soldiers' road running through it. */
export const WATCH_YARD = { halfWidth: 20, halfDepth: 16 } as const;

function watchHouse(): Piece[] {
  const p = VALLEY_PLACES.watchHouse, road = VALLEY_ROADS.soldiers_road;
  const i = road.findIndex((q) => q.x === p.x && q.z === p.z);
  const before = road[i - 1], after = road[i + 1];
  const s = new Site('watch_house', frame(p.x, p.z, bearingOf(before.x - p.x, before.z - p.z)));
  const { halfWidth: W, halfDepth: D } = WATCH_YARD;
  // Where the road leaves through the back wall, in the yard's own frame.
  const b = (s.fr.bearing * Math.PI) / 180, fx = Math.sin(b), fz = -Math.cos(b);
  const ox = after.x - p.x, oz = after.z - p.z;
  const of = ox * fx + oz * fz, or = -ox * fz + oz * fx;
  const backGate = Math.max(-W + 8, Math.min(W - 8, Math.round(((or * -D) / of) / 8) * 8));
  const wall = (r: number, f: number, turn: number, gate: boolean) =>
    s.model(gate ? 'buildings/wall_straight_gate' : 'buildings/wall_straight', r, f, WALL, 4, { turn, role: gate ? 'gate_door' : undefined });
  // The front wall, with its gate in the middle where the road comes in.
  for (const r of [-16, -8, 8, 16]) wall(r, D, 0, false);
  wall(0, D, 0, true);
  for (const r of [-16, -8, 0, 8, 16]) wall(r, -D, 180, r === backGate);
  for (let f = -D + 4; f < D; f += 8) { wall(-W, f, 270, false); wall(W, f, 90, false); }
  // The tower at the front corner, and the house the guard ate in, its supper table still set.
  s.model('buildings/building_tower_A_red', -W + 1, D - 1, BUILDING, 5.5, { turn: 0 });
  s.model('buildings/building_barracks_red', 9, -5, BUILDING * 0.85, 6.5, { turn: -90 });
  s.model('props/tent', -10, -8, 7, 2, { turn: 60 }).model('props/tent', -14, -2, 7, 2, { turn: 90 }).model('props/tent', -9, 3, 7, 2, { turn: 120 });
  s.model('props/target', -15, 9, 6, 0.8, { turn: 90 }).model('props/target', -15, 6, 6, 0.8, { turn: 90 }).model('props/weaponrack', 14, 9, 5, 0.6, { turn: 180 }).model('props/weaponrack', 11.6, 9, 5, 0.6, { turn: 180 })
    .model('props/crate_long_B', 15, 4, 3.2, 0.7, { turn: 80 }).model('props/barrel', 16, 1.6, 3.2, 0.5).model('props/barrel', 15, 0.8, 3.2, 0.5).model('props/bucket_arrows', -13.4, 11, 3.2, 0.4);
  s.campfire(-6, -3);
  s.bell(5, 5).lantern(4.5, D + 3).banner(-5.5, D + 1.5, 0).banner(5.5, D + 1.5, 0).banner(-W + 1, D - 7, 0);
  return s.pieces;
}

function castle(): Piece[] {
  // A shape on the horizon, never reached: large, dark, and lit by nothing. Its beacon is cold.
  const c = VALLEY_PLACES.castle;
  const s = new Site('castle', frame(c.x, c.z, bearingOf(-c.x, -c.z)));
  const K = 30;
  const far = { far: true } as const;
  s.model('buildings/building_tower_A_red', 0, -6, K * 1.5, 22, { ...far, sink: 4 });
  s.model('buildings/building_tower_A_red', -42, 8, K, 15, { ...far, sink: 4 }).model('buildings/building_tower_A_red', 42, 8, K, 15, { ...far, sink: 4 });
  s.model('buildings/building_barracks_red', 0, 14, K * 1.1, 24, { ...far, sink: 3 });
  for (const r of [-28, -14, 0, 14, 28]) s.model('buildings/wall_straight', r, 26, 7, 7, { ...far, sink: 2 });
  return s.pieces;
}

function patrolHut(): Piece[] {
  const p = VALLEY_PLACES.patrolHut;
  const s = new Site('patrol_hut', frame(p.x, p.z, 250));
  // The path ends at its door: the hut stands just beyond.
  s.model('buildings/building_home_A_red', 0, -8, BUILDING * 0.8, 4);
  s.model('props/resource_lumber', 6, -7, 3.2, 1.2, { turn: 80 }).model('props/barrel', -4.5, -5, 3.2, 0.5).model('props/weaponrack', 4, -3.6, 5, 0.6, { turn: 0 });
  s.campfire(9, 1);
  s.banner(-6, -2, 0);
  return s.pieces;
}

function signalHill(): Piece[] {
  // The relay brazier: an iron bowl on a ring of dressed stone, cold since the army left.
  const p = VALLEY_PLACES.signalHill;
  const s = new Site('signal_hill', frame(p.x, p.z, 0));
  s.box('stone', 0, 0, 3.4, 0.6, 3.4, { kind: 'drum' }).box('dark_stone', 0, 0, 2.4, 0.5, 2.4, { kind: 'drum', lift: 0.6 });
  for (const [r, f] of [[0.8, 0.8], [-0.8, 0.8], [0.8, -0.8], [-0.8, -0.8]]) s.box('iron', r, f, 0.14, 1.2, 0.14, { lift: 1.1 });
  s.box('iron', 0, 0, 2.2, 0.5, 2.2, { kind: 'drum', lift: 2.2, role: 'beacon' }).box('coal', 0, 0, 1.7, 0.3, 1.7, { kind: 'mound', lift: 2.6 });
  return s.pieces;
}

/** Sixteen stones and the Fairlow stone, along the road in. One for each family that left. */
export const MARKER_STONES = 17;
function familyStones(): Piece[] {
  const stop = VALLEY_STOPS.find((q) => q.name === 'family_markers');
  const a = { x: 190, z: 200 }, b = { x: 110, z: 124 };
  const s = new Site('family_markers', frame(stop?.x ?? 150, stop?.z ?? 158, bearingOf(b.x - a.x, b.z - a.z)));
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  for (let k = 0; k < MARKER_STONES; k++) {
    const last = k === MARKER_STONES - 1;
    // Sixteen at an even pace, alternating sides. The Fairlow stone stands a little apart, nearest Wick, and leans.
    const f = -len / 2 + (len * 0.86 * k) / (MARKER_STONES - 2) + (last ? len * 0.06 : 0);
    const side = (k % 2 ? 1 : -1) * (5 + chance(SEED, `stone:r:${k}`) * 1.4) + (last ? -2.4 : 0);
    const h = 0.8 + chance(SEED, `stone:h:${k}`) * 0.45;
    s.box('stone', side, f, 0.52, h, 0.22, { turn: (chance(SEED, `stone:t:${k}`) - 0.5) * 30, lift: -0.12, roll: last ? 0.22 : (chance(SEED, `stone:l:${k}`) - 0.5) * 0.12 });
  }
  return s.pieces;
}

function campfires(): Piece[] {
  return VALLEY_STOPS.filter((q) => q.kind === 'campfire').flatMap((q) => new Site(q.name, frame(q.x, q.z, 0)).campfire(0, 0).pieces);
}

function signposts(): Piece[] {
  // A post where roads meet, with an arm pointing down each road that leaves it.
  return VALLEY_SIGNPOSTS.flatMap((sp) => {
    const s = new Site(sp.name, frame(sp.x, sp.z, 0));
    // Beside the junction, on whichever side is furthest from every road.
    let best = { r: 3.4, f: 3.4, clear: -1 };
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, r = Math.cos(a) * 4.6, f = Math.sin(a) * 4.6, q = at(s.fr, r, f);
      let clear = Infinity;
      for (const pts of Object.values(VALLEY_ROADS)) for (let i = 0; i + 1 < pts.length; i++) {
        const dx = pts[i + 1].x - pts[i].x, dz = pts[i + 1].z - pts[i].z;
        const u = Math.min(1, Math.max(0, ((q.x - pts[i].x) * dx + (q.z - pts[i].z) * dz) / (dx * dx + dz * dz)));
        clear = Math.min(clear, Math.hypot(q.x - (pts[i].x + dx * u), q.z - (pts[i].z + dz * u)));
      }
      if (clear > best.clear) best = { r, f, clear };
    }
    const p = at(s.fr, best.r, best.f);
    s.box('wood', best.r, best.f, 0.22, 2.9, 0.22);
    let arm = 0;
    for (const pts of Object.values(VALLEY_ROADS)) {
      pts.forEach((q, i) => {
        if (Math.hypot(q.x - sp.x, q.z - sp.z) > 1.5) return;
        for (const n of [pts[i - 1], pts[i + 1]]) {
          if (!n || arm >= 4) continue;
          const turn = bearingOf(n.x - q.x, n.z - q.z) + 90;
          const dir = at(frame(p.x, p.z, turn - 90), 0, 0.75);
          s.pieces.push({ kind: 'box', site: sp.name, stuff: 'grey_wood', x: dir.x, z: dir.z, yaw: Math.PI - (turn * Math.PI) / 180, w: 1.5, h: 0.3, d: 0.06, lift: 2.5 - arm * 0.36 });
          arm++;
        }
      });
    }
    return s.pieces;
  });
}

/** Every piece in the valley outside Wick. */
export function landmarkPieces(): Piece[] {
  return [...mill(), ...forge(), ...watchHouse(), ...castle(), ...patrolHut(), ...signalHill(), ...familyStones(), ...campfires(), ...signposts()];
}

export const PLACE_SITES: Readonly<Record<PlaceId, string>> = { mill: 'mill', forge: 'forge', watch_house: 'watch_house' };

/**
 * What the hero cannot walk through: every building, wall, and tent, as a square of its footprint turned as it
 * stands. Gates are left out (their doors are a matter for the place's state), as are fences, which have gaps
 * meant to be used, and the castle, which is never reached.
 */
export function landmarkSolids(): { site: string; x: number; z: number; half: number; yaw: number }[] {
  return landmarkPieces()
    .filter((p): p is ModelPiece => p.kind === 'model' && !p.far && p.role !== 'gate_door' && p.role !== 'banner' && /^buildings\/(building_|wall_straight$)|props\/tent/.test(p.file))
    .map((p) => ({ site: p.site, x: p.x, z: p.z, half: /wall_straight/.test(p.file) ? 4 : p.half * 0.8, yaw: p.yaw }));
}
