import { describe, expect, it } from 'vitest';
import { gateFrameAt, GATE_HALF_WIDTH, GATE_LINE, GATE_WALL_HALF } from '../core/world/valley';
import { gateParts, GATE_HEIGHT, gatePoint } from './valley_gate_parts';

const flat = () => 0;
const PARTS = gateParts(GATE_LINE, flat);

/** World corners of a part, using Babylon's rotation.y convention (x' = x cos + z sin, z' = -x sin + z cos). */
function corners(p: (typeof PARTS)[number]): { x: number; z: number }[] {
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  const out: { x: number; z: number }[] = [];
  for (const dx of [-p.w / 2, p.w / 2]) for (const dz of [-p.d / 2, p.d / 2]) {
    out.push({ x: p.x + dx * c + dz * s, z: p.z - dx * s + dz * c });
  }
  return out;
}

describe('soldiers gate geometry (overnight item 8)', () => {
  it('puts the planks on both collision faces, s = ±GATE_WALL_HALF', () => {
    const boards = PARTS.filter((p) => p.name.startsWith('board_'));
    const inner = GATE_WALL_HALF - 0.15 / 2;
    const ss = boards.map((p) => gateFrameAt(p.x, p.z).s);
    const neg = ss.filter((s) => s < 0);
    const pos = ss.filter((s) => s > 0);
    expect(neg.length).toBeGreaterThan(0);
    expect(pos.length).toBe(neg.length);
    for (const s of neg) expect(s).toBeCloseTo(-inner, 3);
    for (const s of pos) expect(s).toBeCloseTo(inner, 3);
  });

  it('spans the corridor exactly: posts and planks reach ±GATE_HALF_WIDTH across the road, not beyond', () => {
    const acrossEdges = PARTS.flatMap((p) => corners(p).map((c) => gateFrameAt(c.x, c.z).across));
    expect(Math.max(...acrossEdges)).toBeCloseTo(GATE_HALF_WIDTH, 6);
  });

  it('keeps every part inside the collision wall in s (no plank protrudes past the wall face into the road)', () => {
    for (const p of PARTS) {
      const ss = corners(p).map((c) => gateFrameAt(c.x, c.z).s);
      expect(Math.max(...ss)).toBeLessThanOrEqual(GATE_WALL_HALF + 1e-6);
      expect(Math.min(...ss)).toBeGreaterThanOrEqual(-GATE_WALL_HALF - 1e-6);
    }
  });

  it('is taller than the hero by half (hero 1.8 m, gate 2.7 m)', () => {
    expect(GATE_HEIGHT).toBeCloseTo(1.5 * 1.8, 6);
    const tops = PARTS.map((p) => p.y + p.h);
    expect(Math.max(...tops)).toBeCloseTo(GATE_HEIGHT, 6);
  });

  it('has the crossbar above the hero, and the gate line centre is in the middle of the crossbar', () => {
    const bar = PARTS.find((p) => p.name === 'crossbar');
    expect(bar).toBeDefined();
    const mid = gatePoint(GATE_LINE, 0, 0);
    expect(Math.hypot(bar!.x - mid.x, bar!.z - mid.z)).toBeLessThan(1e-9);
    expect(bar!.y).toBeGreaterThan(1.8);
  });
});
