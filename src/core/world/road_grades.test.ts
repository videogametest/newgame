import { describe, expect, it } from 'vitest';
import { beyondGate, isCrossing, isWater, valleyHeightAt, WIDE_ROADS } from './valley';
import { VALLEY_ROADS } from './valley_layout';
import { GRADE_FADE, GRADE_HALF_WIDTH, GRADE_SHARPNESS, GRADE_TARGET } from './road_grade';

/** Design limits (docs/reviews/018-layout-and-sky.md item 6): wide roads 0.2, paths 0.45. */
const LIMIT = { road: 0.2, path: 0.45 } as const;

/** Directional slope along the line at (x, z) with unit tangent (tx, tz), over ±0.5 m: the probe's method. */
function alongSlope(x: number, z: number, tx: number, tz: number): number {
  const d = 0.5;
  return (valleyHeightAt(x + tx * d, z + tz * d) - valleyHeightAt(x - tx * d, z - tz * d)) / (2 * d);
}

/** Every 1 m sample of a road's line that the hero walks on dry land: not water, not a crossing, not beyond the gate. */
function walkedSlopes(points: readonly { x: number; z: number }[]): { x: number; z: number; s: number; slope: number }[] {
  const out: { x: number; z: number; s: number; slope: number }[] = [];
  let s = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.round(len));
    const tx = (b.x - a.x) / len;
    const tz = (b.z - a.z) / len;
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      if (isWater(x, z) || isCrossing(x, z) || beyondGate(x, z)) continue;
      out.push({ x, z, s: s + t * len, slope: alongSlope(x, z, tx, tz) });
    }
    s += len;
  }
  return out;
}

describe('road grades (review 018 item 6)', () => {
  it('keeps WIDE_ROADS to the four roads the layout names as roads (widths.roads), every other line a path', () => {
    expect([...WIDE_ROADS].sort()).toEqual(['east_road', 'mill_road', 'road_in', 'soldiers_road']);
  });

  it('keeps the grading target under the limit it is set for, with room for the blend', () => {
    expect(GRADE_TARGET.road).toBeLessThan(LIMIT.road);
    expect(GRADE_TARGET.path).toBeLessThan(LIMIT.path);
    expect(GRADE_HALF_WIDTH.road).toBeGreaterThan(GRADE_HALF_WIDTH.path);
    expect(GRADE_FADE).toBeGreaterThan(0);
    expect(GRADE_SHARPNESS).toBeGreaterThan(1);
  });

  for (const [name, points] of Object.entries(VALLEY_ROADS)) {
    const kind = WIDE_ROADS.has(name) ? 'road' : 'path';
    it(`keeps ${name} (${kind}) at or under ${LIMIT[kind]} along its walked line`, () => {
      const samples = walkedSlopes(points);
      expect(samples.length, `${name} walked samples`).toBeGreaterThan(0);
      const over = samples.filter((p) => Math.abs(p.slope) > LIMIT[kind]);
      const detail = over
        .slice(0, 8)
        .map((p) => `s=${p.s.toFixed(1)} (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) slope ${p.slope.toFixed(3)}`)
        .join('; ');
      expect(over.length, `${name} samples over ${LIMIT[kind]}: ${detail}`).toBe(0);
    });
  }
});
