import { describe, expect, it } from 'vitest';
import { FAR_TARGET, STRAW_TARGETS, YARD_MARK, YARD_TARGETS } from './yard';
import { SCARECROW, wickHouses } from './plan';
import { HESPER } from '../data/talking';
import { VALLEY_SEED } from '../core/world/valley';
import { TUNING } from '../config/tuning';
import { arrowStrikes } from '../core/tutorial/yard';

const d = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
describe("Hesper's yard targets (item 26)", () => {
  it('three straw men about ten paces from the mark, one far target well beyond them', () => {
    expect(STRAW_TARGETS).toHaveLength(3);
    for (const t of STRAW_TARGETS) expect(d(t, YARD_MARK)).toBeGreaterThan(6.5), expect(d(t, YARD_MARK)).toBeLessThan(9);
    expect(d(FAR_TARGET, YARD_MARK)).toBeGreaterThan(15);
  });
  it('the mark is within her talking range, so her lines reach the hero while he shoots', () => {
    expect(d(YARD_MARK, HESPER)).toBeLessThan(TUNING.talking.leaveReach);
  });
  it('stand clear of every house, the scarecrow and her', () => {
    for (const t of YARD_TARGETS) {
      expect(d(t, SCARECROW)).toBeGreaterThan(3);
      expect(d(t, HESPER)).toBeGreaterThan(4);
      for (const h of wickHouses(VALLEY_SEED)) expect(d(t, h)).toBeGreaterThan(5);
    }
  });
  it('a level shot from the mark at the far target passes no straw man', () => {
    const a = { x: YARD_MARK.x, y: 1.4, z: YARD_MARK.z, vx: 0, vy: 0, vz: 0 };
    const b = { ...a, x: FAR_TARGET.x, z: FAR_TARGET.z };
    expect(arrowStrikes(a, b, STRAW_TARGETS.map(t => ({ ...t, base: 0 })), 0.05)).toBeNull();
  });
});

describe('item 27: the post, the gate lantern and the yard bounds', () => {
  it('the post and gate lantern stand clear of houses, targets, the scarecrow and her door, on walkable ground', async () => {
    const { PRACTICE_POST, GATE_LANTERN, YARD_MIDDLE } = await import('./yard');
    const { blocksHero } = await import('../core/world/valley');
    for (const p of [PRACTICE_POST, GATE_LANTERN]) {
      for (const h of wickHouses(VALLEY_SEED)) expect(d(p, h)).toBeGreaterThan(4.5);
      for (const t of YARD_TARGETS) expect(d(p, t)).toBeGreaterThan(3);
      expect(d(p, SCARECROW)).toBeGreaterThan(3); expect(d(p, HESPER)).toBeGreaterThan(3);
      for (const [dx, dz] of [[1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) expect(blocksHero(p.x + dx, p.z + dz)).toBe(false);
    }
    // Her turnips reach the post from her door; the whole lesson lies inside the yard bounds.
    expect(d(PRACTICE_POST, HESPER)).toBeLessThan(7);
    for (const p of [PRACTICE_POST, GATE_LANTERN, SCARECROW, YARD_MARK, HESPER, ...YARD_TARGETS])
      expect(d(p, YARD_MIDDLE)).toBeLessThan(TUNING.tutorial.yardRadius - 6);
  });
});
