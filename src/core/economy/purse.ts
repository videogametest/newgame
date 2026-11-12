// Crowns (GAME_DESIGN.md section 6, Money and trade). Whole numbers only.
import type { PlaceState } from '../types';
import type { Beat } from '../progression/pacing';
import { ECONOMY_TUNING, PURSE_BANDS } from './tuning';

export interface Purse {
  carried: number;
  /** In the chest at Hesper's. Safe when the hero falls. */
  stored: number;
}

export const emptyPurse = (): Purse => ({ carried: 0, stored: 0 });

function whole(amount: number): void {
  if (!Number.isInteger(amount) || amount < 0) throw new Error(`Crowns are whole and never negative, got ${amount}`);
}

export function gain(purse: Purse, amount: number): Purse {
  whole(amount);
  return { ...purse, carried: purse.carried + amount };
}

/** Null if the hero is not carrying enough. Stored crowns are not spent from afar. */
export function spend(purse: Purse, amount: number): Purse | null {
  whole(amount);
  return purse.carried >= amount ? { ...purse, carried: purse.carried - amount } : null;
}

/** At the chest. Null if there is not that much to move. */
export function deposit(purse: Purse, amount: number): Purse | null {
  whole(amount);
  return purse.carried >= amount ? { carried: purse.carried - amount, stored: purse.stored + amount } : null;
}
export function withdraw(purse: Purse, amount: number): Purse | null {
  whole(amount);
  return purse.stored >= amount ? { carried: purse.carried + amount, stored: purse.stored - amount } : null;
}

/** Falling costs a share of what the hero carries. "Some of your crowns are gone." */
export function fall(purse: Purse, share: number = ECONOMY_TUNING.deathLoss): { purse: Purse; lost: number } {
  const lost = Math.floor(purse.carried * share);
  return { purse: { ...purse, carried: purse.carried - lost }, lost };
}

/** The Stane fight is retried in place and costs nothing ("You get up."). */
export const fallToStane = (purse: Purse) => ({ purse: { ...purse }, lost: 0 });

/** The tax applies while the Watch-house is held and the cart's last run was not stopped. */
export function taxed(watchHouse: PlaceState, lastCartStopped: boolean): boolean {
  return watchHouse.status !== 'freed' && !lastCartStopped;
}

/** Crowns earned in one day from freed places. A retaken place pays nothing. */
export function dailyIncome(places: readonly PlaceState[], isTaxed: boolean, perPlace: number = ECONOMY_TUNING.incomePerFreedPlace): number {
  const freed = places.filter(p => p.status === 'freed').length;
  return Math.floor(freed * perPlace * (isTaxed ? ECONOMY_TUNING.taxIncome : 1));
}

/**
 * Income is paid each morning into the chest at Hesper's, so it is safe and the hero must come home to use it.
 * `paidThrough` is the last day already paid; returns the new purse and the day paid through.
 */
export function collectIncome(purse: Purse, paidThrough: number, today: number, places: readonly PlaceState[], isTaxed: boolean): { purse: Purse; paidThrough: number; paid: number } {
  const days = Math.max(0, Math.floor(today) - Math.floor(paidThrough));
  const paid = days * dailyIncome(places, isTaxed);
  return { purse: { ...purse, stored: purse.stored + paid }, paidThrough: Math.max(paidThrough, Math.floor(today)), paid };
}

/** Problems with the purse at a story beat. Empty when it is on pace. */
export function checkPurse(beat: Beat, purse: Purse): string[] {
  const total = purse.carried + purse.stored;
  const [lo, hi] = PURSE_BANDS[beat];
  return total < lo || total > hi ? [`${beat}: ${total} crowns, wanted ${lo} to ${hi}`] : [];
}
