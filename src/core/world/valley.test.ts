import { describe, expect, it } from 'vitest';
import {
  EDGE_RADIUS,
  VALLEY_HALF_EXTENT,
  VALLEY_PLACES,
  VALLEY_SEED,
  VALLEY_STOPS,
  WATER_LEVEL,
  blocksWalking,
  insideValley,
  isCrossing,
  isWalkableGround,
  isWater,
  sightMargin,
  valleyHeightAt,
} from './valley';
import { VALLEY_CROSSINGS, VALLEY_RIVER_IN, VALLEY_RIVER_OUT } from './valley_layout';
import { walkStep, type WalkRules } from './walk';

const STEP = 8;
/** Eye heights (m) used for the sight-line checks; the same values the prototype and the spec table use. */
const EYE = { person: 2, watchHouseYard: 3, signalHillTop: 4, mill: 9, watchHouse: 14, castleTop: 35 };

/** Clearance of the sight line between two named places, with the given eye heights (m above the ground). */
function sight(a: keyof typeof VALLEY_PLACES, eyeA: number, b: keyof typeof VALLEY_PLACES, eyeB: number): number {
  return sightMargin(VALLEY_PLACES[a], VALLEY_PLACES[b], eyeA, eyeB);
}

describe('Tallowmere terrain (§4)', () => {
  it('is deterministic for the same seed and point', () => {
    expect(VALLEY_SEED).toBeTypeOf('number');
    for (const [x, z] of [[0, 0], [-70, 95], [240, -210], [-399, 12]]) {
      expect(valleyHeightAt(x, z)).toBe(valleyHeightAt(x, z));
      expect(Number.isFinite(valleyHeightAt(x, z))).toBe(true);
    }
  });

  it('keeps the lake as water and Wick dry', () => {
    expect(isWater(VALLEY_PLACES.lake.x, VALLEY_PLACES.lake.z)).toBe(true);
    expect(isWater(VALLEY_PLACES.wick.x, VALLEY_PLACES.wick.z)).toBe(false);
  });

  it('keeps every walkable place walkable: all places except the lake', () => {
    for (const [name, p] of Object.entries(VALLEY_PLACES)) {
      // The lake is water. The castle is beyond the north-west rim and never walked to (docs/tasks/003-layout.md, places table).
      if (name === 'lake' || name === 'castle') continue;
      expect(isWalkableGround(p.x, p.z), `place ${name} at (${p.x}, ${p.z})`).toBe(true);
    }
  });

  it('keeps the crossings walkable even where the river is water', () => {
    for (const c of VALLEY_CROSSINGS) {
      expect(isCrossing(c.x, c.z)).toBe(true);
      expect(isWalkableGround(c.x, c.z), `crossing ${c.name} at (${c.x}, ${c.z})`).toBe(true);
    }
  });

  it('blocks walking in water everywhere except at a crossing', () => {
    let checked = 0;
    for (let z = -VALLEY_HALF_EXTENT; z <= VALLEY_HALF_EXTENT; z += 10) {
      for (let x = -VALLEY_HALF_EXTENT; x <= VALLEY_HALF_EXTENT; x += 10) {
        if (!isWater(x, z) || isCrossing(x, z)) continue;
        checked++;
        expect(blocksWalking(x, z)).toBe(true);
        expect(isWalkableGround(x, z)).toBe(false);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('keeps ground beyond the edge ring unwalkable, except the patrol hut zone and the north-west pass', () => {
    for (let a = 0; a < 360; a += 3) {
      const r = EDGE_RADIUS + 15;
      const x = r * Math.cos((a * Math.PI) / 180);
      const z = r * Math.sin((a * Math.PI) / 180);
      if (!insideValley(x, z)) continue;
      if (Math.hypot(x - VALLEY_PLACES.patrolHut.x, z - VALLEY_PLACES.patrolHut.z) < 60) continue;
      if (Math.hypot(x + 250, z + 262) < 40) continue;
      expect(isWalkableGround(x, z), `edge point (${x.toFixed(0)}, ${z.toFixed(0)})`).toBe(false);
    }
  });

  it('makes the sight lines in the layout: seen where it should be, hidden where it should not', () => {
    // Positive clearance = the line clears the ground. Values from the spec table, docs/tasks/003-layout.md.
    expect(sight('start', EYE.person, 'hesper', EYE.person)).toBeGreaterThan(0);
    expect(sight('start', EYE.person, 'castle', EYE.castleTop)).toBeGreaterThan(0);
    expect(sight('wick', EYE.person, 'mill', EYE.mill)).toBeLessThan(0);
    expect(sight('wick', EYE.person, 'forge', EYE.person)).toBeLessThan(0);
    expect(sight('wick', EYE.person, 'watchHouse', EYE.watchHouse)).toBeLessThan(0);
    expect(sight('patrolHut', EYE.person, 'castle', EYE.castleTop)).toBeLessThan(0);
    expect(sight('patrolHut', EYE.person, 'signalHill', EYE.signalHillTop)).toBeLessThan(0);
    expect(sight('signalHill', EYE.signalHillTop, 'castle', EYE.castleTop)).toBeGreaterThan(0);
    expect(sight('signalHill', EYE.signalHillTop, 'watchHouse', EYE.watchHouseYard)).toBeGreaterThan(0);
    expect(sight('wick', EYE.person, 'signalHill', EYE.signalHillTop)).toBeGreaterThan(0);
  });

  it('makes the signal hill the highest point of the valley, close to its marked top', () => {
    let max = -Infinity;
    let at2 = { x: 0, z: 0 };
    for (let z = -VALLEY_HALF_EXTENT; z <= VALLEY_HALF_EXTENT; z += STEP) {
      for (let x = -VALLEY_HALF_EXTENT; x <= VALLEY_HALF_EXTENT; x += STEP) {
        const h = valleyHeightAt(x, z);
        if (h > max) { max = h; at2 = { x, z }; }
      }
    }
    const hill = VALLEY_PLACES.signalHill;
    expect(Math.hypot(at2.x - hill.x, at2.z - hill.z)).toBeLessThan(40);
    expect(max).toBeGreaterThan(60);
    expect(max).toBeLessThan(70);
  });

  it('keeps the start and the castle inside the valley and the castle above the lake', () => {
    expect(insideValley(VALLEY_PLACES.start.x, VALLEY_PLACES.start.z)).toBe(true);
    expect(insideValley(VALLEY_PLACES.castle.x, VALLEY_PLACES.castle.z)).toBe(true);
    expect(isWater(VALLEY_PLACES.castle.x, VALLEY_PLACES.castle.z)).toBe(false);
  });

  it('has a river about 8 to 12 m wide at its wet cross-sections', () => {
    const widths: number[] = [];
    for (const line of [VALLEY_RIVER_IN, VALLEY_RIVER_OUT]) {
      for (let i = 0; i + 1 < line.length; i++) {
        const a = line[i];
        const b = line[i + 1];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        const px = -(b.z - a.z) / len;
        const pz = (b.x - a.x) / len;
        const n = Math.max(1, Math.round(len / 15));
        for (let k = 0; k <= n; k++) {
          const x = a.x + ((b.x - a.x) * k) / n;
          const z = a.z + ((b.z - a.z) * k) / n;
          if (Math.hypot(x, z) < 140 || isCrossing(x, z) || valleyHeightAt(x, z) >= WATER_LEVEL) continue;
          const span = (sign: number) => {
            let d = 0;
            while (d < 40 && valleyHeightAt(x + sign * px * d, z + sign * pz * d) < WATER_LEVEL) d += 0.2;
            return d;
          };
          widths.push(span(1) + span(-1));
        }
      }
    }
    widths.sort((p, q) => p - q);
    expect(widths.length).toBeGreaterThan(10);
    const median = widths[Math.floor(widths.length / 2)];
    const p10 = widths[Math.floor(widths.length * 0.1)];
    expect(median).toBeGreaterThanOrEqual(8);
    expect(median).toBeLessThanOrEqual(12);
    expect(p10).toBeGreaterThanOrEqual(6);
  });

  it('lists every placed stop once, by name', () => {
    expect(VALLEY_STOPS.length).toBe(46);
    const names = VALLEY_STOPS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('valley walking (§4, §7)', () => {
  const rules: WalkRules = {
    heightAt: valleyHeightAt,
    blocked: blocksWalking,
    inside: insideValley,
  };

  it('moves the hero at the given speed and reports the ground height under it', () => {
    const from = { x: VALLEY_PLACES.wick.x + 30, z: VALLEY_PLACES.wick.z + 30 };
    const to = walkStep(from, 1, 0, 3, 0.5, rules);
    expect(to.x).toBeCloseTo(from.x + 1.5, 6);
    expect(to.z).toBeCloseTo(from.z, 6);
    expect(to.y).toBe(valleyHeightAt(to.x, to.z));
  });

  it('normalises diagonal input so it is no faster than straight movement', () => {
    const from = { x: 200, z: 200 };
    const diag = walkStep(from, 1, 1, 4, 1, rules);
    const straight = walkStep(from, 1, 0, 4, 1, rules);
    expect(Math.hypot(diag.x - from.x, diag.z - from.z)).toBeCloseTo(Math.hypot(straight.x - from.x, straight.z - from.z), 6);
  });

  it('never walks into the lake', () => {
    // Start at Wick and walk straight at the lake centre; every step must stay out of blocked water.
    const lake = VALLEY_PLACES.lake;
    const start = VALLEY_PLACES.wick;
    const len = Math.hypot(lake.x - start.x, lake.z - start.z);
    const dx = (lake.x - start.x) / len;
    const dz = (lake.z - start.z) / len;
    let p: { x: number; z: number } = { x: start.x, z: start.z };
    for (let i = 0; i < 600; i++) {
      p = walkStep(p, dx, dz, 3, 0.1, rules);
      expect(blocksWalking(p.x, p.z)).toBe(false);
    }
  });

  it('slides along a blocking edge instead of stopping dead', () => {
    const edge: WalkRules = { heightAt: () => 0, blocked: (x) => x > 10, inside: () => true };
    const to = walkStep({ x: 9.9, z: 0 }, 1, 1, 10, 0.1, edge);
    expect(to.x).toBeCloseTo(9.9, 6);
    expect(to.z).toBeGreaterThan(0.5);
  });

  it('stays inside the valley boundary', () => {
    let p = { x: VALLEY_HALF_EXTENT - 1, z: 0 };
    for (let i = 0; i < 50; i++) p = walkStep(p, 1, 0, 5, 0.2, rules);
    expect(insideValley(p.x, p.z)).toBe(true);
  });

  it('rejects non-finite input', () => {
    expect(() => walkStep({ x: 0, z: 0 }, Number.NaN, 0, 1, 1, rules)).toThrow(RangeError);
  });
});
