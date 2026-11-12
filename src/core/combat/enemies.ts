import type { ActionPhase, BanditState, PlaceStatus } from '../types';
import type { Weight } from './data';
import { COMBAT_DEPTH_TUNING as DEPTH } from './data';
import { clamp } from '../vec';

export interface StaggerHit {
  weight: Weight;
  phase: ActionPhase;
  damage: number;
  critical: boolean;
  knife?: boolean;
  /** Future companion trait (Garrick) supplied as an explicit rule override. */
  staggersHeavy?: boolean;
  perfectDodgeOnly?: boolean;
  afterPerfectDodge?: boolean;
}
export function shouldStagger(hit: StaggerHit): boolean {
  if (hit.damage <= 0 || hit.phase !== 'windup') return false;
  if (hit.perfectDodgeOnly) return hit.afterPerfectDodge === true;
  // Heavy immunity is the explicit exception to the knife's general interrupt.
  return hit.weight === 'light' || hit.critical || hit.staggersHeavy === true;
}

/** Selection/fairness policy stays with AI; this rule enforces available slots. */
export function mayAttackHero(attackerId: string, activeAttackerIds: readonly string[], commandedGuard = false): boolean {
  const active = new Set(activeAttackerIds);
  return active.has(attackerId) || active.size < (commandedGuard ? DEPTH.attackTurns.commandedGuard : DEPTH.attackTurns.ordinary);
}
export type MoraleEvent = keyof typeof DEPTH.morale;
export function changeMorale(morale: number, event: MoraleEvent, tuning: Readonly<Record<MoraleEvent, number>> = DEPTH.morale): number {
  return clamp(morale + tuning[event], 0, 1);
}

/** Caller supplies per-enemy threshold and flee/surrender choice from data. */
export function moraleReaction(morale: number, threshold: number, reaction: 'flee' | 'surrender', unbreakable = false) {
  return !unbreakable && morale < threshold ? reaction : 'fight';
}

export type HitTool = 'standard' | 'fire' | 'blunt' | 'whistling' | 'blade' | 'knife' | 'shield' | 'stealth_knockout';
const NONLETHAL: readonly HitTool[] = ['blunt', 'shield', 'stealth_knockout'];
export interface DamageTarget { hp: number; state: BanditState; alwaysYields?: boolean; yieldBelowHp?: number }
export function resolveDefeat(target: DamageTarget, damage: number, tool: HitTool, instantKnockout = false) {
  if (target.state !== 'alive' && target.state !== 'spared') {
    return { hp: target.hp, state: target.state, yielded: false, rewardsAllowed: false };
  }
  if (tool === 'whistling' || (damage <= 0 && !instantKnockout)) {
    return { hp: target.hp, state: target.state, yielded: false, rewardsAllowed: false };
  }
  const nonlethal = NONLETHAL.includes(tool);
  const hp = instantKnockout && nonlethal ? 0 : Math.max(0, target.hp - Math.max(0, damage));
  // TODO(design §5/§9): supply the story's low-health yield threshold.
  // Even without it an always-yielding target never dies or is knocked out.
  const yielded = target.alwaysYields === true && hp <= (target.yieldBelowHp ?? 0);
  const state: BanditState = yielded ? 'spared' : hp === 0 ? (nonlethal ? 'knocked_out' : 'dead') : target.state;
  return { hp, state, yielded, rewardsAllowed: target.state !== 'spared' };
}
export function wakeBandit(state: BanditState, placeStatus: PlaceStatus, allyPresent: boolean): BanditState {
  return state === 'knocked_out' && placeStatus === 'held' && allyPresent ? 'alive' : state;
}
