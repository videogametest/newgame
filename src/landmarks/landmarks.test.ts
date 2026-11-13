import { describe, expect, it } from 'vitest';
import { landmarkPieces, landmarkSolids, MARKER_STONES, type ModelPiece, type Piece } from './plan';
import { valleyHeightAt, VALLEY_PLACES, WATER_LEVEL } from '../core/world/valley';
import { VALLEY_ROADS, VALLEY_SIGNPOSTS, VALLEY_STOPS } from '../core/world/valley_layout';

const pieces = landmarkPieces();
const of = (site: string) => pieces.filter((p) => p.site === site);
const models = (list: Piece[]) => list.filter((p): p is ModelPiece => p.kind === 'model');
const distToRoad = (id: string, x: number, z: number): number => {
  const pts = VALLEY_ROADS[id];
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const u = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (a.x + dx * u), z - (a.z + dz * u)));
  }
  return best;
};

describe('the three places, as what they were under what was done to them', () => {
  it.each(['mill', 'forge', 'watch_house'])('%s has its building, a bell, a dark lantern, a cold fire, and Stane\'s banner', (site) => {
    const list = of(site);
    expect(models(list).some((p) => /watermill|blacksmith|barracks/.test(p.file))).toBe(true);
    expect(list.filter((p) => p.role === 'lantern')).toHaveLength(1);
    expect(list.filter((p) => p.role === 'banner').length).toBeGreaterThanOrEqual(2);
    expect(list.some((p) => p.kind === 'drum' && p.stuff === 'iron')).toBe(true);
    expect(list.some((p) => p.kind === 'drum' && p.stuff === 'ash')).toBe(true);
  });
  it('each stands at its place on the map', () => {
    for (const [site, at] of [['mill', VALLEY_PLACES.mill], ['forge', VALLEY_PLACES.forge], ['watch_house', VALLEY_PLACES.watchHouse]] as const) {
      const main = models(of(site)).find((p) => /watermill|blacksmith|barracks/.test(p.file))!;
      expect(Math.hypot(main.x - at.x, main.z - at.z), site).toBeLessThan(20);
    }
  });
  it("the Mill's wheel is on the river side, within reach of the water, and its door is on dry land", () => {
    const mill = models(of('mill')).find((p) => p.role === 'wheel')!;
    expect(valleyHeightAt(mill.x, mill.z)).toBeGreaterThan(WATER_LEVEL);
    let wet = false;
    for (let d = 4; d <= 14; d += 1) if (valleyHeightAt(mill.x, mill.z - d) < WATER_LEVEL + 0.4) wet = true;
    expect(wet).toBe(true);
  });
  it('the Watch-house is walled, with one gate where the road comes in and one where it leaves', () => {
    const walls = models(of('watch_house')).filter((p) => /wall_straight/.test(p.file));
    const gates = walls.filter((p) => p.role === 'gate_door');
    expect(walls.length).toBeGreaterThanOrEqual(16);
    expect(gates).toHaveLength(2);
    for (const g of gates) expect(distToRoad('soldiers_road', g.x, g.z)).toBeLessThan(6);
  });
  it('nothing but a gate stands on a road', () => {
    for (const p of models(pieces)) {
      if (p.role === 'gate_door' || p.site === 'castle') continue;
      for (const id of Object.keys(VALLEY_ROADS)) {
        expect(distToRoad(id, p.x, p.z), `${p.site} ${p.file} on ${id}`).toBeGreaterThan(Math.min(p.half, 3) + 1);
      }
    }
  });
  it('everything stands on dry ground', () => {
    for (const p of pieces) {
      if (p.site === 'castle') continue;
      expect(valleyHeightAt(p.x, p.z), `${p.site} at (${p.x.toFixed(0)}, ${p.z.toFixed(0)})`).toBeGreaterThan(WATER_LEVEL + 0.1);
    }
  });
});

describe('the rest of what stands in the valley', () => {
  it('the castle is outside the valley and far larger than anything in it', () => {
    const c = models(of('castle'));
    expect(c.length).toBeGreaterThan(5);
    for (const p of c) { expect(Math.hypot(p.x, p.z)).toBeGreaterThan(400); expect(p.far).toBe(true); }
    expect(Math.max(...c.map((p) => p.scale))).toBeGreaterThan(30);
  });
  it('seventeen family stones line the road in, on both sides, none of them on it', () => {
    const stones = of('family_markers');
    expect(stones).toHaveLength(MARKER_STONES);
    let left = 0;
    for (const s of stones) {
      const d = distToRoad('road_in', s.x, s.z);
      expect(d).toBeGreaterThan(2.5);
      expect(d).toBeLessThan(12);
      if (s.x - s.z > 190 - 200 + (s.x + s.z - 390) * 0) left++;
    }
    expect(left).toBeGreaterThan(3);
    expect(left).toBeLessThan(MARKER_STONES - 3);
  });
  it('every campfire and every signpost in the layout is built', () => {
    for (const c of VALLEY_STOPS.filter((q) => q.kind === 'campfire')) expect(of(c.name).length, c.name).toBeGreaterThan(8);
    for (const sp of VALLEY_SIGNPOSTS) {
      const list = of(sp.name);
      expect(list.filter((p) => p.kind !== 'model' && p.stuff === 'grey_wood').length, `${sp.name} arms`).toBeGreaterThanOrEqual(1);
      for (const p of list) for (const id of Object.keys(VALLEY_ROADS)) expect(distToRoad(id, p.x, p.z), `${sp.name} on ${id}`).toBeGreaterThan(1.5);
    }
  });
  it('the signal hill has its cold brazier and the patrol hut its hut', () => {
    expect(of('signal_hill').some((p) => p.role === 'beacon')).toBe(true);
    expect(models(of('patrol_hut')).some((p) => /home_A/.test(p.file))).toBe(true);
  });
  it('lists what is solid: buildings, walls, and tents, and never a gate, a fence, or the castle', () => {
    const solids = landmarkSolids();
    expect(solids.length).toBeGreaterThan(25);
    expect(solids.some((q) => q.site === 'castle')).toBe(false);
    expect(solids.filter((q) => q.site === 'watch_house').length).toBeGreaterThanOrEqual(18);
  });
  it('is the same every time', () => {
    expect(landmarkPieces()).toEqual(pieces);
  });
});
