import { bowDamage, bowSpeed } from '../combat';
import { TUNING } from '../../config/tuning';
import { clamp } from '../vec';
import { ARROW_TYPES, COMBAT_DEPTH_TUNING as DEPTH } from './data';
import type { ArrowType, HitZone, NumericTuning } from './data';

export interface ArrowHit {
  type: ArrowType;
  zone: HitZone;
  helmet: 'none' | 'ordinary' | 'brute';
  fromFront: boolean;
  unaware: boolean;
  /** Stane cannot be surprised (§9). Set from the target's definition. */
  cannotBeSurprised?: boolean;
}

/** Zone classification is supplied by collision data, not invented anatomy. */
export function weakPointMultiplier(hit: ArrowHit, tuning: NumericTuning<typeof DEPTH.weakPoints> = DEPTH.weakPoints): number {
  if (hit.type === 'blunt' || hit.type === 'whistling') return tuning.body;
  if (hit.zone === 'body') return tuning.body;
  // A helmet removes the bonus from the front and above. From behind, the head is still the weak point.
  if (hit.helmet === 'brute' && hit.fromFront) return tuning.bruteFrontHead;
  if (hit.helmet !== 'none' && hit.fromFront) return tuning.helmetHead;
  return tuning.head;
}

export function resolveArrowDamage(baseDamage: number, hit: ArrowHit, tuning: NumericTuning<typeof DEPTH.weakPoints> = DEPTH.weakPoints) {
  const firstStrike = hit.unaware && !hit.cannotBeSurprised;
  return {
    damage: Math.max(0, baseDamage) * ARROW_TYPES[hit.type].damageMultiplier *
      weakPointMultiplier(hit, tuning) * (firstStrike ? tuning.firstStrike : 1),
    instantKnockout: hit.type === 'blunt' && hit.zone === 'head' && firstStrike,
    lethal: ARROW_TYPES[hit.type].lethal,
  };
}

/** Half-open [full draw, full draw + window). Fatigue begins after the window. */
export function drawTiming(elapsed: number, windowMultiplier = 1, tuning: NumericTuning<typeof DEPTH.draw> = DEPTH.draw) {
  const perfectEnd = TUNING.bow.fullDrawTime + tuning.perfectSeconds * Math.max(0, windowMultiplier);
  const perfect = elapsed >= TUNING.bow.fullDrawTime && elapsed < perfectEnd;
  return {
    perfect,
    tired: elapsed >= perfectEnd,
    damage: bowDamage(elapsed) * (perfect ? tuning.damageMultiplier : 1),
    speed: bowSpeed(elapsed),
    gravityMultiplier: perfect ? tuning.gravityMultiplier : 1,
  };
}

/** A dodge starts before impact and within its final window, never after it. */
export function isPerfectDodge(elapsedWindup: number, strikeAt: number, windowMultiplier = 1, seconds: number = DEPTH.dodge.perfectSeconds): boolean {
  return elapsedWindup >= 0 && elapsedWindup < strikeAt &&
    strikeAt - elapsedWindup <= seconds * Math.max(0, windowMultiplier);
}

/** Target-scoped opening: consume on the next damaging hit on that enemy only. */
export function consumeDodgeOpening(openTarget: string | null, hitTarget: string, damage: number, multiplier: number = DEPTH.dodge.criticalMultiplier) {
  const critical = damage > 0 && openTarget === hitTarget;
  return { critical, damage: Math.max(0, damage) * (critical ? multiplier : 1), openTarget: critical ? null : openTarget };
}

export function scaleEnemyStats(base: { health: number; damage: number }, region: { health: number; damage: number }, presetDamage = 1) {
  return { health: base.health * region.health, damage: base.damage * region.damage * presetDamage };
}

/** Utility for configurable chance curves; exported for win-back and recovery. */
export function probability(value: number): number { return clamp(value, 0, 1); }
