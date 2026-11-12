// Winning bandits back (GAME_DESIGN.md section 5). Decided, never rolled: the same choices by the player always give
// the same result. Reworked by Claude for design version 24; the bandits themselves are in src/data/bandits.ts.
import type { BanditState } from '../types';
import type { BanditDef } from '../../data/bandits';
import { closeTo, heardTell } from '../../data/overheard';
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
  /** Where every bandit stands now, by id. Decides who was spared and who was killed among those this one is close to. */
  banditStates: Readonly<Record<string, BanditState>>;
  /** Overheard line ids the hero has heard. A tell that was heard guarantees a spared bandit stays. */
  heard: readonly string[];
}

export interface WinBackTuning {
  recoveryWeight: number;
  mercyWeight: number;
  bar: Readonly<Record<BanditDef['loyalty'], number>>;
}

const KILLED: BanditState = 'dead';

/**
 * Mercy, by who and never by count (design section 5): of the people this bandit is close to, the share who were not
 * killed. A friend still standing, spared, knocked out, or fled counts as alive. Nobody is close to no one.
 */
export function friendsSpared(banditId: string, states: Readonly<Record<string, BanditState>>): number {
  const ties = closeTo(banditId);
  if (ties.length === 0) return 1;
  return ties.filter(id => states[id] !== KILLED).length / ties.length;
}

const unit = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

/** How much the valley offers a bandit to come home to, 0 to 1: recovery, and whether their friends lived. */
export function pull(banditId: string, context: Pick<WinBackContext, 'recovery' | 'banditStates'>, tuning: WinBackTuning = DEPTH.winBack): number {
  return unit(unit(context.recovery) * tuning.recoveryWeight + friendsSpared(banditId, context.banditStates) * tuning.mercyWeight);
}

/** What this bandit will do, known in advance: so the player can be shown nothing and still reason about it. */
export function willStay(bandit: BanditDef, context: Pick<WinBackContext, 'recovery' | 'banditStates' | 'heard'>, tuning: WinBackTuning = DEPTH.winBack): boolean {
  return heardTell(bandit.id, context.heard) || pull(bandit.id, context, tuning) >= tuning.bar[bandit.loyalty];
}

export interface WinBackResult {
  state: BanditState;
  /** 'recruit' means they may be asked into the company, not that they are in it. */
  destination: 'resident' | 'recruit' | null;
  /** Why, for Hesper's line and for tests. */
  because: 'not_yet' | 'tell_heard' | 'cleared_the_bar' | 'friend_killed' | 'fell_short';
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
  if (tell || pull(bandit.id, context, tuning) >= tuning.bar[bandit.loyalty]) {
    const recruitable = bandit.recruitRole !== undefined && (bandit.replaces === undefined || context.banditStates[bandit.replaces] === 'dead');
    return { state: 'stayed', destination: recruitable ? 'recruit' : 'resident', because: tell ? 'tell_heard' : 'cleared_the_bar' };
  }
  // Those who fall short leave the valley, or, if their loyalty is high, go back to Stane.
  const because = friendsSpared(bandit.id, context.banditStates) < 1 ? 'friend_killed' : 'fell_short';
  return { state: bandit.loyalty === 'high' ? 'returned_to_stane' : 'left', destination: null, because };
}
