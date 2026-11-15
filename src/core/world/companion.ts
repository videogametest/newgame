// Bram, the companion who follows the hero: where he wants to stand and how he walks there. Pure: no Babylon imports.
// Follow and hold orders are the squad orders from src/core/company/conduct.ts; the distances come from there too.

import { followDistance, type SquadOrder } from '../company/conduct';
import { walkStep, type WalkRules } from './walk';

/** Within this many metres of his spot, a companion counts as arrived and stops. */
export const ARRIVE_DISTANCE = 0.5;

export interface Walker { x: number; z: number }
export interface HeroPose extends Walker { yaw: number }

/** Bram's lines, copied from docs/writing/bram.md (`bram.field.follow`, `bram.field.hold`). Used exactly as written. */
export const BRAM_FOLLOW_LINES = ['With you.', 'About time.'] as const;
export const BRAM_HOLD_LINES = ['Staying. Shout if you die.', 'Right here. Not moving. A rock.'] as const;

/** The spot a companion keeps: directly behind the hero, along his facing (forwardOf: sin yaw, cos yaw). */
export function followSpot(hero: HeroPose, heroCrouched: boolean): Walker {
  const d = followDistance(heroCrouched);
  return { x: hero.x - Math.sin(hero.yaw) * d, z: hero.z - Math.cos(hero.yaw) * d };
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
  heroCrouched: boolean,
  order: SquadOrder,
  maxSpeed: number,
  dt: number,
  rules: WalkRules,
): CompanionStep {
  const still = { x: pos.x, z: pos.z, y: rules.heightAt(pos.x, pos.z), moving: false };
  if (order === 'hold' || dt <= 0 || maxSpeed <= 0) return still;
  const spot = followSpot(hero, heroCrouched);
  const dx = spot.x - pos.x;
  const dz = spot.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= ARRIVE_DISTANCE) return still;
  // Cap the speed so one step covers no more than the distance left: he slows into his spot instead of overshooting.
  const speed = Math.min(maxSpeed, dist / dt);
  const to = walkStep(pos, dx / dist, dz / dist, speed, dt, rules);
  return { x: to.x, z: to.z, y: to.y, moving: true };
}
