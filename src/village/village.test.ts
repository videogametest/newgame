import { describe, expect, it } from 'vitest';
import wick from '../../docs/tasks/003-layout/wick.json';
import { bearingVector, WICK_GATES, WICK_THINGS, WICK_TUNING, wickHouses } from './plan';
import { shelfTarget, shoreDistance, withWickShelf } from './shelf';
import { valleyHeightAt, VALLEY_PLACES, WATER_LEVEL } from '../core/world/valley';

const SEED = 1066;
const houses = wickHouses(SEED);
const ground = withWickShelf(valleyHeightAt, WATER_LEVEL);
const FOOT = wick.plot.house_footprint / 2;

describe('Wick, house by house (docs/tasks/003-wick.md)', () => {
  it('seventeen windows and an inn', () => {
    expect(houses).toHaveLength(18);
    expect(houses.filter(h => h.state !== 'roofless')).toHaveLength(17);
    expect(houses.filter(h => h.state === 'lit').map(h => h.id)).toEqual(['hesper']);
    expect(houses.filter(h => h.state === 'dark').map(h => h.id)).toEqual(['old_maren']);
    expect(houses.find(h => h.id === 'inn')).toMatchObject({ state: 'roofless', model: 'destroyed' });
    expect(houses.filter(h => h.state === 'boarded')).toHaveLength(15);
  });
  it('is not a grid: every house but Hesper is turned and shifted, within the rule, and the same every time', () => {
    for (const h of houses) {
      const plan = wick.buildings.find(b => b.id === h.id)!;
      const shift = Math.hypot(h.x - plan.x, h.z - plan.z);
      const turn = Math.abs(((h.facing - plan.facing + 540) % 360) - 180);
      expect(shift, h.id).toBeLessThanOrEqual(WICK_TUNING.maxShift + 1e-9);
      expect(turn, h.id).toBeLessThanOrEqual(WICK_TUNING.maxTurn + 1e-9);
      if (h.id === 'hesper') { expect(shift).toBe(0); expect(turn).toBe(0); }
    }
    const turns = new Set(houses.map(h => Math.round(h.facing * 10)));
    expect(turns.size).toBeGreaterThan(12);
    expect(wickHouses(SEED)).toEqual(houses);
    expect(wickHouses(SEED + 1)).not.toEqual(houses);
  });
  it('neighbours differ: no house shares a roof colour with its nearest neighbour, and all four colours are used', () => {
    for (const h of houses) {
      const nearest = houses.filter(o => o !== h).sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0];
      const pair = [h, nearest].sort((a, b) => houses.indexOf(a) - houses.indexOf(b));
      if (houses.filter(o => o !== pair[1]).sort((a, b) => Math.hypot(a.x - pair[1].x, a.z - pair[1].z) - Math.hypot(b.x - pair[1].x, b.z - pair[1].z)).slice(0, 3).includes(pair[0])) {
        expect(pair[0].colour, `${pair[0].id} and ${pair[1].id}`).not.toBe(pair[1].colour);
      }
    }
    expect(new Set(houses.map(h => h.colour)).size).toBe(4);
  });
  it('no two houses touch after they are moved', () => {
    for (const a of houses) for (const b of houses) if (a.id < b.id) expect(Math.hypot(a.x - b.x, a.z - b.z), `${a.id}, ${b.id}`).toBeGreaterThan(wick.plot.house_footprint + 1);
  });
  it("Hesper's window looks up the road in, toward the start", () => {
    const h = houses.find(o => o.id === 'hesper')!;
    const v = bearingVector(h.window);
    const to = { x: VALLEY_PLACES.start.x - h.x, z: VALLEY_PLACES.start.z - h.z };
    const cos = (v.x * to.x + v.z * to.z) / Math.hypot(to.x, to.z);
    expect(cos).toBeGreaterThan(0.99);
  });
});

describe('the shelf Wick stands on (rules 4 and 5)', () => {
  it('every house stands on nearly level ground, 2 to 4 m above the lake', () => {
    for (const h of houses) {
      const ys: number[] = [];
      for (const dx of [-FOOT, 0, FOOT]) for (const dz of [-FOOT, 0, FOOT]) ys.push(ground(h.x + dx, h.z + dz));
      const above = ground(h.x, h.z) - WATER_LEVEL;
      expect(above, `${h.id} above the lake`).toBeGreaterThanOrEqual(2);
      expect(above, `${h.id} above the lake`).toBeLessThanOrEqual(4.01);
      expect((Math.max(...ys) - Math.min(...ys)) / (FOOT * 2), `${h.id} slope`).toBeLessThanOrEqual(0.1);
    }
  });
  it('every gate and every thing in the village is on dry land, except the landing, which is at the water', () => {
    for (const s of [...WICK_GATES, ...WICK_THINGS]) {
      const above = ground(s.x, s.z) - WATER_LEVEL;
      if (s.id === 'landing') expect(Math.abs(above), 'landing').toBeLessThan(0.3);
      else expect(above, s.id).toBeGreaterThan(0.5);
    }
  });
  it("the lake's edge is at the landing and within 10 m of the bell post", () => {
    const landing = WICK_THINGS.find(t => t.id === 'landing')!;
    const bell = WICK_THINGS.find(t => t.id === 'bell_post')!;
    expect(Math.abs(shoreDistance(landing.x, landing.z))).toBeLessThan(0.5);
    expect(shoreDistance(bell.x, bell.z)).toBeGreaterThan(0);
    expect(shoreDistance(bell.x, bell.z)).toBeLessThan(10);
    expect(shelfTarget(landing.x - 6, landing.z - 6)).toBeLessThan(-1);
  });
  it('the bay is part of the lake, never a pond: water runs unbroken from the landing to the middle of the lake', () => {
    const cell = 2;
    const key = (x: number, z: number) => `${x},${z}`;
    const wet = (x: number, z: number) => ground(x, z) < WATER_LEVEL;
    const start = { x: 62, z: 58 };
    expect(wet(start.x, start.z)).toBe(true);
    const seen = new Set([key(start.x, start.z)]);
    const queue = [start];
    let reached = false;
    while (queue.length && !reached) {
      const p = queue.pop()!;
      if (Math.hypot(p.x, p.z) < 20) reached = true;
      for (const [dx, dz] of [[cell, 0], [-cell, 0], [0, cell], [0, -cell]]) {
        const n = { x: p.x + dx, z: p.z + dz };
        if (Math.abs(n.x) > 200 || Math.abs(n.z) > 200 || seen.has(key(n.x, n.z)) || !wet(n.x, n.z)) continue;
        seen.add(key(n.x, n.z)); queue.push(n);
      }
    }
    expect(reached).toBe(true);
  });
  it('changes nothing far from the village', () => {
    for (const [x, z] of [[-176, 50], [226, 238], [-78, -296], [300, 70], [0, 0]]) expect(ground(x, z)).toBe(valleyHeightAt(x, z));
  });
  it('the bank can be walked: no slope on the dry shelf is steeper than the hero can climb', () => {
    let worst = 0;
    for (let x = 36; x <= 164; x += 2) for (let z = 46; z <= 126; z += 2) {
      if (ground(x, z) < WATER_LEVEL) continue;
      worst = Math.max(worst, Math.abs(ground(x + 1, z) - ground(x, z)), Math.abs(ground(x, z + 1) - ground(x, z)));
    }
    expect(worst).toBeLessThan(0.7);
  });
});
