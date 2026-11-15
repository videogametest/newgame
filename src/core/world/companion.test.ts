import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ARRIVE_DISTANCE,
  BRAM_BEHIND,
  BRAM_FOLLOW_LINES,
  BRAM_HOLD_LINES,
  BRAM_SIDE_OFFSET,
  followSpot,
  nextOrder,
  stepCompanion,
  type Walker,
} from './companion';
import type { WalkRules } from './walk';

const flat: WalkRules = {
  heightAt: () => 2,
  blocked: () => false,
  inside: () => true,
};

// Hero at the origin facing +z (yaw 0): his right is +x, so his spot is (2.5, -1).
const hero = { x: 0, z: 0, yaw: 0 };

/** Distance from point p to the segment a-b, in metres. */
function distToSegment(p: Walker, a: Walker, b: Walker): number {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.z - a.z) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(p.x - (a.x + t * vx), p.z - (a.z + t * vz));
}

describe('followSpot', () => {
  it('keeps the spot 2.5 m to the side and 1 m behind', () => {
    expect(BRAM_SIDE_OFFSET).toBe(2.5);
    expect(BRAM_BEHIND).toBe(1);
  });

  it('stands 2.5 m to the right of a hero facing +z and 1 m behind him', () => {
    const s = followSpot(hero);
    expect(s.x).toBeCloseTo(BRAM_SIDE_OFFSET, 9);
    expect(s.z).toBeCloseTo(-BRAM_BEHIND, 9);
  });

  it('turns with the hero: a hero facing +x has his right at -z', () => {
    const s = followSpot({ x: 10, z: 10, yaw: Math.PI / 2 });
    expect(s.x).toBeCloseTo(9, 9);
    expect(s.z).toBeCloseTo(7.5, 9);
  });

  it('takes the left side when the right side is blocked', () => {
    const rules: WalkRules = { heightAt: () => 0, blocked: (x) => x > 0, inside: () => true };
    const s = followSpot(hero, rules);
    expect(s.x).toBeCloseTo(-BRAM_SIDE_OFFSET, 9);
    expect(s.z).toBeCloseTo(-BRAM_BEHIND, 9);
  });

  it('takes the left side when the right side is outside the valley', () => {
    const rules: WalkRules = { heightAt: () => 0, blocked: () => false, inside: (x) => x < 1 };
    expect(followSpot(hero, rules).x).toBeCloseTo(-BRAM_SIDE_OFFSET, 9);
  });

  it('falls back to the right side when both sides are blocked', () => {
    const rules: WalkRules = { heightAt: () => 0, blocked: () => true, inside: () => true };
    expect(followSpot(hero, rules).x).toBeCloseTo(BRAM_SIDE_OFFSET, 9);
  });

  it('never stands on the line from the camera to the hero', () => {
    // Over-the-shoulder camera: 4 m behind the hero, 0.8 m to either shoulder, at several headings.
    for (const shoulder of [-0.8, 0.8]) {
      for (const yaw of [0, 0.7, Math.PI / 2, 2.5, -2.9]) {
        const h = { x: 3, z: -2, yaw };
        const forward = { x: Math.sin(yaw), z: Math.cos(yaw) };
        const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
        const cam = {
          x: h.x - forward.x * 4 + right.x * shoulder,
          z: h.z - forward.z * 4 + right.z * shoulder,
        };
        expect(distToSegment(followSpot(h), cam, h)).toBeGreaterThan(2);
      }
    }
  });
});

describe('nextOrder', () => {
  it('toggles between follow and hold', () => {
    expect(nextOrder('follow')).toBe('hold');
    expect(nextOrder('hold')).toBe('follow');
    expect(nextOrder(nextOrder('follow'))).toBe('follow');
  });
});

describe('stepCompanion', () => {
  it('walks toward his spot when he is far from it', () => {
    const start = { x: -10, z: 20 };
    const spot = followSpot(hero);
    const step = stepCompanion(start, hero, 'follow', 5.4, 1 / 60, flat);
    expect(step.moving).toBe(true);
    expect(Math.hypot(step.x - spot.x, step.z - spot.z)).toBeLessThan(Math.hypot(start.x - spot.x, start.z - spot.z));
    expect(step.y).toBe(2);
  });

  it('stops once inside the arrival distance', () => {
    const spot = followSpot(hero);
    const near = { x: spot.x + ARRIVE_DISTANCE * 0.5, z: spot.z };
    const step = stepCompanion(near, hero, 'follow', 5.4, 1 / 60, flat);
    expect(step.moving).toBe(false);
    expect(step.x).toBe(near.x);
    expect(step.z).toBe(near.z);
  });

  it('never overshoots his spot, however large the step', () => {
    const spot = followSpot(hero);
    const start = { x: spot.x, z: spot.z + 0.8 };
    const step = stepCompanion(start, hero, 'follow', 5.4, 10, flat);
    expect(Math.hypot(step.x - spot.x, step.z - spot.z)).toBeLessThan(1e-9);
  });

  it('never moves faster than its maximum speed', () => {
    const start = { x: -10, z: 40 };
    const dt = 1 / 60;
    const step = stepCompanion(start, hero, 'follow', 5.4, dt, flat);
    expect(Math.hypot(step.x - start.x, step.z - start.z)).toBeLessThanOrEqual(5.4 * dt + 1e-9);
  });

  it('never moves on hold, however far he is from his spot', () => {
    const start = { x: 3, z: 40 };
    const step = stepCompanion(start, hero, 'hold', 5.4, 1, flat);
    expect(step.moving).toBe(false);
    expect(step.x).toBe(3);
    expect(step.z).toBe(40);
  });

  it('does nothing on a zero time step', () => {
    const step = stepCompanion({ x: 0, z: 20 }, hero, 'follow', 5.4, 0, flat);
    expect(step.moving).toBe(false);
    expect(step.z).toBe(20);
  });

  it('reaches his spot beside the hero and stays there', () => {
    let pos: Walker = { x: -8, z: 30 };
    for (let i = 0; i < 1200; i++) pos = stepCompanion(pos, hero, 'follow', 5.4, 1 / 60, flat);
    const spot = followSpot(hero);
    expect(Math.hypot(pos.x - spot.x, pos.z - spot.z)).toBeLessThanOrEqual(ARRIVE_DISTANCE);
  });

  it('walks round to the left side when the right side is blocked', () => {
    const rules: WalkRules = { heightAt: () => 0, blocked: (x) => x > 0, inside: () => true };
    let pos: Walker = { x: -8, z: 30 };
    for (let i = 0; i < 1200; i++) pos = stepCompanion(pos, hero, 'follow', 5.4, 1 / 60, rules);
    expect(Math.hypot(pos.x + BRAM_SIDE_OFFSET, pos.z + BRAM_BEHIND)).toBeLessThanOrEqual(ARRIVE_DISTANCE);
  });
});

describe('Bram lines', () => {
  const doc = readFileSync(resolve(process.cwd(), 'docs/writing/bram.md'), 'utf8');

  it('copies the follow lines verbatim from docs/writing/bram.md', () => {
    for (const line of BRAM_FOLLOW_LINES) expect(doc).toContain(`"${line}"`);
  });

  it('copies the hold lines verbatim from docs/writing/bram.md', () => {
    for (const line of BRAM_HOLD_LINES) expect(doc).toContain(`"${line}"`);
  });
});
