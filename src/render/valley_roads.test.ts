import { describe, expect, it } from 'vitest';
import { ROADS, drawnHeightAt, roadHidden, roadLine, roadsData } from './valley_roads';
import { VALLEY_ROADS } from '../core/world/valley_layout';
import { WATER_LEVEL, insideWickBox, isRoadId, valleyHeightAt } from '../core/world/valley';

describe('the roads and paths are drawn', () => {
  const d = roadsData();

  it('every road and path in the layout has a strip, and something of each is drawn', () => {
    expect(d.strips.map((s) => s.id)).toEqual(Object.keys(VALLEY_ROADS));
    for (const s of d.strips) {
      const used = d.indices.some((i) => i >= s.from && i < s.to);
      expect(used, s.id).toBe(true);
    }
  });

  it('roads are as wide as their crossings and paths are one person wide', () => {
    for (const s of d.strips) expect(s.width).toBe(isRoadId(s.id) ? ROADS.roadWidth : ROADS.pathWidth);
    expect(ROADS.pathWidth).toBeLessThan(ROADS.roadWidth / 2);
  });

  it('every drawn vertex sits just above the ground as the terrain draws it', () => {
    const used = new Set(d.indices);
    for (const i of used) {
      const [x, y, z] = [d.positions[i * 3], d.positions[i * 3 + 1], d.positions[i * 3 + 2]];
      expect(y - drawnHeightAt(x, z)).toBeCloseTo(ROADS.lift, 6);
    }
  });

  it('no strip is drawn through Wick or over the water', () => {
    // Triangles join cross-sections whose centres are both clear; check the centres by sampling each strip's line.
    for (const [id, pts] of Object.entries(VALLEY_ROADS)) {
      const line = roadLine(pts);
      const s = d.strips.find((q) => q.id === id)!;
      const used = new Set(d.indices.filter((i) => i >= s.from && i < s.to).map((i) => Math.floor((i - s.from) / 4)));
      for (const k of used) {
        const hiddenHere = roadHidden(line[k].x, line[k].z);
        const prev = line[Math.max(0, k - 1)], next = line[Math.min(line.length - 1, k + 1)];
        // A used cross-section is clear, or is the edge of a clear run (never both neighbours hidden with it).
        if (hiddenHere) expect(roadHidden(prev.x, prev.z) && roadHidden(next.x, next.z), `${id} ${k}`).toBe(false);
        expect(insideWickBox(line[k].x, line[k].z) && insideWickBox(prev.x, prev.z) && insideWickBox(next.x, next.z), `${id} ${k} in Wick`).toBe(false);
        expect(valleyHeightAt(line[k].x, line[k].z), `${id} ${k} wet`).toBeGreaterThan(WATER_LEVEL);
      }
    }
  });

  it('is one modest mesh', () => {
    expect(d.indices.length / 3).toBeLessThan(40_000);
  });
});

describe('roadLine: bends are rounded and the line keeps to its points', () => {
  const pts = [{ x: 0, z: 0 }, { x: 50, z: 0 }, { x: 50, z: 50 }];
  const line = roadLine(pts);
  it('starts and ends on the road ends', () => {
    expect(line[0]).toEqual(pts[0]);
    expect(line[line.length - 1].x).toBeCloseTo(50, 6);
    expect(line[line.length - 1].z).toBeCloseTo(50, 6);
  });
  it('never steps further than the step, and never turns sharply', () => {
    for (let i = 1; i < line.length; i++) expect(Math.hypot(line[i].x - line[i - 1].x, line[i].z - line[i - 1].z)).toBeLessThanOrEqual(ROADS.step + 1e-9);
    for (let i = 2; i < line.length; i++) {
      const a = Math.atan2(line[i - 1].z - line[i - 2].z, line[i - 1].x - line[i - 2].x), b = Math.atan2(line[i].z - line[i - 1].z, line[i].x - line[i - 1].x);
      expect(Math.abs(b - a)).toBeLessThan(0.5);
    }
  });
  it('cuts a corner by no more than a few metres', () => {
    const nearest = Math.min(...line.map((p) => Math.hypot(p.x - 50, p.z)));
    expect(nearest).toBeLessThan(ROADS.cornerRadius / 2);
  });
});

describe('drawnHeightAt: the ground as the terrain mesh draws it', () => {
  it('equals the true height at grid corners and is flat across a tilted plane', () => {
    expect(drawnHeightAt(8, 12)).toBeCloseTo(valleyHeightAt(8, 12), 9);
    const plane = (x: number, z: number) => 2 * x - 3 * z + 1;
    expect(drawnHeightAt(5.3, 9.1, plane)).toBeCloseTo(plane(5.3, 9.1), 9);
    expect(drawnHeightAt(-5.3, -9.9, plane)).toBeCloseTo(plane(-5.3, -9.9), 9);
  });
});
