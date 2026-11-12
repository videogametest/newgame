import type { BanditState, PlaceStatus } from '../types';
import type { Loyalty } from './data';
import { COMBAT_DEPTH_TUNING as DEPTH } from './data';
import { probability } from './archery';
import { randomStep } from './random';

/** Names and trades are definitions, never logic conditions. See bandit-data.ts. */
export interface BanditDef {
  id: string;
  name: string;
  placeId: string;
  loyalty: Loyalty;
  formerTrade: string;
  recruitRole?: 'comrade_knowledge';
  replaces?: string;
}
export interface WinBackContext {
  placeId: string;
  placeStatus: PlaceStatus;
  freedDay: number;
  day: number;
  isMorning: boolean;
  /** Caller normalizes the derived recovery level to [0, 1]. */
  recovery: number;
  /** Snapshot of the OTHER defenders at this place, not the entire valley. */
  fellows: readonly BanditState[];
  /** Only needed to decide a replacement's recruitment eligibility. */
  banditStates?: Readonly<Record<string, BanditState>>;
}
export interface WinBackTuning {
  baseStay: number; recoveryWeight: number; mercyWeight: number;
  loyaltyPenalty: number; returnLoyaltyThreshold: number;
}
export function sparedShare(fellows: readonly BanditState[]): number {
  const spared = fellows.filter(state => state === 'knocked_out' || state === 'spared').length;
  const killed = fellows.filter(state => state === 'dead').length;
  return spared + killed === 0 ? 0 : spared / (spared + killed);
}
/** Provisional monotonic curve only; all weights are marked untuned in data. */
export function stayChance(bandit: BanditDef, context: WinBackContext, tuning: WinBackTuning = DEPTH.winBack): number {
  return probability(tuning.baseStay + probability(context.recovery) * tuning.recoveryWeight +
    sparedShare(context.fellows) * tuning.mercyWeight - DEPTH.loyalty[bandit.loyalty] * tuning.loyaltyPenalty);
}
export function decideWinBack(bandit: BanditDef, state: BanditState, context: WinBackContext, seed: number, tuning: WinBackTuning = DEPTH.winBack) {
  if (bandit.placeId !== context.placeId ||
      (state !== 'knocked_out' && state !== 'spared') || context.placeStatus !== 'freed' ||
      context.day <= context.freedDay || !context.isMorning) {
    return { state, seed, destination: null };
  }
  const roll = randomStep(seed);
  if (roll.value < stayChance(bandit, context, tuning)) {
    const recruitable = bandit.recruitRole !== undefined &&
      (bandit.replaces === undefined || context.banditStates?.[bandit.replaces] === 'dead');
    return { state: 'stayed' as const, seed: roll.seed, destination: recruitable ? 'recruit' as const : 'resident' as const };
  }
  return {
    state: DEPTH.loyalty[bandit.loyalty] >= tuning.returnLoyaltyThreshold ? 'returned_to_stane' as const : 'left' as const,
    seed: roll.seed,
    destination: null,
  };
}
