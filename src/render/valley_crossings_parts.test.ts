import { describe, expect, it } from 'vitest';
import { valleyHeightAt, walkSurfaceAt, WATER_LEVEL, isCrossing } from '../core/world/valley';
import { VALLEY_CROSSINGS, VALLEY_RIVER_IN, type LayoutCrossing } from '../core/world/valley_layout';
import { ROADS, roadsData } from './valley_roads';
import {
  crossingFrame, crossingParts, crossingPoint, fordRibbon, plankBridgeParts, steppingStoneParts, upstreamPointOf, upstreamSide,
  type CrossingPart,
} from './valley_crossings_parts';

const byName = (c: string): LayoutCrossing => {
  const found = VALLEY_CROSSINGS.find((x) => x.name === c);
  if (!found) throw new Error(`no crossing ${c}`);
  return found;
};
const ford = byName('ford');
const mill = byName('mill_bridge');
const stones = byName('stepping_stones');
const PARTS = crossingParts(valleyHeightAt, walkSurfaceAt, WATER_LEVEL);
const pick = (prefix: string): CrossingPart[] => PARTS.filter((p) => p.name.startsWith(prefix));

describe('mill bridge (review 025 item 2)', () => {
  const deck = plankBridgeParts(mill, valleyHeightAt, walkSurfaceAt, upstreamPointOf(mill, VALLEY_RIVER_IN))
    .filter((p) => p.name.startsWith('deck_'));

  it('keeps every deck board at least 1.0 m above the water', () => {
    expect(deck.length).toBeGreaterThan(10);
    for (const p of deck) expect(p.y + p.h).toBeGreaterThanOrEqual(WATER_LEVEL + 1.0);
  });

  it('meets the ground height at each end', () => {
    const first = deck[0], last = deck[deck.length - 1];
    expect(Math.abs(first.y + first.h - valleyHeightAt(mill.from.x, mill.from.z))).toBeLessThan(0.2);
    expect(Math.abs(last.y + last.h - valleyHeightAt(mill.to.x, mill.to.z))).toBeLessThan(0.2);
  });

  it('follows the walk surface core gives, slice by slice', () => {
    for (const p of deck) {
      expect(Math.abs(p.y + p.h - walkSurfaceAt(p.x, p.z))).toBeLessThan(1e-6);
    }
  });

  it('puts its rail on the upstream side, which is the side the river comes from', () => {
    const f = crossingFrame(mill);
    const up = upstreamPointOf(mill, VALLEY_RIVER_IN);
    expect(up).toEqual(VALLEY_RIVER_IN[3]); // the river segment nearest the bridge starts at (-215, 22)
    const rails = pick('rail_post_');
    expect(rails.length).toBeGreaterThan(2);
    for (const r of rails) {
      const across = (r.x - mill.x) * f.vx + (r.z - mill.z) * f.vz;
      expect(across).toBeGreaterThan(mill.width / 2 - 0.3);
    }
    expect(upstreamSide(mill, up)).toBe(1);
  });

  it('stands each rail post on the deck, one metre high', () => {
    for (const r of pick('rail_post_')) {
      expect(r.y).toBeCloseTo(walkSurfaceAt(r.x, r.z), 6);
      expect(r.h).toBeCloseTo(1, 6);
    }
  });
});

describe('stepping stones (review 025 item 2)', () => {
  const stoneList = steppingStoneParts(stones, valleyHeightAt, WATER_LEVEL);

  it('has flat tops 0.3 m above the water', () => {
    expect(stoneList.length).toBeGreaterThanOrEqual(10);
    for (const s of stoneList) expect(s.y + s.h).toBeCloseTo(WATER_LEVEL + 0.3, 9);
  });

  it('puts each top where core walks, so the stones and the walk surface agree', () => {
    for (const s of stoneList) {
      expect(walkSurfaceAt(s.x, s.z)).toBeCloseTo(s.y + s.h, 9);
    }
  });

  it('keeps every stone on the strip, across its width', () => {
    const f = crossingFrame(stones);
    for (const s of stoneList) {
      const across = (s.x - stones.x) * f.vx + (s.z - stones.z) * f.vz;
      expect(Math.abs(across)).toBeLessThanOrEqual(stones.width / 2 + 1e-9);
    }
  });

  it('is walkable from one end to the other', () => {
    for (let i = 0; i <= 40; i++) {
      const p = crossingPoint(stones, i / 40, 0);
      expect(isCrossing(p.x, p.z)).toBe(true);
    }
  });
});

describe('ford ribbon (review 027 item 2)', () => {
  const ribbon = fordRibbon(valleyHeightAt, ford);
  const at = (row: number, j: number) => {
    const k = (row * 4 + j) * 3;
    return { x: ribbon.positions[k], y: ribbon.positions[k + 1], z: ribbon.positions[k + 2] };
  };
  const wet = ribbon.rows.map((r, i) => (r.wet ? i : -1)).filter((i) => i >= 0);

  it('is one ribbon of rows across the water: wet rows exist and are not the whole run', () => {
    // The river is narrow here: the road is under water for a few rows (about 2.6 m), not the whole ford.
    expect(wet.length).toBeGreaterThan(0);
    expect(ribbon.rows.length).toBeGreaterThan(wet.length);
    expect(ribbon.positions.length).toBe(ribbon.rows.length * 4 * 3);
  });

  it('keeps the wet bed under the water and above the stones: 0.4 m deep at the centre', () => {
    for (const r of wet) {
      for (const j of [1, 2]) {
        const v = at(r, j);
        expect(v.y).toBeLessThan(WATER_LEVEL);
        expect(v.y).toBeGreaterThanOrEqual(WATER_LEVEL - (ford.water_depth ?? 0.4));
      }
    }
  });

  it('is pale gravel in the water and the road\'s earth on the dry banks', () => {
    const gravelRow = wet[Math.floor(wet.length / 2)];
    const k = gravelRow * 4 + 1;
    expect(ribbon.colors[k * 4]).toBeCloseTo(0.66, 6);
    const dry = ribbon.rows.findIndex((r) => !r.wet);
    expect(dry).toBeGreaterThanOrEqual(0);
    expect(ribbon.colors[(dry * 4 + 1) * 4]).toBeGreaterThan(0.3);
    expect(ribbon.colors[(dry * 4 + 1) * 4]).not.toBeCloseTo(0.66, 2);
  });

  it('is 3.6 m wide, with the road\'s wobble and no more', () => {
    for (let r = 0; r < ribbon.rows.length; r++) {
      const a = at(r, 0), b = at(r, 3);
      const w = Math.hypot(b.x - a.x, b.z - a.z);
      expect(w).toBeGreaterThanOrEqual(ROADS.roadWidth * (1 - ROADS.wander) - 1e-6);
      expect(w).toBeLessThanOrEqual(ROADS.roadWidth * (1 + ROADS.wander) + 1e-6);
    }
  });

  it('ends its dry rows on the bank where the terrain is 0.2 m above the water, and its last rows are dry', () => {
    for (const r of [ribbon.rows[0], ribbon.rows[ribbon.rows.length - 1]]) {
      expect(r.wet).toBe(false);
      expect(valleyHeightAt(r.x, r.z)).toBeGreaterThanOrEqual(WATER_LEVEL + ROADS.bankClearance - 1e-9);
    }
  });

  it('meets the east road strip at both ends, vertex for vertex', () => {
    const d = roadsData();
    const strip = d.strips.find((s) => s.id === 'east_road');
    if (!strip) throw new Error('no east_road strip');
    for (const [row, sample] of [[0, ribbon.firstSample], [ribbon.rows.length - 1, ribbon.lastSample]] as const) {
      for (let j = 0; j < 4; j++) {
        const v = (strip.from + sample * 4 + j) * 3;
        const mine = at(row, j);
        expect(mine.x).toBeCloseTo(d.positions[v], 9);
        expect(mine.y).toBeCloseTo(d.positions[v + 1], 9);
        expect(mine.z).toBeCloseTo(d.positions[v + 2], 9);
      }
    }
  });

  it('draws no boxes: the ford is the ribbon, with no gravel slabs or bank stones', () => {
    expect(PARTS.some((p) => p.name.startsWith('ford'))).toBe(false);
    expect(PARTS.some((p) => p.material !== 'wood' && p.material !== 'stone')).toBe(false);
  });
});

describe('all crossings together', () => {
  it('draws the mill bridge and the stepping stones, and not the forge bridge or the ford', () => {
    const names = new Set(PARTS.map((p) => p.name.split('_')[0]));
    expect(names.has('deck')).toBe(true);
    expect(names.has('stone')).toBe(true);
    expect(names.has('ford')).toBe(false);
    expect(PARTS.some((p) => p.name.startsWith('forge'))).toBe(false);
  });

  it('gives every part a positive size', () => {
    for (const p of PARTS) {
      expect(p.w).toBeGreaterThan(0);
      expect(p.d).toBeGreaterThan(0);
      expect(p.h).toBeGreaterThan(0);
    }
  });

  it('keeps the deck boards inside the mill bridge strip', () => {
    for (const d of pick('deck_')) expect(isCrossing(d.x, d.z)).toBe(true);
  });
});
