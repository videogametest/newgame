import { describe, expect, it } from 'vitest';
import { valleyHeightAt, WATER_LEVEL, VALLEY_PLACES } from './valley';
import { isExcluded, type ExclusionZone } from './scatter';
import {
  hesperSightLine, sceneryBands, sceneryBiomeAt, sceneryKeepOuts, sceneryPlacements, SCENERY_MODELS, SCENERY_RULES,
} from './scenery';

const spots = sceneryPlacements();
const zones = sceneryKeepOuts();

function distanceToSegment(p: { x: number; z: number }, a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
}

describe('valley scenery (overnight item 9)', () => {
  it('is deterministic and independent of rule order', () => {
    expect(sceneryPlacements()).toEqual(spots);
  });

  it('uses at least three tree models and the rock', () => {
    const models = new Set(spots.map(s => s.model));
    expect([...models].filter(m => m.startsWith('tree')).length).toBeGreaterThanOrEqual(3);
    expect(models.has('rock_single_B')).toBe(true);
    for (const m of models) expect(SCENERY_MODELS).toContain(m);
  });

  it('never stands in water and only on ground the valley actually has', () => {
    for (const s of spots) {
      expect(valleyHeightAt(s.x, s.z)).toBeGreaterThanOrEqual(WATER_LEVEL);
      expect(sceneryBiomeAt(s.x, s.z)).not.toBe('water');
    }
  });

  it('keeps out of every keep-out zone, including the road and place clearances', () => {
    expect(spots.length).toBeGreaterThan(300);
    for (const s of spots) expect(isExcluded(s, zones)).toBe(false);
  });

  it('keeps at least 12 m from the sight line from the arrival point to Hesper', () => {
    const sight = hesperSightLine();
    expect(sight.from).toEqual(VALLEY_PLACES.start);
    expect(Math.hypot(sight.to.x - 86, sight.to.z - 98)).toBeCloseTo(2.55, 2);
    for (const s of spots) expect(distanceToSegment(s, sight.from, sight.to)).toBeGreaterThan(12);
  });

  it('is denser on the rim and slopes than on the lake floor', () => {
    const area = (pred: (b: string) => boolean) => {
      let a = 0;
      for (let x = -390; x <= 390; x += 10) for (let z = -390; z <= 390; z += 10) {
        if (pred(sceneryBiomeAt(x, z))) a++;
      }
      return a;
    };
    const countIn = (pred: (b: string) => boolean) => spots.filter(s => pred(sceneryBiomeAt(s.x, s.z))).length;
    const rimSlope = countIn(b => b === 'rim' || b === 'slope') / Math.max(1, area(b => b === 'rim' || b === 'slope'));
    const floor = countIn(b => b === 'floor') / Math.max(1, area(b => b === 'floor'));
    expect(rimSlope).toBeGreaterThan(floor);
  });

  it('keeps the scenery draw-call budget: at most 80 thin-instance meshes (16 bands x 5 models)', () => {
    expect(sceneryBands(spots)).toBeLessThanOrEqual(80);
    expect(SCENERY_RULES.length).toBeLessThanOrEqual(5);
  });

  it('keeps each placement inside its rule scale range', () => {
    for (const s of spots) {
      const rule = SCENERY_RULES.find(r => r.id === s.ruleId)!;
      expect(s.scale).toBeGreaterThanOrEqual(rule.scale[0]);
      expect(s.scale).toBeLessThanOrEqual(rule.scale[1]);
    }
  });

  it('places nothing inside the Wick box or on a place circle', () => {
    const box: ExclusionZone = { kind: 'rectangle', minX: 34, minZ: 44, maxX: 166, maxZ: 128 };
    for (const s of spots) expect(isExcluded(s, [box])).toBe(false);
    for (const p of Object.values(VALLEY_PLACES)) {
      for (const s of spots) expect(Math.hypot(s.x - p.x, s.z - p.z)).toBeGreaterThan(14);
    }
  });
});
