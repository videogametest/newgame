// A day at a held place (GAME_DESIGN.md section 5). Pure: no Babylon, no randomness.
// Builds on schedules.ts (routines, habits, guard changes) and reads the authored data in src/data/place_days.ts.
import { banditById, garrisonOf, type BanditDef, type PlaceId } from '../../data/bandits';
import { ASSIGNMENTS, GUARD_CHANGES, PLACE_DAYS, type Assignment, type DayRole, type PatrolRoute, type PlaceDay } from '../../data/place_days';
import { ROUTINE_CLOCK, habitEntries, hourOfDay, routineAt, withGuardChanges, type Routine, type Schedule, type ScheduleEntry } from './schedules';
import { missingGuards } from './alarm';

const SECONDS_PER_DAY = 86400;
const c = ROUTINE_CLOCK;

export function routeCycle(route: PatrolRoute): number {
  return route.stops.reduce((total, stop) => total + stop.seconds, 0);
}

/** The stop a patrol is at, `seconds` into the day. Cycles divide a day, so they restart cleanly at midnight. */
export function patrolSpotAt(route: PatrolRoute, seconds: number, phase = 0): string {
  const cycle = routeCycle(route);
  let t = (((seconds + phase) % cycle) + cycle) % cycle;
  for (const stop of route.stops) {
    if (t < stop.seconds) return stop.spot;
    t -= stop.seconds;
  }
  return route.stops[route.stops.length - 1].spot;
}

function placeDay(placeId: PlaceId): PlaceDay {
  return PLACE_DAYS[placeId];
}

function routeNamed(placeId: PlaceId, id: string): PatrolRoute {
  const route = placeDay(placeId).routes.find(r => r.id === id);
  if (!route) throw new Error(`Unknown patrol route ${id} at ${placeId}`);
  return route;
}

function assignmentOf(id: string): Assignment {
  const a = ASSIGNMENTS[id];
  if (!a) throw new Error(`No day assignment for ${id}`);
  return a;
}

function bandit(id: string): BanditDef {
  const b = banditById(id);
  if (!b) throw new Error(`Unknown bandit ${id}`);
  return b;
}

function dayFallback(placeId: PlaceId, day: DayRole): Routine {
  if (day.kind === 'work') return { activity: 'work', locationId: day.spot };
  if (day.kind === 'post') return { activity: 'watch', locationId: day.spot };
  const route = routeNamed(placeId, day.route);
  return { activity: 'patrol', locationId: route.stops[0].spot, routeId: day.route };
}

/** Spots a bandit holds on their own: their post, night watch, and own patrol stops. */
function ownSpots(placeId: PlaceId, a: Assignment): Set<string> {
  const spots = new Set<string>();
  if (a.day.kind === 'post' || a.day.kind === 'work') spots.add(a.day.spot);
  if (a.day.kind === 'patrol') for (const stop of routeNamed(placeId, a.day.route).stops) spots.add(stop.spot);
  if (a.night.kind === 'watch') spots.add(a.night.spot);
  return spots;
}

/** The full authored schedule for one bandit. Later entries override earlier ones. */
export function scheduleFor(id: string): Schedule {
  const b = bandit(id);
  const a = assignmentOf(id);
  const place = placeDay(b.placeId);
  const entries: ScheduleEntry[] = [];

  // Workers eat at the fire at midday and dusk. Everyone else stays at their post or route.
  if (a.day.kind === 'work') {
    entries.push({ start: c.midday, end: c.mealEnd, routine: { activity: 'eat', locationId: place.fire } });
    entries.push({ start: c.dusk, end: c.evening, routine: { activity: 'eat', locationId: place.fire } });
  }

  // Night role: sleep, or watch with a torch, from night to dawn.
  const nightRoutine: Routine = a.night.kind === 'sleep'
    ? { activity: 'sleep', locationId: place.bed }
    : { activity: 'watch', locationId: a.night.spot, torch: true };
  entries.push({ start: c.night, end: c.dawn, routine: nightRoutine });

  // Habits. An always-habit at the bandit's own post or route is already served by the assignment.
  const covered = ownSpots(b.placeId, a);
  for (const entry of habitEntries(b)) {
    if (b.habit?.when === 'always' && covered.has(b.habit.where)) continue;
    entries.push(entry);
  }

  // Guard-change habit: walks their spot at each change for a short time.
  if (b.habit?.when === 'guard_change') {
    for (const hour of GUARD_CHANGES.hours) {
      entries.push({
        start: hour,
        end: hour + GUARD_CHANGES.habitSeconds / 3600,
        routine: { activity: 'habit', locationId: b.habit.where },
      });
    }
  }

  let schedule: Schedule = { fallback: dayFallback(b.placeId, a.day), entries };
  // Posts and night watches leave their spot empty at each change. Patrols do not hold a post.
  // (A patrol that also keeps the night watch is not held to a post, so it gets no gap.)
  if (a.day.kind !== 'patrol' && (a.day.kind === 'post' || a.night.kind === 'watch')) {
    schedule = withGuardChanges(schedule, GUARD_CHANGES.hours, GUARD_CHANGES.gapSeconds);
  }
  return schedule;
}

/** What a bandit is doing at `hour` (in-game hours, fractions allowed). Patrol locations are resolved to the stop. */
export function routineOf(id: string, hour: number): Routine {
  const b = bandit(id);
  const r = routineAt(scheduleFor(id), hour);
  if (r.activity === 'patrol' && r.routeId) {
    const a = assignmentOf(id);
    const phase = a.day.kind === 'patrol' ? a.day.phase : 0;
    r.locationId = patrolSpotAt(routeNamed(b.placeId, r.routeId), hourOfDay(hour) * 3600, phase);
  }
  return r;
}

/** Everyone in one garrison, with what they are doing at `hour`. */
export function placeDayAt(placeId: PlaceId, retaken: boolean, hour: number): Record<string, Routine> {
  return Object.fromEntries(garrisonOf(placeId, retaken).map(b => [b.id, routineOf(b.id, hour)]));
}

/** Is `hour` inside one of the guard-change gaps? */
export function isGuardChangeMoment(hour: number): boolean {
  return changeAt(hour) !== null;
}

/** The guard change whose gap contains `hour`, or null. */
export function changeAt(hour: number): number | null {
  const t = hourOfDay(hour) * 3600;
  for (const h of GUARD_CHANGES.hours) {
    const d = (t - h * 3600 + SECONDS_PER_DAY) % SECONDS_PER_DAY;
    if (d < GUARD_CHANGES.gapSeconds) return h;
  }
  return null;
}

/** Who should be on post when the change at `changeHour` begins: anyone on watch one minute before it. */
export function expectedAtChange(placeId: PlaceId, retaken: boolean, changeHour: number): string[] {
  const before = changeHour - 60 / 3600;
  return garrisonOf(placeId, retaken)
    .filter(b => routineOf(b.id, before).activity === 'watch')
    .map(b => b.id);
}

/** Missing guards are only reported inside a guard-change gap (§5). */
export function missingAtChange(placeId: PlaceId, retaken: boolean, hour: number, present: readonly string[]): string[] {
  const change = changeAt(hour);
  if (change === null) return [];
  return missingGuards(expectedAtChange(placeId, retaken, change), present, true);
}
