// The soldiers' road gate: its boxes as pure geometry (overnight item 8). No Babylon here, so the tests can check
// where every board stands. valley_gate.ts turns these parts into one merged mesh.
//
// Frame: `s` runs along the road (positive beyond the gate), `a` runs across it. A point is
//   x = line.x + ux * s + uz * a,  z = line.z + uz * s - ux * a
// which is the inverse of gateFrameAt in core. Every box's local x runs across the road and local z along it, so
// its yaw is atan2(ux, uz) (Babylon's rotation.y).
import { GATE_HALF_WIDTH, GATE_WALL_HALF } from '../core/world/valley';

/** The hero is 1.8 m tall (docs/assets.md); the gate is taller by half. */
export const GATE_HEIGHT = 2.7;
/** Planks stand this far into the ground so they meet a slope. */
const SINK = 0.3;
const BOARD_WIDTH = 0.4;
const BOARD_GAP = 0.02;
const BOARD_THICK = 0.15;
const POST = 0.5;
const BAR_HEIGHT = 2.2;

export interface GateLine {
  x: number;
  z: number;
  ux: number;
  uz: number;
}

export interface GatePart {
  name: string;
  /** Centre on the ground plane. */
  x: number;
  z: number;
  /** Size across the road (local x), and along the road (local z), and up (y). */
  w: number;
  d: number;
  h: number;
  /** Bottom of the box. */
  y: number;
  yaw: number;
}

export function gatePoint(line: GateLine, s: number, a: number): { x: number; z: number } {
  return { x: line.x + line.ux * s + line.uz * a, z: line.z + line.uz * s - line.ux * a };
}

/**
 * The gate's boxes. Two posts with the across extent of the corridor, a crossbar, and one row of planks on each collision
 * face (s = ±GATE_WALL_HALF), so the hero stops at a visible surface.
 */
export function gateParts(line: GateLine, heightAt: (x: number, z: number) => number, height = GATE_HEIGHT): GatePart[] {
  const yaw = Math.atan2(line.ux, line.uz);
  const parts: GatePart[] = [];
  const ground = (s: number, a: number) => {
    const p = gatePoint(line, s, a);
    return heightAt(p.x, p.z);
  };
  const add = (name: string, s: number, a: number, w: number, d: number, h: number, base: number) => {
    const p = gatePoint(line, s, a);
    parts.push({ name, x: p.x, z: p.z, w, d, h, y: base - SINK, yaw });
  };

  for (const side of [-1, 1]) {
    const a = side * (GATE_HALF_WIDTH - POST / 2);
    add(`post_${side < 0 ? 'valley' : 'far'}`, 0, a, POST, POST, height + SINK, ground(0, a));
  }

  const barA = 0;
  add('crossbar', 0, barA, GATE_HALF_WIDTH * 2, 0.25, 0.3, ground(0, barA) + BAR_HEIGHT);

  const count = Math.round((GATE_HALF_WIDTH * 2) / BOARD_WIDTH);
  for (const face of [-1, 1]) {
    const s = face * (GATE_WALL_HALF - BOARD_THICK / 2);
    for (let i = 0; i < count; i++) {
      const a = -GATE_HALF_WIDTH + BOARD_WIDTH / 2 + i * BOARD_WIDTH;
      add(`board_${face < 0 ? 'valley' : 'far'}_${i}`, s, a, BOARD_WIDTH - BOARD_GAP, BOARD_THICK, height - 0.2 + SINK, ground(s, a));
    }
  }
  return parts;
}
