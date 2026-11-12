import { describe, expect, it } from 'vitest';
import { isExcluded, scatterChunk, type ExclusionZone, type ScatterRule } from './scatter';

// Test fixtures only, not proposed world tuning.
const rules: ScatterRule[] = [
  { id: 'oak', kind: 'tree', salt: 1, attempts: 30, biomes: ['forest'], scale: [0.8, 1.2], clearance: 0 },
  { id: 'stone', kind: 'rock', salt: 2, attempts: 20, biomes: ['forest'], scale: [1, 1], clearance: 0 },
  { id: 'log', kind: 'prop', salt: 3, attempts: 10, biomes: ['forest'], scale: [1, 2], clearance: 0 },
];
const chunk = { x: -1, z: 2 };
const scatter = (seed = 1, config = rules, zones: ExclusionZone[] = []) =>
  scatterChunk(seed, chunk, 10, config, zones, () => 'forest', (x, z) => x + z);

describe('scatter rules (§2, §7)', () => {
  it('regenerates exactly and is independent of rule/load order', () => {
    const a = scatter();
    scatterChunk(1, { x: 999, z: -8 }, 10, rules, [], () => 'forest', () => 0);
    expect(scatter()).toEqual(a);
    expect(scatter(1, [...rules].reverse())).toEqual(a);
    expect(scatter(1, [rules[0]])).toEqual(a.filter(p => p.ruleId === 'oak'));
  });
  it('changes with the seed and keeps unique stable candidate ids', () => {
    expect(scatter(1)).not.toEqual(scatter(2));
    expect(new Set(scatter().map(p => p.id)).size).toBe(60);
  });
  it('places trees, rocks and props within the half-open chunk on sampled height', () => {
    const points = scatter();
    expect(new Set(points.map(p => p.kind))).toEqual(new Set(['tree', 'rock', 'prop']));
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(-10);
      expect(p.x).toBeLessThan(0);
      expect(p.z).toBeGreaterThanOrEqual(20);
      expect(p.z).toBeLessThan(30);
      expect(p.y).toBe(p.x + p.z);
      expect(p.yaw).toBeGreaterThanOrEqual(0);
      expect(p.yaw).toBeLessThan(2 * Math.PI);
      const rule = rules.find(r => r.id === p.ruleId)!;
      expect(p.scale).toBeGreaterThanOrEqual(rule.scale[0]);
      expect(p.scale).toBeLessThanOrEqual(rule.scale[1]);
    }
  });
  it('obeys biome data', () => {
    expect(scatterChunk(1, chunk, 10, rules, [], () => 'water', () => 0)).toEqual([]);
  });
  it('excludes road capsules including endpoints and degenerate roads', () => {
    const road: ExclusionZone = { kind: 'road', from: { x: 0, z: 0 }, to: { x: 10, z: 0 }, halfWidth: 2 };
    expect(isExcluded({ x: 5, z: 2 }, [road])).toBe(true);
    expect(isExcluded({ x: -2, z: 0 }, [road])).toBe(true);
    expect(isExcluded({ x: 5, z: 2.1 }, [road])).toBe(false);
    expect(isExcluded({ x: 0, z: 1 }, [{ ...road, to: road.from }])).toBe(true);
  });
  it('excludes data-defined water rectangles and place circles with clearance', () => {
    const zones: ExclusionZone[] = [
      { kind: 'rectangle', minX: -10, maxX: -5, minZ: 20, maxZ: 30 },
      { kind: 'circle', centre: { x: -2, z: 25 }, radius: 2 },
      { kind: 'road', from: { x: -5, z: 20 }, to: { x: -5, z: 30 }, halfWidth: 0.5 },
    ];
    expect(scatter(1, rules, zones).length).toBeLessThan(60);
    for (const p of scatter(1, rules, zones)) expect(isExcluded(p, zones)).toBe(false);
    expect(isExcluded({ x: -4, z: 21 }, [zones[0]], 1)).toBe(true);
    expect(isExcluded({ x: 1, z: 25 }, [zones[1]], 1)).toBe(true);
  });
  it('does not refill rejected candidates and handles full-chunk exclusion', () => {
    expect(scatter(1, rules, [{ kind: 'rectangle', minX: -10, maxX: 0, minZ: 20, maxZ: 30 }])).toEqual([]);
  });
  it('rejects duplicate rules and invalid attempts/scales', () => {
    expect(() => scatter(1, [rules[0], rules[0]])).toThrow(RangeError);
    expect(() => scatter(1, [{ ...rules[0], attempts: -1 }])).toThrow(RangeError);
    expect(() => scatter(1, [{ ...rules[0], scale: [2, 1] }])).toThrow(RangeError);
  });
});
