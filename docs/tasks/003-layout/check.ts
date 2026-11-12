// Claude's prototype for docs/tasks/003-layout.md. It proves the arrangement (sight lines, the 100 m rule, what is highest),
// not the final land. Run from the repo root: CELL=2 npx vite-node docs/tasks/003-layout/check.ts
// DUMP=<file> writes everything, with a height grid, as JSON. GREEDY=<metres> proposes extra stops for any gap.
import { createHeightAt, type TerrainShape } from '../../../src/core/world/terrain';
import { longestStopGap } from '../../../src/core/world/walk_gap';
import { readFileSync, writeFileSync } from 'node:fs';
const WATER = 2;
type F = { x: number; z: number; radius: number; height: number };
const chain = (pts: [number, number][], radius: number, height: number, step = 14): F[] => {
  const out: F[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 0; k < n; k++) out.push({ x: Math.round(ax + (bx - ax) * k / n), z: Math.round(az + (bz - az) * k / n), radius, height });
  }
  const [lx, lz] = pts[pts.length - 1]; out.push({ x: lx, z: lz, radius, height });
  return out;
};
// ---- the layout (x east, -z north) ----
export const P: Record<string, { x: number; z: number }> = {
  lake: { x: 0, z: 0 },
  wick: { x: 64, z: 72 },
  hesper: { x: 86, z: 98 },
  start: { x: 226, z: 238 },
  castle: { x: -296, z: -388 },
  mill: { x: -172, z: 62 },
  forge: { x: 38, z: -176 },
  watch_house: { x: -170, z: -192 },
  signal_hill: { x: -78, z: -296 },
  patrol_hut: { x: 322, z: -112 },
    waterfall: { x: -282, z: 14 },
  orchard: { x: 196, z: -118 },
  practice: { x: -52, z: 222 },
  grove: { x: -226, z: 188 },
  fisher: { x: -74, z: -62 },
  soldiers_road: { x: -226, z: -238 },
};
const INFLOW: [number, number][] = [[-330, -30], [-292, -18], [-250, 0], [-215, 22], [-178, 40], [-140, 30], [-100, 14]];
const OUTFLOW: [number, number][] = [[95, -8], [142, -12], [190, 14], [240, 48], [300, 70], [360, 90], [400, 100]];
const RIDGE: [number, number][] = [[250, -250], [254, -190], [256, -130], [252, -70], [246, -15]];
const rim: F[] = [];
for (let a = 0; a < 360; a += 15) {
  const rad = a * Math.PI / 180; // a=0 east, 90 south
  const skip = (a === 345 || a === 0);
  if (!skip) rim.push({ x: Math.round(400 * Math.cos(rad)), z: Math.round(400 * Math.sin(rad)), radius: 125, height: 30 });
}
export const SHAPE: TerrainShape = {
  baseHeight: 12,
  layers: [{ wavelength: 140, amplitude: 5 }, { wavelength: 60, amplitude: 2.5 }, { wavelength: 18, amplitude: 0.8 }],
  features: [
    { x: 0, z: 0, radius: 110, height: -22 },
    ...rim,
    // signal hill, the highest ground
    { x: P.signal_hill.x, z: P.signal_hill.z, radius: 95, height: 46 },
    // east ridge
    ...chain(RIDGE, 60, 17, 30),
    // the start's shoulder: a spur that looks down on Wick
    { x: 236, z: 250, radius: 90, height: 9 },
    // screens: rises that hide places from Wick and from paths
    { x: -70, z: 96, radius: 60, height: 17 },   // the split oak rise, hides the Mill
    { x: 30, z: -118, radius: 50, height: 12 },  // north shore knoll, hides the Forge
    { x: -118, z: -124, radius: 70, height: 20 }, // hides the Watch-house from the lake
    { x: -150, z: 170, radius: 70, height: 14 }, // forest hill between practice ground and grove
    { x: 150, z: -70, radius: 45, height: 10 },  // hides the orchard from the east road
    // rivers
    ...chain(INFLOW, 20, -14, 12),
    ...chain(OUTFLOW, 20, -14, 12),
    { x: P.castle.x, z: P.castle.z, radius: 90, height: 26 },
    { x: 326, z: -112, radius: 55, height: -6 },
    // the waterfall's upper pool and step
    { x: -322, z: -34, radius: 40, height: 12 },
  ],
};
export const h = createHeightAt(1066, SHAPE);
const isWater = (x: number, z: number) => h(x, z) < WATER;
const slope = (x: number, z: number) => Math.hypot(h(x + 1, z) - h(x - 1, z), h(x, z + 1) - h(x, z - 1)) / 2;
export const CROSSINGS = [{ name: 'ford', x: 142, z: -12 }, { name: 'mill_bridge', x: -178, z: 40 }, { name: 'stepping_stones', x: -250, z: 0 }];
function segDist(x: number, z: number, a: [number, number], b: [number, number]) { const dx = b[0] - a[0], dz = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
export const ROADS: Record<string, [number, number][]> = {
  road_in: [[226, 238], [176, 186], [124, 132], [88, 106]],
  mill_road: [[50, 86], [10, 118], [-40, 140], [-96, 146], [-140, 104], [-172, 62]],
  east_road: [[78, 52], [112, 22], [142, -12], [124, -68], [88, -128], [38, -176]],
  soldiers_road: [[124, -68], [70, -98], [0, -104], [-60, -112], [-104, -168], [-170, -192], [-226, -238], [-262, -276]],
  hill_path: [[-104, -168], [-96, -236], [-78, -296]],
  ridge_path: [[124, -68], [160, -112], [196, -118], [254, -100], [322, -112]],
  forest_path: [[-40, 140], [-52, 222], [-150, 250], [-226, 188]],
  falls_path: [[-172, 62], [-230, 40], [-282, 14]],
};
const SIGNPOSTS = [{ name: 'sign_wick_gate', x: 50, z: 86 }, { name: 'sign_split_oak', x: -40, z: 140 }, { name: 'sign_ford', x: 124, z: -68 }, { name: 'sign_hill_foot', x: -104, z: -168 }];
const BOUND_R = Number(process.env.BOUND ?? 335);
export const walkable = (x: number, z: number) => {
  // Ground only: water is swum (design v33), and the 100 m rule is measured on ground.
  for (const c of CROSSINGS) if (Math.hypot(x - c.x, z - c.z) < 11) return true;
  if (isWater(x, z)) return false;
  for (const line of [INFLOW, OUTFLOW]) for (let i = 0; i + 1 < line.length; i++) if (segDist(x, z, line[i], line[i + 1]) < 6) return false;
  const r = Math.hypot(x, z);
  if (r > BOUND_R && !(Math.hypot(x - P.patrol_hut.x, z - P.patrol_hut.z) < 60) && !(Math.hypot(x + 250, z + 262) < 40)) return false;
  return slope(x, z) < 0.7;
};
function sight(a: { x: number; z: number }, b: { x: number; z: number }, ea: number, eb: number) {
  const n = 500, ya = h(a.x, a.z) + ea, yb = h(b.x, b.z) + eb; let worst = 1e9;
  for (let i = 1; i < n; i++) { const t = i / n; worst = Math.min(worst, ya + (yb - ya) * t - h(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)); }
  return worst; // positive = clear by that many metres
}
for (const [k, v] of Object.entries(P)) console.log(k.padEnd(14), String(v.x).padStart(5), String(v.z).padStart(5), 'h', h(v.x, v.z).toFixed(1).padStart(6), isWater(v.x, v.z) ? 'WATER' : '', 'slope', slope(v.x, v.z).toFixed(2), 'r', Math.hypot(v.x, v.z).toFixed(0));
const d = (a: string, b: string) => Math.hypot(P[a].x - P[b].x, P[a].z - P[b].z).toFixed(0);
console.log('start->hesper', d('start', 'hesper'), 'clear', sight(P.start, P.hesper, 2, 2).toFixed(1), '| start->castle top(+35)', sight(P.start, P.castle, 2, 35).toFixed(1));
console.log('hidden from Wick (negative = hidden by ground): mill', sight(P.wick, P.mill, 2, 9).toFixed(1), 'forge', sight(P.wick, P.forge, 2, 9).toFixed(1), 'watch', sight(P.wick, P.watch_house, 2, 14).toFixed(1));
console.log('hut: castle', sight(P.patrol_hut, P.castle, 2, 35).toFixed(1), 'signal hill', sight(P.patrol_hut, P.signal_hill, 2, 4).toFixed(1));
console.log('signal hill: castle', sight(P.signal_hill, P.castle, 2, 35).toFixed(1), 'watch-house', sight(P.signal_hill, P.watch_house, 2, 3).toFixed(1), 'wick sees hill top', sight(P.wick, P.signal_hill, 2, 4).toFixed(1));
let max = -1e9, at = [0, 0]; for (let x = -400; x <= 400; x += 4) for (let z = -400; z <= 400; z += 4) { const y = h(x, z); if (y > max) { max = y; at = [x, z]; } }
console.log('highest', max.toFixed(1), at, 'signal', h(P.signal_hill.x, P.signal_hill.z).toFixed(1));
const stopsEnv = process.env.STOPS ? JSON.parse(process.env.STOPS) : [];
const stops = [...Object.entries(P).filter(([k]) => !['lake', 'castle'].includes(k)).map(([name, v]) => ({ name, ...v })), ...stopsEnv, ...SIGNPOSTS, ...JSON.parse(readFileSync(process.env.MINOR ?? 'docs/tasks/003-layout/layout.json', 'utf8')).stops];
for (const [k, line] of Object.entries(ROADS)) { let ms = 0, wet = 0, len = 0; for (let i = 0; i + 1 < line.length; i++) { const L = Math.hypot(line[i + 1][0] - line[i][0], line[i + 1][1] - line[i][1]); len += L; for (let t = 0; t <= 1; t += 2 / L) { const x = line[i][0] + (line[i + 1][0] - line[i][0]) * t, z = line[i][1] + (line[i + 1][1] - line[i][1]) * t; const g = Math.abs(h(x + (line[i + 1][0] - line[i][0]) / L, z + (line[i + 1][1] - line[i][1]) / L) - h(x, z)); ms = Math.max(ms, g); if (!walkable(x, z)) wet++; } } console.log('road', k.padEnd(14), 'length', len.toFixed(0), 'steepest grade', ms.toFixed(2), 'blocked samples', wet); }
let extra: any[] = [];
if (process.env.GREEDY) { for (let i = 0; i < 60; i++) { const r = longestStopGap({ cell: 4, halfExtent: 400, walkable, stops: [...stops, ...extra], start: P.start }); if (r.longest <= Number(process.env.GREEDY)) break; extra.push({ name: 'x' + i, x: r.at!.x, z: r.at!.z }); }
  for (const e of extra) { const n = stops.map(s => ({ n: s.name, d: Math.hypot(s.x - e.x, s.z - e.z) })).sort((a, b) => a.d - b.d)[0]; console.log('G', e.x, e.z, 'h', h(e.x, e.z).toFixed(0), 'near', n.n, n.d.toFixed(0)); } stops.push(...extra); }
const rep = longestStopGap({ cell: Number(process.env.CELL ?? 4), halfExtent: 400, walkable, stops, start: P.start });
console.log('stops', stops.length, 'gap', rep.longest.toFixed(0), rep.at, 'cells', rep.reachableCells, 'stranded', rep.stranded);
// ascii map
let map = '';
for (let z = -400; z <= 400; z += 16) { let row = ''; for (let x = -400; x <= 400; x += 8) {
  const s = stops.find(s => Math.abs(s.x - x) <= 4 && Math.abs(s.z - z) <= 8);
  row += s ? s.name[0].toUpperCase() : isWater(x, z) ? '~' : !walkable(x, z) ? '#' : h(x, z) > 30 ? '^' : h(x, z) > 18 ? '+' : '.'; } map += row + '\n'; }
console.log(map);
if (process.env.DUMP) writeFileSync(process.env.DUMP, JSON.stringify({ P, stops, ROADS, CROSSINGS, INFLOW, OUTFLOW, RIDGE, SHAPE, grid: (() => { const g: number[][] = []; for (let z = -400; z <= 400; z += 4) { const row: number[] = []; for (let x = -400; x <= 400; x += 4) row.push(isWater(x, z) ? -1 : walkable(x, z) ? Math.round(h(x, z)) : -2 - Math.round(h(x,z))/1000); g.push(row); } return g; })() }));
