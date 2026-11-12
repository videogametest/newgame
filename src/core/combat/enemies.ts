import type { ActionPhase, BanditState, PlaceStatus } from '../types';
import type { Loyalty, Weight } from './data';
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

/** Section 5, "Breaking". Each enemy breaks when the place's morale falls below their own threshold, set by loyalty. */
export function breaks(morale: number, loyalty: Loyalty, unbreakable = false): boolean {
  return !unbreakable && morale < DEPTH.breakBelow[loyalty];
}

/** One who breaks surrenders if their loyalty is low or an enemy is close; otherwise they run. */
export function breakReaction(loyalty: Loyalty, heroOrCompanionClose: boolean): 'surrender' | 'flee' {
  return loyalty === 'low' || heroOrCompanionClose ? 'surrender' : 'flee';
}

/** What an enemy does now, from morale alone. Those who flee are gone from the place and count as returned to Stane. */
export function moraleResponse(morale: number, loyalty: Loyalty, heroOrCompanionClose: boolean, unbreakable = false): 'fight' | 'surrender' | 'flee' {
  return breaks(morale, loyalty, unbreakable) ? breakReaction(loyalty, heroOrCompanionClose) : 'fight';
}

/** A knocked-out enemy found by an ally while the place is still held: up after a few seconds, at half health, alert. */
export function wake(state: BanditState, placeStatus: PlaceStatus, allyPresent: boolean, maxHp: number): { state: BanditState; hp: number; afterSeconds: number; alert: boolean } | null {
  if (state !== 'knocked_out' || placeStatus !== 'held' || !allyPresent) return null;
  return { state: 'alive', hp: Math.max(1, Math.round(maxHp * DEPTH.wake.healthShare)), afterSeconds: DEPTH.wake.seconds, alert: true };
}

/** Stane yields at a quarter health. No blow kills him. */
export function staneYieldBelow(maxHp: number): number {
  return maxHp * DEPTH.staneYieldsAt;
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
