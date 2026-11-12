import type { PlaceState } from '../types';
import type { Awareness } from '../stealth';

/** Serializable local state; not wired into GameState until integration. */
export interface BellState {
  runnerId: string | null;
  rung: boolean;
}
export interface BellInput {
  /** Selection is an AI decision supplied by the caller, not a random roll. */
  volunteer: { id: string; awareness: Awareness } | null;
  runnerCanAct: boolean;
  runnerAtBell: boolean;
}
/** §5. One alarm episode; repeat ringing/cooldowns are deliberately deferred.
 * Reinforcement roster, travel, and difficulty multipliers belong to integration. */
export function advanceBell(state: BellState, place: PlaceState, input: BellInput): {
  state: BellState;
  callReinforcements: boolean;
} {
  if (state.rung) return { state: { ...state }, callReinforcements: false };
  if (place.status !== 'held' || place.bellSilenced) {
    return { state: { runnerId: null, rung: false }, callReinforcements: false };
  }
  const runnerId = state.runnerId ?? (input.volunteer?.awareness === 'alert' ? input.volunteer.id : null);
  if (!runnerId || !input.runnerCanAct) return { state: { runnerId: null, rung: false }, callReinforcements: false };
  if (!input.runnerAtBell) return { state: { runnerId, rung: false }, callReinforcements: false };
  return { state: { runnerId: null, rung: true }, callReinforcements: true };
}

/** Missing guards are only checked at an actual guard change (§5). */
export function missingGuards(expected: readonly string[], present: readonly string[], guardChange: boolean): string[] {
  return guardChange ? [...new Set(expected)].filter(id => !present.includes(id)) : [];
}

/** Other held places gain one extra night watch, not one per capture (§5). */
export function nightWatchCount(base: number, thisPlace: PlaceState, places: readonly PlaceState[]): number {
  return base + (thisPlace.status === 'held' && places.some(p => p.id !== thisPlace.id && p.timesFreed > 0) ? 1 : 0);
}
