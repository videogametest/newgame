import { COMBAT_DEPTH_TUNING as DEPTH } from './data';
import type { ArrowType } from './data';
import { probability } from './archery';
import { randomStep } from './random';

export interface Quiver {
  capacity: number;
  arrows: Record<ArrowType, number>;
}
export interface RecoverableArrow {
  id: string;
  type: ArrowType;
  location: 'ground' | 'scenery' | 'enemy';
  landedAt: number;
  broken: boolean;
  pickedUp: boolean;
}
export function arrowCount(quiver: Quiver): number {
  return Object.values(quiver.arrows).reduce((sum, count) => sum + count, 0);
}
export function emptyQuiver(capacity: number = DEPTH.quiverCapacity): Quiver {
  return { capacity: Math.max(0, Math.floor(capacity)), arrows: { standard: 0, fire: 0, blunt: 0, whistling: 0 } };
}
export function addArrows(quiver: Quiver, type: ArrowType, count: number) {
  const accepted = Math.min(Math.max(0, Math.floor(count)), Math.max(0, quiver.capacity - arrowCount(quiver)));
  return { quiver: { ...quiver, arrows: { ...quiver.arrows, [type]: quiver.arrows[type] + accepted } }, accepted };
}
export function looseArrow(quiver: Quiver, type: ArrowType) {
  if (quiver.arrows[type] <= 0) return { quiver, fired: false };
  return { quiver: { ...quiver, arrows: { ...quiver.arrows, [type]: quiver.arrows[type] - 1 } }, fired: true };
}

/** Roll breakage once, at impact, not every time pickup is attempted. Misses survive. */
export function landArrow(arrow: Omit<RecoverableArrow, 'broken' | 'pickedUp'>, seed: number, breakChance: number = DEPTH.hitArrowBreakChance) {
  if (arrow.location !== 'enemy') return { arrow: { ...arrow, broken: false, pickedUp: false }, seed };
  const roll = randomStep(seed);
  return { arrow: { ...arrow, broken: roll.value < probability(breakChance), pickedUp: false }, seed: roll.seed };
}

/**
 * Recovery over simulation time is physical pickup, never passive regeneration.
 * Caller provides proximity/interaction and whether the struck enemy has fallen.
 * An intact arrow left by a full quiver stays in the world for a later attempt.
 */
export function recoverArrow(quiver: Quiver, arrow: RecoverableArrow, now: number, canPickUp: boolean, enemyFallen: boolean) {
  if (!canPickUp || now < arrow.landedAt || arrow.broken || arrow.pickedUp ||
      (arrow.location === 'enemy' && !enemyFallen)) return { quiver, arrow, recovered: false };
  const added = addArrows(quiver, arrow.type, 1);
  return { quiver: added.quiver, arrow: added.accepted ? { ...arrow, pickedUp: true } : arrow, recovered: added.accepted === 1 };
}
