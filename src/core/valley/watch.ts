// Standing watch (GAME_DESIGN.md section 9, "Standing watch"). Claude's. After the finale the valley is safe, and
// stays safe: nothing ever attacks unless the hero asks for it. A hero who wants a fight stands watch at a freed
// place at dusk, and Stane's stragglers come down from the hills that night. Nothing can be lost by it.
import type { UnitType } from '../../data/bandits';

export const WATCH_TUNING = {
  /** The hours in which a watch can be taken up: from dusk until the windows are lit. */
  from: 18,
  until: 19,
  /** The hour the stragglers arrive. */
  raidHour: 23,
  /** How hard each watch is as a lesson, 0 to 1, by how many have been won. The last entry repeats. */
  difficulty: [0.7, 0.8, 0.9, 1, 1], // untuned placeholder
} as const;

/** Who comes, by how many watches the hero has won. The last entry repeats. Unnamed stragglers: none can be won back. */
export const WATCH_PARTIES: readonly (readonly UnitType[])[] = [
  ['soldier', 'soldier', 'archer', 'runner'],
  ['soldier', 'soldier', 'archer', 'archer', 'shield_bearer'],
  ['soldier', 'archer', 'archer', 'shield_bearer', 'shield_bearer', 'brute'],
  ['soldier', 'soldier', 'archer', 'archer', 'shield_bearer', 'brute', 'brute'],
  ['soldier', 'soldier', 'archer', 'archer', 'shield_bearer', 'shield_bearer', 'brute', 'brute'],
];

export interface WatchState {
  /** Watches the hero has stood and won. */
  won: number;
  /** The day of the last watch taken up, so there is one a night at most. */
  lastDay: number | null;
  /** The place being watched tonight, until the night is over. */
  tonight: string | null;
}
export const newWatch = (): WatchState => ({ won: 0, lastDay: null, tonight: null });

export interface WatchFacts {
  storyMoments: readonly string[];
  /** Place id to its status. */
  places: Readonly<Record<string, 'held' | 'freed'>>;
  day: number;
  timeOfDay: number;
}

export type WatchRefusal = 'not_yet' | 'not_freed' | 'wrong_hour' | 'already_tonight';

/** Whether standing watch is offered at all: only once Stane has yielded. Before that the story sets every fight. */
export const watchOpen = (storyMoments: readonly string[]): boolean => storyMoments.includes('stane_yields');

/** Take up a watch at a freed place's lantern at dusk. This is the only thing in the game that brings a raid. */
export function standWatch(watch: WatchState, placeId: string, f: WatchFacts, t = WATCH_TUNING): { ok: true; watch: WatchState } | { ok: false; reason: WatchRefusal } {
  if (!watchOpen(f.storyMoments)) return { ok: false, reason: 'not_yet' };
  if (f.places[placeId] !== 'freed') return { ok: false, reason: 'not_freed' };
  if (watch.lastDay === f.day) return { ok: false, reason: 'already_tonight' };
  if (f.timeOfDay < t.from || f.timeOfDay >= t.until) return { ok: false, reason: 'wrong_hour' };
  return { ok: true, watch: { ...watch, lastDay: f.day, tonight: placeId } };
}

/** Who comes tonight, and how much the fight can teach. Null if no watch is being stood: then nobody comes, ever. */
export function raidTonight(watch: WatchState, t = WATCH_TUNING): { placeId: string; hour: number; party: readonly UnitType[]; difficulty: number } | null {
  if (watch.tonight === null) return null;
  const tier = Math.min(watch.won, WATCH_PARTIES.length - 1);
  return { placeId: watch.tonight, hour: t.raidHour, party: WATCH_PARTIES[tier], difficulty: t.difficulty[Math.min(watch.won, t.difficulty.length - 1)] };
}

export type WatchOutcome = 'won' | 'hero_fell' | 'hero_left';

/**
 * How the night ended. Whatever happened, the place stays free, its lantern stays lit, and nothing the hero has is
 * lost: if the hero falls or walks away, the household and the bell drive the stragglers off. Only a win counts
 * toward a harder watch next time.
 */
export function endWatch(watch: WatchState, outcome: WatchOutcome): { watch: WatchState; placeStays: 'freed'; loses: readonly never[] } {
  return { watch: { ...watch, tonight: null, won: watch.won + (outcome === 'won' ? 1 : 0) }, placeStays: 'freed', loses: [] };
}
