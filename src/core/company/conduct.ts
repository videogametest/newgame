// How companions carry themselves so they are never in the hero's way (GAME_DESIGN.md section 5, "Companions are
// never in the way"). Claude's. Pure rules for whoever drives the company in the world.
import type { Awareness } from '../stealth';

export const CONDUCT_TUNING = {
  /** Paces behind the hero while the hero is crouched: close enough to be seen, not far enough to feel alone. */
  crouchedFollow: 3, // untuned placeholder
  /** Paces behind the hero otherwise. */
  follow: 5, // untuned placeholder
  /** A companion standing where the hero is trying to walk steps aside within this long. */
  stepAsideSeconds: 0.3, // untuned placeholder
} as const;

export type SquadOrder = 'follow' | 'hold';

/**
 * Companions never give the hero away. Until some enemy is alert to the hero, no enemy sees, hears, or reacts to a
 * companion: they are not in any enemy's observation, make no noise, and do not startle birds or geese.
 */
export function enemiesSenseCompanions(awarenessOfHero: readonly Awareness[]): boolean {
  return awarenessOfHero.includes('alert');
}

/**
 * Companions never start a fight and never fight one for the hero. They attack only once the fight has begun (an
 * enemy is alert, or the hero has struck), and under "hold here" they defend themselves and do not advance.
 */
export function companionMayAttack(order: SquadOrder, fightBegun: boolean, attackedThemselves: boolean): boolean {
  if (!fightBegun) return false;
  return order === 'follow' || attackedThemselves;
}

/** How far behind the hero a companion keeps. */
export function followDistance(heroCrouched: boolean): number {
  return heroCrouched ? CONDUCT_TUNING.crouchedFollow : CONDUCT_TUNING.follow;
}

/**
 * Where a companion may stand. Never in a doorway, a gate, a gap in a fence, or on a narrow path; never between
 * the hero's drawn bow and its mark. The hero walks through companions, who then step aside.
 */
export function companionMayStand(spot: { doorway: boolean; narrow: boolean; inLineOfFire: boolean }): boolean {
  return !spot.doorway && !spot.narrow && !spot.inLineOfFire;
}

/** A fallen companion never needs rescuing: they are wounded, out of the fight, and back on their feet at the next rest. */
export const FALLEN_NEEDS_RESCUE = false;
