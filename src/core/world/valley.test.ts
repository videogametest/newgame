import { describe, expect, it } from 'vitest';
import { VALLEY_HALF_EXTENT, VALLEY_PLACES, VALLEY_SEED, WATER_LEVEL, insideValley, isWater, valleyHeightAt } from './valley';

/** True if the straight line from a to b (eye heights included) clears the ground everywhere along it. */
function clearSight(a: { x: number; z: number; eye: number }, b: { x: number; z: number; eye: number }): boolean {
  const n = 200;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    const sightY = a.eye + (b.eye - a.eye) * t;
    if (valleyHeightAt(x, z) > sightY) return false;
  }
  return true;
}
import { walkStep, type WalkRules } from './walk';

const STEP = 8;

describe('Tallowmere terrain (§4)', () => {
  it('is deterministic for the same seed and point', () => {
    for (const [x, z] of [[0, 0], [-70, 95], [240, -210], [-399, 12]]) {
      expect(valleyHeightAt(x, z)).toBe(valleyHeightAt(x, z));
      expect(Number.isFinite(valleyHeightAt(x, z))).toBe(true);
    }
    expect(VALLEY_SEED).toBeTypeOf('number');
  });

  it('puts the lake centre below the water surface and the lake reaches the village shore', () => {
    expect(valleyHeightAt(0, 0)).toBeLessThan(WATER_LEVEL);
    expect(isWater(VALLEY_PLACES.lakeCentre.x, VALLEY_PLACES.lakeCentre.z)).toBe(true);
    // Wick is beside the lake, not in it.
    expect(isWater(VALLEY_PLACES.wick.x, VALLEY_PLACES.wick.z)).toBe(false);
    // ...and close enough to the water to count as beside it: a water cell within 25 m.
    let nearest = Infinity;
    for (let r = 0; r <= 25; r += 1) {
      for (let a = 0; a < 360; a += 5) {
        const x = VALLEY_PLACES.wick.x + r * Math.cos((a * Math.PI) / 180);
        const z = VALLEY_PLACES.wick.z + r * Math.sin((a * Math.PI) / 180);
        if (isWater(x, z)) nearest = Math.min(nearest, r);
      }
    }
    expect(nearest).toBeLessThanOrEqual(25);
  });

  it('lets the castle be seen from the signal hill and hides it from the patrol hut (§4)', () => {
    const hill = { ...VALLEY_PLACES.signalHill, eye: valleyHeightAt(VALLEY_PLACES.signalHill.x, VALLEY_PLACES.signalHill.z) + 1.8 };
    const hut = { ...VALLEY_PLACES.patrolHut, eye: valleyHeightAt(VALLEY_PLACES.patrolHut.x, VALLEY_PLACES.patrolHut.z) + 1.8 };
    const castle = { ...VALLEY_PLACES.castle, eye: valleyHeightAt(VALLEY_PLACES.castle.x, VALLEY_PLACES.castle.z) + 12 };
    expect(clearSight(hill, castle)).toBe(true);
    expect(clearSight(hut, castle)).toBe(false);
  });

  it('makes the signal hill the highest point of the valley', () => {
    let max = -Infinity;
    let at = { x: 0, z: 0 };
    for (let z = -VALLEY_HALF_EXTENT; z <= VALLEY_HALF_EXTENT; z += STEP) {
      for (let x = -VALLEY_HALF_EXTENT; x <= VALLEY_HALF_EXTENT; x += STEP) {
        const h = valleyHeightAt(x, z);
        if (h > max) { max = h; at = { x, z }; }
      }
    }
    const hill = VALLEY_PLACES.signalHill;
    expect(Math.hypot(at.x - hill.x, at.z - hill.z)).toBeLessThan(40);
    expect(valleyHeightAt(hill.x, hill.z)).toBeGreaterThan(valleyHeightAt(VALLEY_PLACES.ridgeCrest.x, VALLEY_PLACES.ridgeCrest.z));
  });

  it('keeps the start and the castle inside the valley and the castle above the lake', () => {
    expect(insideValley(VALLEY_PLACES.start.x, VALLEY_PLACES.start.z)).toBe(true);
    expect(insideValley(VALLEY_PLACES.castle.x, VALLEY_PLACES.castle.z)).toBe(true);
    expect(isWater(VALLEY_PLACES.castle.x, VALLEY_PLACES.castle.z)).toBe(false);
  });
});

describe('valley walking (§4, §7)', () => {
  const rules: WalkRules = {
    heightAt: valleyHeightAt,
    blocked: isWater,
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
    // Start on land at the west shore (the lake's shore is about r 90 m there) and walk straight into the lake.
    const shore = { x: -95, z: 0 };
    expect(isWater(shore.x, shore.z)).toBe(false);
    let p: { x: number; z: number } = shore;
    for (let i = 0; i < 400; i++) p = walkStep(p, 1, 0, 3, 0.1, rules);
    expect(isWater(p.x, p.z)).toBe(false);
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
