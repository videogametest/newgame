import { describe, expect, it } from 'vitest';
import { garrisonOf } from '../../data/bandits';
import { candidates, nextOverheard, type Listening } from './overheard';
import { HABITS, HABIT_HOURS, habitEntries, routineAt, DAY_WORKER } from './schedules';
import { BANDITS } from '../../data/bandits';

const mill = (over: Partial<Listening> = {}): Listening => ({
  place: 'mill', hour: 12.5, present: garrisonOf('mill').map(b => b.id), saidThisVisit: [], heroCloseAndUnnoticed: true, ...over,
});

describe('overheard lines', () => {
  it('are heard only while the hero is close and unnoticed', () => {
    expect(nextOverheard(mill({ heroCloseAndUnnoticed: false }))).toBeNull();
    expect(nextOverheard(mill())).not.toBeNull();
  });
  it('a tell comes before information, and information before story', () => {
    expect(nextOverheard(mill())!.id).toBe('overheard.mill.3');
    expect(nextOverheard(mill({ saidThisVisit: ['overheard.mill.3'] }))!.id).toBe('overheard.mill.1');
  });
  it('each is said once per visit', () => {
    const said: string[] = [];
    for (let i = 0; i < 10; i++) {
      const line = nextOverheard(mill({ saidThisVisit: said }));
      if (!line) break;
      expect(said).not.toContain(line.id);
      said.push(line.id);
    }
    expect(said.length).toBeGreaterThanOrEqual(2);
    expect(nextOverheard(mill({ saidThisVisit: said }))).toBeNull();
  });
  it('is skipped if a speaker is gone', () => {
    const withoutDob = garrisonOf('mill').map(b => b.id).filter(id => id !== 'dob_finch');
    expect(candidates(mill({ present: withoutDob })).map(l => l.id)).not.toContain('overheard.mill.3');
  });
  it('is said at its time of day', () => {
    const at = (hour: number) => candidates(mill({ hour })).map(l => l.id);
    expect(at(12.5)).toContain('overheard.mill.1');
    expect(at(18.5)).not.toContain('overheard.mill.1');
    expect(at(18.5)).toContain('overheard.mill.4');
    expect(at(23)).toContain('overheard.mill.5');
  });
  it('the retaken Mill says only its own lines', () => {
    const retaken = mill({ retaken: true, hour: 18.5, present: garrisonOf('mill', true).map(b => b.id) });
    expect(candidates(retaken).map(l => l.id).sort()).toEqual(['overheard.mill.retaken.1', 'overheard.mill.retaken.2']);
    expect(candidates(mill({ hour: 18.5 })).some(l => l.id.includes('retaken'))).toBe(false);
  });
  it('Stane speaks only when he is there', () => {
    const hall = { place: 'watch_house' as const, hour: 23, present: ['stane'], saidThisVisit: [], heroCloseAndUnnoticed: true };
    expect(nextOverheard(hall)!.id).toBe('overheard.watch.6');
    expect(nextOverheard({ ...hall, present: [] })).toBeNull();
  });
});

describe('habits, from the bandits data', () => {
  it('every bandit with a habit has schedule entries, except those tied to the guard change', () => {
    for (const b of BANDITS.filter(x => x.habit)) {
      expect(HABITS[b.id], b.id).toBeDefined();
      expect(habitEntries(b).length, b.id).toBe(b.habit!.when === 'guard_change' ? 0 : 1);
    }
    expect(Object.keys(HABITS).length).toBeGreaterThanOrEqual(18);
  });
  it('puts each at their written place at their written time', () => {
    const at = (id: string, hour: number) => routineAt({ ...DAY_WORKER, entries: [...DAY_WORKER.entries, ...HABITS[id]] }, hour).locationId;
    expect(at('bran_oakes', 23)).toBe('woodpile');
    expect(at('tom_sable', 0.5)).toBe('back_gate');
    expect(at('jory_flint', 15)).toBe('rabbit_run');
    expect(at('ilsa_thorn', 3)).toBe('wall_walk');
    expect(at('ilsa_thorn', 15)).toBe('wall_walk');
    expect(at('hob_tarn', 23)).toBe('store_door');
    expect(at('hob_tarn', 10)).toBe('workplace');
    expect(HABIT_HOURS.dusk[0]).toBe(18);
  });
});
