/** All time arguments are in-game hours, matching shared GameState.timeOfDay. */
export interface Routine {
  activity: 'wake' | 'work' | 'patrol' | 'eat' | 'sleep' | 'watch' | 'gather' | 'home' | 'habit' | 'guard-change';
  locationId: string;
  routeId?: string;
  torch?: boolean;
}
export interface ScheduleEntry {
  start: number;
  end: number;
  routine: Routine;
}
export interface Schedule {
  fallback: Routine;
  /** Later entries override earlier entries, so habits can override a meal. */
  entries: readonly ScheduleEntry[];
}
export function hourOfDay(hour: number): number {
  return ((hour % 24) + 24) % 24;
}
/** Half-open intervals, wrapping midnight. Equal endpoints mean all day. */
export function during(hour: number, start: number, end: number): boolean {
  const h = hourOfDay(hour), a = hourOfDay(start), b = hourOfDay(end);
  return a === b || (a < b ? h >= a && h < b : h >= a || h < b);
}
export function routineAt(schedule: Schedule, hour: number): Routine {
  let result = schedule.fallback;
  for (const entry of schedule.entries) {
    if (during(hour, entry.start, entry.end)) result = entry.routine;
  }
  return { ...result };
}

/** Example authoring data only; no canonical guard allocations/coordinates yet.
 * These clocks are all untuned placeholders. Names refer to writing/bandits.md. */
export const ROUTINE_CLOCK = {
  dawn: 6, // untuned placeholder
  work: 7, // untuned placeholder
  midday: 12, // untuned placeholder
  mealEnd: 13, // untuned placeholder
  dusk: 18, // untuned placeholder
  evening: 19, // untuned placeholder
  night: 21, // untuned placeholder
  beforeDawn: 5, // untuned placeholder
};
const c = ROUTINE_CLOCK;
export const DAY_WORKER: Schedule = {
  fallback: { activity: 'work', locationId: 'workplace' },
  entries: [
    { start: c.midday, end: c.mealEnd, routine: { activity: 'eat', locationId: 'fire' } },
    { start: c.dusk, end: c.evening, routine: { activity: 'eat', locationId: 'fire' } },
    { start: c.night, end: c.dawn, routine: { activity: 'sleep', locationId: 'bed' } },
  ],
};
export const VILLAGER: Schedule = {
  fallback: { activity: 'work', locationId: 'trade' },
  entries: [
    { start: c.dawn, end: c.work, routine: { activity: 'wake', locationId: 'home' } },
    { start: c.dusk, end: c.evening, routine: { activity: 'gather', locationId: 'well' } },
    { start: c.evening, end: c.dawn, routine: { activity: 'home', locationId: 'home' } },
  ],
};
/** Assign to the authored night watch, not every defender. */
export const NIGHT_WATCH: Schedule = {
  fallback: { activity: 'sleep', locationId: 'bed' },
  entries: [
    { start: c.night, end: c.dawn, routine: { activity: 'watch', locationId: 'watch-post', torch: true } },
  ],
};
/** Fixed guard changes temporarily leave a post empty (§5). The outgoing and
 * incoming assignments and gap length are authored data, not chosen here. */
export function withGuardChanges(schedule: Schedule, hours: readonly number[], gapSeconds: number): Schedule {
  return {
    fallback: { ...schedule.fallback },
    entries: [...schedule.entries, ...(gapSeconds > 0 ? hours : []).map(start => ({
      start, end: start + Math.max(0, gapSeconds) / 3600,
      routine: { activity: 'guard-change' as const, locationId: 'off-post' },
    }))],
  };
}
/** Habit entries can be appended to each person's schedule; they are not AI code. */
export const HABITS: Readonly<Record<string, readonly ScheduleEntry[]>> = {
  'dob-finch': [{ start: c.dawn, end: c.work, routine: { activity: 'habit', locationId: 'geese' } }],
  'wyll-carrow': [{ start: c.dusk, end: c.evening, routine: { activity: 'habit', locationId: 'mill-pond' } }],
  'peg-rudge': [{ start: c.beforeDawn, end: c.dawn, routine: { activity: 'habit', locationId: 'forge-fire' } }],
  'tobin-pike': [{ start: c.dusk, end: c.evening, routine: { activity: 'habit', locationId: 'east-fence' } }],
};

/** §4 birds/§5 whistle cause suspicion, not an automatic bell. */
export function birdsStartled(movement: 'crouched' | 'walking' | 'sprinting'): boolean {
  return movement === 'sprinting';
}
/** Geese are quiet only during Dob's feeding habit; creeping past is safe (§4). */
export function geeseRaiseAlarm(runningNearby: boolean, feeding: boolean): boolean {
  return runningNearby && !feeding;
}
