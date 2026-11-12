// Every number here is an untuned placeholder until task 006 balances it against a full playthrough.
import type { Beat } from '../progression/pacing';

export const ECONOMY_TUNING = {
  /** Crowns a day from each freed place. */
  incomePerFreedPlace: 6,
  /** While the tax cart runs: income is multiplied by this, prices by `taxPrice`, stock by `taxStock`. */
  taxIncome: 0.5,
  taxPrice: 1.25,
  taxStock: 0.5,
  /** What a trader charges, as a multiple of worth, at recovery 0 and at recovery 1. */
  buyMarkup: [1.6, 1.15],
  /** What a trader pays, as a share of worth, at recovery 0 and at recovery 1. */
  sellShare: [0.35, 0.6],
  /** Share of carried crowns lost on falling. Stored crowns are safe. */
  deathLoss: 0.25,
  /** The most that goodwill takes off a trader's price. Selling prices are untouched. */
  goodwillDiscount: 0.1,
  /** Crowns to have a wounded companion tended. */
  tendCompanion: 15,
} as const;

/** Crowns the hero should have, carried and stored together, at each story beat (section 6, "The purse is tested"). */
export const PURSE_BANDS: Record<Beat, [number, number]> = {
  first_lantern: [10, 80],
  forge_freed: [60, 300],
  mill_retaken: [100, 500],
  facing_stane: [150, 800],
  valley_complete: [0, 600],
};
