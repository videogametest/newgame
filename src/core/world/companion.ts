// Bram, the companion who follows the hero: where he wants to stand and how he walks there. Pure: no Babylon imports.
// Follow and hold orders are the squad orders from src/core/company/conduct.ts.

import type { SquadOrder } from '../company/conduct';
import { walkStep, type WalkRules } from './walk';

/** Within this many metres of his spot, a companion counts as arrived and stops. */
export const ARRIVE_DISTANCE = 0.5;

/** Bram stands this far to one side of the hero... */
export const BRAM_SIDE_OFFSET = 2.5;
/** ...and this far behind him, so he never stands between the camera and the hero. */
export const BRAM_BEHIND = 1;

export interface Walker { x: number; z: number }
export interface HeroPose extends Walker { yaw: number }

/** Bram's lines, copied from docs/writing/bram.md (`bram.field.follow`, `bram.field.hold`). Used exactly as written. */
export const BRAM_FOLLOW_LINES = ['With you.', 'About time.'] as const;
export const BRAM_HOLD_LINES = ['Staying. Shout if you die.', 'Right here. Not moving. A rock.'] as const;

/** The spot on one side of the hero: behind him along his facing, and offset along his right (+1) or left (-1). */
function spotOnSide(hero: HeroPose, side: 1 | -1): Walker {
  const forward = { x: Math.sin(hero.yaw), z: Math.cos(hero.yaw) };
  const right = { x: Math.cos(hero.yaw), z: -Math.sin(hero.yaw) };
  return {
    x: hero.x - forward.x * BRAM_BEHIND + side * right.x * BRAM_SIDE_OFFSET,
    z: hero.z - forward.z * BRAM_BEHIND + side * right.z * BRAM_SIDE_OFFSET,
  };
}

/**
 * The spot Bram keeps: 2.5 m to one side of the hero and 1 m behind him. He takes the right side unless that
 * spot is blocked or outside the valley, then the left. With no rules given, the right side.
 * Crouching does not change the spot.
 */
export function followSpot(hero: HeroPose, rules?: WalkRules): Walker {
  const right = spotOnSide(hero, 1);
  if (!rules) return right;
  const clear = (p: Walker): boolean => rules.inside(p.x, p.z) && !rules.blocked(p.x, p.z);
  if (clear(right)) return right;
  const left = spotOnSide(hero, -1);
  if (clear(left)) return left;
  return right;
}

/** The squad order after a Q press: follow becomes hold, hold becomes follow. */
export function nextOrder(order: SquadOrder): SquadOrder {
  return order === 'follow' ? 'hold' : 'follow';
}

export interface CompanionStep extends Walker {
  y: number;
  moving: boolean;
}

/**
 * One fixed step of a companion. On hold he never moves. On follow he walks toward his spot at up to maxSpeed,
 * never past it (so he does not overshoot and jitter), and stops inside ARRIVE_DISTANCE.
 */
export function stepCompanion(
  pos: Walker,
  hero: HeroPose,
  order: SquadOrder,
  maxSpeed: number,
  dt: number,
  rules: WalkRules,
): CompanionStep {
  const still = { x: pos.x, z: pos.z, y: rules.heightAt(pos.x, pos.z), moving: false };
  if (order === 'hold' || dt <= 0 || maxSpeed <= 0) return still;
  const spot = followSpot(hero, rules);
  const dx = spot.x - pos.x;
  const dz = spot.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= ARRIVE_DISTANCE) return still;
  // Cap the speed so one step covers no more than the distance left: he slows into his spot instead of overshooting.
  const speed = Math.min(maxSpeed, dist / dt);
  const to = walkStep(pos, dx / dist, dz / dist, speed, dt, rules);
  return { x: to.x, z: to.z, y: to.y, moving: true };
}
