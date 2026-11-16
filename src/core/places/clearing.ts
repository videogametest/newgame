// Item 18. The producer of `cleared`: a held place is cleared once every one of its garrison is down.
// Down means dead, knocked out, bound or yielded (design section 9, Monday ruling in docs/tasks/day-2026-11-14.md).
// Only `dead` is produced by the fight today; knocked_out and spared arrive with item 30 (mercy). Lighting the
// lantern stays in lantern.ts and frees the place; this file never sets `freed`.
import { garrisonOf, type PlaceId } from '../../data/bandits';
import type { BanditState, GameState } from '../types';

/** States that count as a defender being down. `bound` and `yielded` are spared (item 30 produces them). */
export const DOWN_STATES: readonly BanditState[] = ['dead', 'knocked_out', 'spared'];

/**
 * Ids of the garrison that holds `placeId` now. A place freed before (timesFreed >= 1) can only be held again
 * after the one story retaking, so a held place with timesFreed >= 1 is held by the retaken garrison (design §9, The turn).
 */
export function garrisonIdsFor(placeId: PlaceId, timesFreed: number): string[] {
  return garrisonOf(placeId, timesFreed >= 1).map(b => b.id);
}

/** True when there is at least one garrison member and every one of them is in a down state. */
export function garrisonDown(bandits: Readonly<Record<string, BanditState>>, garrisonIds: readonly string[]): boolean {
  return garrisonIds.length > 0 && garrisonIds.every(id => {
    const state = bandits[id];
    return state !== undefined && DOWN_STATES.includes(state);
  });
}

/**
 * Moves a held place to cleared when its garrison is all down. Mutates only on success and returns whether it did.
 * A place that is already cleared, freed or unknown is left alone.
 */
export function clearPlaceIfGarrisonDown(game: Pick<GameState, 'places' | 'bandits'>, placeId: PlaceId): boolean {
  const place = game.places.find(p => p.id === placeId);
  if (!place || place.status !== 'held') return false;
  if (!garrisonDown(game.bandits, garrisonIdsFor(placeId, place.timesFreed))) return false;
  place.status = 'cleared';
  return true;
}
