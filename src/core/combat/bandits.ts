// Winning bandits back (GAME_DESIGN.md section 5). Decided, never rolled: the same choices by the player always give
// the same result. Reworked by Claude for design version 24; the bandits themselves are in src/data/bandits.ts.
import type { BanditState } from '../types';
import type { BanditDef } from '../../data/bandits';
import { heardTell } from '../../data/overheard';
import { COMBAT_DEPTH_TUNING as DEPTH } from './data';

export type { BanditDef } from '../../data/bandits';

export interface WinBackContext {
  /** The place that was freed, and the day its lantern was lit. Null if it has not been. */
  placeId: string;
  freedDay: number | null;
  day: number;
  /** True from dawn onward. The decision is made at the first dawn after the lantern is lit. */
  isMorning: boolean;
  /** The valley recovery level, 0 to 1. */
  recovery: number;
  /** Where every defender of that garrison stands now, this bandit included. */
  garrison: readonly BanditState[];
  /** Overheard line ids the hero has heard. A tell that was heard guarantees a spared bandit stays. */
  heard: readonly string[];
  /** Only needed to decide whether a stand-in may be recruited. */
  banditStates?: Readonly<Record<string, BanditState>>;
}

export interface WinBackTuning {
  recoveryWeight: number;
  mercyWeight: number;
  bar: Readonly<Record<BanditDef['loyalty'], number>>;
}

const BEATEN: readonly BanditState[] = ['dead', 'knocked_out', 'spared', 'stayed', 'left', 'returned_to_stane'];
const SHOWN_MERCY: readonly BanditState[] = ['knocked_out', 'spared', 'stayed', 'left', 'returned_to_stane'];

/** Mercy: the share of a place's beaten defenders who were knocked out or spared rather than killed. */
export function mercyShare(garrison: readonly BanditState[]): number {
  const beaten = garrison.filter(s => BEATEN.includes(s)).length;
  return beaten === 0 ? 0 : garrison.filter(s => SHOWN_MERCY.includes(s)).length / beaten;
}

const unit = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

/** How much the valley offers a bandit to come home to, 0 to 1: recovery and mercy together. */
export function pull(context: Pick<WinBackContext, 'recovery' | 'garrison'>, tuning: WinBackTuning = DEPTH.winBack): number {
  return unit(unit(context.recovery) * tuning.recoveryWeight + mercyShare(context.garrison) * tuning.mercyWeight);
}

/** What this bandit will do, known in advance: so the player can be shown nothing and still reason about it. */
export function willStay(bandit: BanditDef, context: Pick<WinBackContext, 'recovery' | 'garrison' | 'heard'>, tuning: WinBackTuning = DEPTH.winBack): boolean {
  return heardTell(bandit.id, context.heard) || pull(context, tuning) >= tuning.bar[bandit.loyalty];
}

export interface WinBackResult {
  state: BanditState;
  /** 'recruit' means they may be asked into the company, not that they are in it. */
  destination: 'resident' | 'recruit' | null;
  /** Why, for Hesper's line and for tests. */
  because: 'not_yet' | 'tell_heard' | 'cleared_the_bar' | 'fell_short';
}

/**
 * Decide once, at the first dawn after the place's lantern was lit. Whatever happens to the place afterwards does
 * not change it: a bandit taken to Wick decides even if the place is retaken that night.
 */
export function decideWinBack(bandit: BanditDef, state: BanditState, context: WinBackContext, tuning: WinBackTuning = DEPTH.winBack): WinBackResult {
  const due = context.freedDay !== null && (context.day > context.freedDay + 1 || (context.day === context.freedDay + 1 && context.isMorning));
  if (bandit.placeId !== context.placeId || (state !== 'knocked_out' && state !== 'spared') || !due) {
    return { state, destination: null, because: 'not_yet' };
  }
  const tell = heardTell(bandit.id, context.heard);
  if (tell || pull(context, tuning) >= tuning.bar[bandit.loyalty]) {
    const recruitable = bandit.recruitRole !== undefined && (bandit.replaces === undefined || context.banditStates?.[bandit.replaces] === 'dead');
    return { state: 'stayed', destination: recruitable ? 'recruit' : 'resident', because: tell ? 'tell_heard' : 'cleared_the_bar' };
  }
  // Those who fall short leave the valley, or, if their loyalty is high, go back to Stane.
  return { state: bandit.loyalty === 'high' ? 'returned_to_stane' : 'left', destination: null, because: 'fell_short' };
}
