import { describe, expect, it } from 'vitest';
import { BANDITS, type PlaceId } from '../../data/bandits';
import { ASSIGNMENTS, PLACE_DAYS, GUARD_CHANGES } from '../../data/place_days';
import {
  changeAt, expectedAtChange, isGuardChangeMoment, missingAtChange, patrolSpotAt, placeDayAt, routeCycle, routineOf, scheduleFor,
} from './day';
import type { Routine } from './schedules';

const PLACES: PlaceId[] = ['mill', 'forge', 'watch_house'];
/** Every minute of a day, as hours. */
const MINUTES = Array.from({ length: 1440 }, (_, i) => i / 60 + 0.5 / 60);
/** Minutes on the clock, as hours, for a given hh:mm. */
const at = (h: number, m = 0, s = 0) => h + m / 60 + s / 3600;

function routineFor(id: string, hour: number): Routine {
  return routineOf(id, hour);
}
function garrisonIds(place: PlaceId, retaken = false): string[] {
  return BANDITS.filter(b => b.placeId === place && b.garrison === (retaken ? 'retaken' : 'first')).map(b => b.id);
}
function torchesAt(place: PlaceId, retaken: boolean, hour: number): number {
  return garrisonIds(place, retaken).filter(id => routineFor(id, hour).torch).length;
}

describe('assignments and data', () => {
  it('every bandit in the roster has a day assignment, and no other ids do', () => {
    const roster = BANDITS.map(b => b.id).sort();
    expect(Object.keys(ASSIGNMENTS).sort()).toEqual(roster);
  });

  it('every spot a bandit uses is named in their place', () => {
    for (const b of BANDITS) {
      const place = PLACE_DAYS[b.placeId];
      const a = ASSIGNMENTS[b.id];
      const used = [
        a.day.kind === 'patrol' ? undefined : a.day.spot,
        a.night.kind === 'watch' ? a.night.spot : undefined,
        b.habit?.where,
      ].filter((x): x is string => Boolean(x));
      for (const spot of used) expect(place.spots, `${b.id} at ${spot}`).toContain(spot);
    }
  });

  it('every patrol stop is a spot of its place, and every cycle divides a day', () => {
    for (const p of PLACES) {
      for (const route of PLACE_DAYS[p].routes) {
        expect(86400 % routeCycle(route), route.id).toBe(0);
        for (const stop of route.stops) expect(PLACE_DAYS[p].spots, `${route.id}`).toContain(stop.spot);
      }
    }
  });

  it('patrol assignments name a route their place has', () => {
    for (const b of BANDITS) {
      const a = ASSIGNMENTS[b.id];
      if (a.day.kind !== 'patrol') continue;
      expect(PLACE_DAYS[b.placeId].routes.map(r => r.id)).toContain(a.day.route);
    }
  });

  it('guard changes sit on the clock hours the design names, with an 8 s gap', () => {
    expect(GUARD_CHANGES.hours).toEqual([18, 0]);
    expect(GUARD_CHANGES.gapSeconds).toBe(8);
  });
});

describe('patrol routes', () => {
  it('walks its stops in order and restarts cleanly each day', () => {
    const route = PLACE_DAYS.mill.routes[0]; // yard 600, mill_gate 600, wheel 600
    expect(patrolSpotAt(route, 0)).toBe('yard');
    expect(patrolSpotAt(route, 599)).toBe('yard');
    expect(patrolSpotAt(route, 600)).toBe('mill_gate');
    expect(patrolSpotAt(route, 1200)).toBe('wheel');
    expect(patrolSpotAt(route, 1800)).toBe('yard');
    expect(patrolSpotAt(route, 86400)).toBe('yard');
  });

  it('a phase offsets the cycle', () => {
    const route = PLACE_DAYS.mill.routes[0];
    expect(patrolSpotAt(route, 0, 600)).toBe('mill_gate');
  });

  it('Harl walks the yard round at 10:12 and reaches the mill gate at 10:12', () => {
    expect(routineOf('harl_gadd', at(10, 12)).activity).toBe('patrol');
    expect(routineOf('harl_gadd', at(10, 12)).locationId).toBe('mill_gate');
  });
});

describe('by time of day, hour by hour', () => {
  it('no one is on night watch with a torch during the day', () => {
    for (const p of PLACES) for (const retaken of [false, true]) {
      for (const hour of [7.5, 12.5, 15.5, 20.5]) expect(torchesAt(p, retaken, hour), `${p} ${hour}`).toBe(0);
    }
  });

  it('two or three torches burn through the night at the Mill, the Forge and the Watch-house', () => {
    for (const hour of [21.5, 22.5, 1.5, 3.5, 5.5]) {
      const first = torchesAt('mill', false, hour);
      expect(first, `mill first ${hour}`).toBeGreaterThanOrEqual(2);
      expect(first, `mill first ${hour}`).toBeLessThanOrEqual(3);
      expect(torchesAt('mill', true, hour), `mill retaken ${hour}`).toBe(2);
      expect(torchesAt('forge', false, hour), `forge ${hour}`).toBe(2);
      expect(torchesAt('watch_house', false, hour), `watch-house ${hour}`).toBeGreaterThanOrEqual(2);
      expect(torchesAt('watch_house', false, hour), `watch-house ${hour}`).toBeLessThanOrEqual(3);
    }
  });

  it('workers eat at the fire at midday and dusk', () => {
    expect(routineFor('hob_tarn', at(12, 30)).locationId).toBe('fire');
    expect(routineFor('hob_tarn', at(12, 30)).activity).toBe('eat');
    expect(routineFor('pim', at(18, 30)).activity).toBe('eat');
    expect(routineFor('pim', at(18, 30)).locationId).toBe('fire');
  });

  it('non-workers never eat', () => {
    for (const b of BANDITS) {
      if (ASSIGNMENTS[b.id].day.kind === 'work') continue;
      for (const hour of MINUTES) {
        if (isGuardChangeMoment(hour)) continue;
        expect(routineFor(b.id, hour).activity, `${b.id} at ${hour}`).not.toBe('eat');
      }
    }
  });

  it('sleepers lie in bed at 03:30, when nothing overrides them', () => {
    expect(routineFor('pim', at(3, 30))).toMatchObject({ activity: 'sleep', locationId: 'bed' });
    expect(routineFor('dob_finch', at(3, 30))).toMatchObject({ activity: 'sleep', locationId: 'bed' });
  });

  it('Brock stands at the mill door all day and all night, with a torch at night', () => {
    for (const hour of MINUTES) {
      if (isGuardChangeMoment(hour)) continue;
      const r = routineFor('brock_tull', hour);
      expect(r.locationId, `${hour}`).toBe('mill_door');
    }
    expect(routineFor('brock_tull', at(22, 30)).torch).toBe(true);
    expect(routineFor('brock_tull', at(3, 30)).torch).toBe(true);
  });

  it('Tom takes the midnight watch at the back gate', () => {
    expect(routineFor('tom_sable', at(0, 30)).locationId).toBe('back_gate');
    expect(routineFor('tom_sable', at(0, 30)).activity).toBe('habit');
  });
});

describe('guard changes', () => {
  it('detects the 8 s gap at 18:00 and at midnight, and nowhere else', () => {
    expect(isGuardChangeMoment(at(17, 59, 59))).toBe(false);
    expect(isGuardChangeMoment(at(18, 0, 0))).toBe(true);
    expect(isGuardChangeMoment(at(18, 0, 7))).toBe(true);
    expect(isGuardChangeMoment(at(18, 0, 8))).toBe(false);
    expect(isGuardChangeMoment(at(0, 0, 3))).toBe(true);
    expect(changeAt(at(0, 0, 3))).toBe(0);
    expect(changeAt(at(12))).toBeNull();
  });

  it('Nessa leaves her gate at 18:00:00 and is back by 18:00:20', () => {
    expect(routineFor('nessa_roke', at(18, 0, 0)).activity).toBe('guard_change');
    expect(routineFor('nessa_roke', at(18, 0, 20))).toMatchObject({ activity: 'watch', locationId: 'mill_gate' });
  });

  it('Harl walks the yard at each change, and does not leave the yard for it', () => {
    expect(routineFor('harl_gadd', at(18, 0, 30))).toMatchObject({ activity: 'habit', locationId: 'yard' });
    expect(routineFor('harl_gadd', at(0, 0, 30))).toMatchObject({ activity: 'habit', locationId: 'yard' });
    expect(routineFor('harl_gadd', at(0, 2, 30)).torch).toBe(true);
  });

  it('a missing guard is noticed at the change, not at other times', () => {
    expect(missingAtChange('mill', false, at(0, 0, 4), ['harl_gadd'])).toEqual(['nessa_roke']);
    expect(missingAtChange('mill', false, at(18, 0, 4), ['harl_gadd'])).toEqual(['nessa_roke']);
    expect(missingAtChange('mill', false, at(23, 59), ['harl_gadd'])).toEqual([]);
    expect(missingAtChange('mill', false, at(12), [])).toEqual([]);
    expect(missingAtChange('mill', false, at(0, 0, 4), ['harl_gadd', 'nessa_roke'])).toEqual([]);
  });

  it('the guards expected at a change are those on watch one minute before it', () => {
    expect(expectedAtChange('mill', false, 18)).toContain('nessa_roke');
    expect(expectedAtChange('mill', false, 18)).not.toContain('wyll_carrow');
  });
});

describe('placeDayAt', () => {
  it('lists every member of a garrison with a routine', () => {
    const day = placeDayAt('mill', true, at(12));
    expect(Object.keys(day).sort()).toEqual(garrisonIds('mill', true).sort());
  });
});

describe('schedules stay valid', () => {
  it('every routine location and every spot used by a schedule is a spot of its place', () => {
    for (const b of BANDITS) {
      const spots = PLACE_DAYS[b.placeId].spots;
      for (const hour of MINUTES) {
        const r = routineFor(b.id, hour);
        if (r.activity === 'guard_change') continue;
        expect(spots, `${b.id} at ${hour}`).toContain(r.locationId);
      }
    }
  });

  it('every schedule has a fallback with a spot', () => {
    for (const b of BANDITS) expect(scheduleFor(b.id).fallback.locationId).toBeTruthy();
  });

  it('the minute grid covers a whole day', () => {
    expect(MINUTES).toHaveLength(1440);
  });
});
