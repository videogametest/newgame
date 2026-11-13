// Roads 0.2 and paths 0.45 along their line (design section 4; review 018 item 6).
import { describe, expect, it } from 'vitest';
import { gentleProfile, withGradedRoads } from './grading';
import { GATE_RADIUS, gradingReport, insideWickBox, isRoadId, nearCrossing, PATH_LIMIT, ROAD_LIMIT, shelvedHeightAt, valleyHeightAt } from './valley';
import { VALLEY_ROADS } from './valley_layout';

describe('a gentle profile', () => {
  it('leaves a profile that is already gentle exactly as it is', () => {
    const h = [0, 0.1, 0.2, 0.25, 0.2, 0.1];
    const { g, infeasible } = gentleProfile(h, h.map((_, i) => i === 0 || i === h.length - 1), 1, 0.2);
    expect([...g]).toEqual(h);
    expect(infeasible).toBe(0);
  });
  it('cuts a crest and fills a dip until nothing is steeper than the limit, keeping the pinned ends', () => {
    const h = [0, 0, 3, 0, 0, -3, 0, 0];
    const { g } = gentleProfile(h, h.map((_, i) => i === 0 || i === h.length - 1), 1, 0.5);
    for (let i = 1; i < g.length; i++) expect(Math.abs(g[i] - g[i - 1])).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(g[0]).toBe(0);
    expect(g[g.length - 1]).toBe(0);
    expect(g[2]).toBeLessThan(3);
    expect(g[5]).toBeGreaterThan(-3);
  });
  it('says so when two pins are too far apart in height to be joined within the limit', () => {
    const h = [0, 0, 0, 10];
    expect(gentleProfile(h, [true, false, false, true], 1, 0.5).infeasible).toBe(2);
  });
});

describe('grading a road', () => {
  const bumpy = (x: number, z: number) => Math.sin(x * 0.6) * 1.5 + z * 0.02;
  const road = { id: 'r', points: [{ x: 0, z: 0 }, { x: 60, z: 0 }], limit: 0.2 };
  const graded = withGradedRoads(bumpy, [road], { pinned: () => false });
  it('brings the line within its limit and changes nothing far from it', () => {
    for (let x = 0.5; x <= 60; x += 0.5) expect(Math.abs(graded.heightAt(x, 0) - graded.heightAt(x - 0.5, 0)) / 0.5).toBeLessThanOrEqual(0.2);
    expect(graded.heightAt(30, 80)).toBe(bumpy(30, 80));
    expect(graded.heightAt(0, 0)).toBeCloseTo(bumpy(0, 0), 9);
  });
  it('fades into the land with no step at the edge of the shoulder', () => {
    for (let z = 0; z < 60; z += 0.25) expect(Math.abs(graded.heightAt(30, z + 0.25) - graded.heightAt(30, z))).toBeLessThan(0.3);
  });
});

describe('the valley: every road and path keeps to its limit', () => {
  /**
   * Outside the gate the soldiers' road climbs the rim; at a crossing and its landings the crossing's own rules
   * hold; inside Wick the shelf's do (level under the houses, a bank that can be walked).
   */
  const exempt = (x: number, z: number) => nearCrossing(x, z) || insideWickBox(x, z) || Math.hypot(x, z) >= GATE_RADIUS - 1;
  it.each(Object.keys(VALLEY_ROADS))('%s', (id) => {
    const limit = isRoadId(id) ? ROAD_LIMIT : PATH_LIMIT;
    const pts = VALLEY_ROADS[id];
    let worst = 0, where = '';
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(len / 0.5);
      for (let k = 1; k <= n; k++) {
        const x0 = a.x + ((b.x - a.x) * (k - 1)) / n, z0 = a.z + ((b.z - a.z) * (k - 1)) / n;
        const x1 = a.x + ((b.x - a.x) * k) / n, z1 = a.z + ((b.z - a.z) * k) / n;
        if (exempt(x0, z0) || exempt(x1, z1)) continue;
        const grade = Math.abs(valleyHeightAt(x1, z1) - valleyHeightAt(x0, z0)) / (len / n);
        if (grade > worst) { worst = grade; where = `(${x1.toFixed(0)}, ${z1.toFixed(0)})`; }
      }
    }
    expect(worst, `${id} at ${where}`).toBeLessThanOrEqual(limit);
  });
  it('a road that was already gentle was given next to nothing', () => {
    for (const r of gradingReport()) if (['forest_path', 'north_bank_path', 'falls_path'].includes(r.id)) { expect(Math.abs(r.cut)).toBeLessThan(0.25); expect(r.fill).toBeLessThan(0.25); }
  });
  it('the ends of every road stay where the land put them', () => {
    for (const pts of Object.values(VALLEY_ROADS)) for (const e of [pts[0], pts[pts.length - 1]]) {
      expect(Math.abs(valleyHeightAt(e.x, e.z) - shelvedHeightAt(e.x, e.z))).toBeLessThan(0.75);
    }
  });
});
