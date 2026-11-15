import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONDUCT_TUNING } from '../company/conduct';
import {
  ARRIVE_DISTANCE,
  BRAM_FOLLOW_LINES,
  BRAM_HOLD_LINES,
  followSpot,
  nextOrder,
  stepCompanion,
} from './companion';
import type { WalkRules } from './walk';

const flat: WalkRules = {
  heightAt: () => 2,
  blocked: () => false,
  inside: () => true,
};

// Hero at the origin facing +z (yaw 0), so "behind" is -z.
const hero = { x: 0, z: 0, yaw: 0 };

describe('followSpot', () => {
  it('keeps a standing companion 5 m behind the hero', () => {
    const s = followSpot(hero, false);
    expect(s.x).toBeCloseTo(0, 9);
    expect(s.z).toBeCloseTo(-CONDUCT_TUNING.follow, 9);
  });

  it('keeps a companion 3 m behind when the hero is crouched', () => {
    const s = followSpot(hero, true);
    expect(s.z).toBeCloseTo(-CONDUCT_TUNING.crouchedFollow, 9);
  });

  it('turns with the hero: behind a hero facing +x is -x', () => {
    const s = followSpot({ x: 10, z: 10, yaw: Math.PI / 2 }, false);
    expect(s.x).toBeCloseTo(10 - CONDUCT_TUNING.follow, 9);
    expect(s.z).toBeCloseTo(10, 9);
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
    const step = stepCompanion({ x: 0, z: 20 }, hero, false, 'follow', 5.4, 1 / 60, flat);
    expect(step.moving).toBe(true);
    expect(step.z).toBeLessThan(20);
    expect(step.z).toBeGreaterThan(19);
    expect(step.y).toBe(2);
  });

  it('stops once inside the arrival distance', () => {
    const spot = followSpot(hero, false);
    const near = { x: spot.x + ARRIVE_DISTANCE * 0.5, z: spot.z };
    const step = stepCompanion(near, hero, false, 'follow', 5.4, 1 / 60, flat);
    expect(step.moving).toBe(false);
    expect(step.x).toBe(near.x);
    expect(step.z).toBe(near.z);
  });

  it('never overshoots his spot, however large the step', () => {
    const spot = followSpot(hero, false);
    const start = { x: 0, z: spot.z + 0.8 };
    const step = stepCompanion(start, hero, false, 'follow', 5.4, 10, flat);
    const left = Math.hypot(step.x - spot.x, step.z - spot.z);
    expect(left).toBeLessThan(1e-9);
    // And it did not pass the spot to the far side.
    expect(step.z).toBeGreaterThanOrEqual(spot.z - 1e-9);
  });

  it('never moves faster than its maximum speed', () => {
    const start = { x: 0, z: 40 };
    const dt = 1 / 60;
    const step = stepCompanion(start, hero, false, 'follow', 5.4, dt, flat);
    expect(Math.hypot(step.x - start.x, step.z - start.z)).toBeLessThanOrEqual(5.4 * dt + 1e-9);
  });

  it('never moves on hold, however far he is from his spot', () => {
    const start = { x: 3, z: 40 };
    const step = stepCompanion(start, hero, false, 'hold', 5.4, 1, flat);
    expect(step.moving).toBe(false);
    expect(step.x).toBe(3);
    expect(step.z).toBe(40);
  });

  it('does nothing on a zero time step', () => {
    const step = stepCompanion({ x: 0, z: 20 }, hero, false, 'follow', 5.4, 0, flat);
    expect(step.moving).toBe(false);
    expect(step.z).toBe(20);
  });

  it('reaches his crouched spot as the hero crouches, at the shorter distance', () => {
    const start = { x: 0, z: 0 };
    let pos: { x: number; z: number } = start;
    for (let i = 0; i < 600; i++) pos = stepCompanion(pos, hero, true, 'follow', 5.4, 1 / 60, flat);
    // He stops inside the arrival distance of his spot, which is 3 m behind, not 5.
    expect(Math.abs(pos.z + CONDUCT_TUNING.crouchedFollow)).toBeLessThanOrEqual(ARRIVE_DISTANCE);
    expect(pos.z).toBeGreaterThan(-CONDUCT_TUNING.follow);
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
