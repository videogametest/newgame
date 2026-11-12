import { describe, expect, it } from 'vitest';
import type { PlaceState } from '../types';
import { advanceBell, missingGuards, nightWatchCount } from './alarm';
import { cartPositionAt, taxCartRoute } from './cart';
import {
  birdsStartled, DAY_WORKER, during, geeseRaiseAlarm, HABITS, hourOfDay,
  NIGHT_WATCH, ROUTINE_CLOCK as c, routineAt, VILLAGER, withGuardChanges,
} from './schedules';

const held: PlaceState = { id: 'mill', status: 'held', timesFreed: 0, bellSilenced: false, morale: 1 };
const bell = { runnerId: null, rung: false };
const input = { volunteer: { id: 'pim', awareness: 'alert' as const }, runnerCanAct: true, runnerAtBell: false };
describe('§5 bell and reactions', () => {
  it.each(['unaware', 'suspicious'] as const)('no bell runner while %s', awareness => {
    expect(advanceBell(bell, held, { ...input, volunteer: { id: 'pim', awareness } }).state.runnerId).toBeNull();
  });
  it('an alert enemy may run, but must reach the bell', () => {
    const a = advanceBell(bell, held, input);
    expect(a.state.runnerId).toBe('pim');
    expect(a.callReinforcements).toBe(false);
    expect(advanceBell(a.state, held, { ...input, runnerAtBell: true }).callReinforcements).toBe(true);
  });
  it('can stop the runner before ringing', () => {
    const a = advanceBell(bell, held, input);
    expect(advanceBell(a.state, held, { ...input, runnerCanAct: false, runnerAtBell: true }))
      .toEqual({ state: bell, callReinforcements: false });
  });
  it('does not emit reinforcements repeatedly for the same episode', () => {
    const a = advanceBell(bell, held, { ...input, runnerAtBell: true });
    expect(advanceBell(a.state, held, input).callReinforcements).toBe(false);
    expect(bell).toEqual({ runnerId: null, rung: false });
  });
  it('only held places with an audible bell can ring', () => {
    for (const place of [{ ...held, bellSilenced: true }, { ...held, status: 'cleared' as const }, { ...held, status: 'freed' as const }]) {
      expect(advanceBell(bell, place, { ...input, runnerAtBell: true }).callReinforcements).toBe(false);
    }
  });
  it('notices missing guards only at the next change', () => {
    expect(missingGuards(['a', 'b', 'b'], ['a'], false)).toEqual([]);
    expect(missingGuards(['a', 'b', 'b'], ['a'], true)).toEqual(['b']);
  });
  it('adds one extra night watch after another place is freed, even if retaken', () => {
    expect(nightWatchCount(2, held, [held])).toBe(2);
    const forge = { ...held, id: 'forge', timesFreed: 1 };
    expect(nightWatchCount(2, held, [held, forge, { ...forge, id: 'watch' }])).toBe(3);
    expect(nightWatchCount(2, { ...held, status: 'freed' }, [forge])).toBe(2);
  });
});
describe('§5 schedules and §9 daily life', () => {
  it('wraps days and negative hours', () => {
    expect(hourOfDay(30)).toBe(6);
    expect(hourOfDay(-1)).toBe(23);
  });
  it('has exact half-open boundaries including midnight', () => {
    expect(during(21, 21, 6)).toBe(true);
    expect(during(0, 21, 6)).toBe(true);
    expect(during(6, 21, 6)).toBe(false);
    expect(during(12, 0, 0)).toBe(true);
  });
  it('works by day, eats at midday and dusk, sleeps at night', () => {
    expect(routineAt(DAY_WORKER, 10).activity).toBe('work');
    expect(routineAt(DAY_WORKER, c.midday).activity).toBe('eat');
    expect(routineAt(DAY_WORKER, c.dusk).activity).toBe('eat');
    expect(routineAt(DAY_WORKER, 23).activity).toBe('sleep');
  });
  it('night watch carries torches and is distinct from sleepers', () => {
    expect(routineAt(NIGHT_WATCH, 23)).toMatchObject({ activity: 'watch', torch: true });
    expect(routineAt(NIGHT_WATCH, 10).activity).toBe('sleep');
  });
  it('habits override routines without mutating the base', () => {
    expect(routineAt({ ...DAY_WORKER, entries: [...DAY_WORKER.entries, ...HABITS['wyll_carrow']] }, c.dusk))
      .toMatchObject({ activity: 'habit', locationId: 'mill_pond' });
    expect(routineAt(DAY_WORKER, c.dusk).activity).toBe('eat');
  });
  it('includes the written feeding, solitary fishing, pre-dawn fire, and fence habits', () => {
    for (const [id, hour, locationId] of [
      ['dob_finch', c.dawn, 'geese'], ['wyll_carrow', c.dusk, 'mill_pond'],
      ['peg_rudge', c.beforeDawn, 'forge_fire'], ['tobin_pike', c.dusk, 'east_fence'],
    ] as const) {
      expect(routineAt({ ...DAY_WORKER, entries: HABITS[id] }, hour).locationId).toBe(locationId);
    }
  });
  it('leaves the post empty for an authored guard-change gap, including midnight', () => {
    const schedule = withGuardChanges(NIGHT_WATCH, [18, 0], 5);
    expect(routineAt(schedule, 0).activity).toBe('guard_change');
    expect(routineAt(schedule, 2 / 3600).activity).toBe('guard_change');
    expect(routineAt(schedule, 6 / 3600).activity).toBe('watch');
    expect(routineAt(withGuardChanges(NIGHT_WATCH, [0], 0), 1).activity).toBe('watch');
  });
  it('villagers wake at dawn, work, gather at dusk, go home at night', () => {
    expect(routineAt(VILLAGER, c.dawn).activity).toBe('wake');
    expect(routineAt(VILLAGER, 10).activity).toBe('work');
    expect(routineAt(VILLAGER, c.dusk)).toEqual({ activity: 'gather', locationId: 'well' });
    expect(routineAt(VILLAGER, 23).activity).toBe('home');
  });
  it('guard-change overlays preserve authored all-day entries', () => {
    const allDay = { ...NIGHT_WATCH, entries: [{ start: 0, end: 0, routine: { activity: 'patrol' as const, locationId: 'yard' } }] };
    expect(routineAt(withGuardChanges(allDay, [18], 5), 10).activity).toBe('patrol');
  });
  it('returned routines do not alias authoring data', () => {
    const routine = routineAt(VILLAGER, 10);
    routine.locationId = 'elsewhere';
    expect(VILLAGER.fallback.locationId).toBe('trade');
  });
  it('sprinting startles birds; creeping and walking do not', () => {
    expect(birdsStartled('sprinting')).toBe(true);
    expect(birdsStartled('crouched')).toBe(false);
    expect(birdsStartled('walking')).toBe(false);
  });
  it('running near geese alerts the Mill except while being fed', () => {
    expect(geeseRaiseAlarm(true, false)).toBe(true);
    expect(geeseRaiseAlarm(false, false)).toBe(false);
    expect(geeseRaiseAlarm(true, true)).toBe(false);
  });
});
describe('§5 tax cart route', () => {
  const anchors = { watchHouse: { x: 0, z: 0 }, ford: { x: 10, z: 5 }, wick: { x: 20, z: 10 } };
  const route = taxCartRoute(anchors);
  const position = (offset: number) => cartPositionAt(route, route.firstDeparture + offset, false);
  it('travels out and back on a data route', () => {
    expect(position(0)).toEqual(anchors.watchHouse);
    expect(position(0.5)).toEqual({ x: 5, z: 2.5 });
    expect(position(2)).toEqual(anchors.wick);
    expect(position(5)).toEqual(anchors.watchHouse);
  });
  it('waters the horse at the ford in each direction', () => {
    expect(position(1.1)).toEqual(anchors.ford);
    expect(position(3.9)).toEqual(anchors.ford);
  });
  it('runs every few days, staying inactive between trips', () => {
    expect(cartPositionAt(route, route.firstDeparture - 1, false)).toBeNull();
    expect(position(6)).toBeNull();
    expect(position(route.repeatHours + 0.5)).toEqual(position(0.5));
  });
  it('stops when freed or when this trip was ambushed', () => {
    expect(cartPositionAt(route, route.firstDeparture, true)).toBeNull();
    expect(cartPositionAt(route, route.firstDeparture, false, true)).toBeNull();
  });
  it('does not alias route positions or world anchors', () => {
    const p = position(0)!;
    p.x = 999;
    expect(position(0)).toEqual(anchors.watchHouse);
  });
  it('empty/degenerate routes safely have no cart', () => {
    expect(cartPositionAt({ ...route, stops: [] }, 9, false)).toBeNull();
    expect(cartPositionAt({ ...route, repeatHours: 0 }, 9, false)).toBeNull();
  });
});
