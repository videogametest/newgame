import { angleDelta, yawOf } from '../vec';
import { COMBAT_DEPTH_TUNING as DEPTH } from './data';

/**
 * Short-blade strikes on unaware enemies (GAME_DESIGN section 5, "The first arrow": "A short-blade strike on an
 * unaware enemy from behind does too"). The same first-strike multiplier as an arrow, and only from behind.
 */
export interface BladeHit {
  /** The enemy is unaware of the hero at the moment of the blow. */
  unaware: boolean;
  /** The hero stands in the enemy's rear half-plane. */
  fromBehind: boolean;
  /** Stane cannot be surprised (§9). Set from the target's definition. */
  cannotBeSurprised?: boolean;
}

/** From behind means the hero is more than a right angle away from where the enemy faces. */
export function isBehind(enemyYaw: number, enemyX: number, enemyZ: number, heroX: number, heroZ: number): boolean {
  const toHero = yawOf(heroX - enemyX, heroZ - enemyZ);
  return Math.abs(angleDelta(enemyYaw, toHero)) > Math.PI / 2;
}

/** Damage for one blade blow. Only an unaware enemy struck from behind takes the first-strike increase. */
export function resolveBladeDamage(baseDamage: number, hit: BladeHit, firstStrike: number = DEPTH.weakPoints.firstStrike): number {
  const surprised = hit.unaware && hit.fromBehind && !hit.cannotBeSurprised;
  return Math.max(0, baseDamage) * (surprised ? firstStrike : 1);
}
