import { describe, expect, it } from 'vitest';
import type { PlaceState } from '../types';
import { advanceAlarm, newAlarm, type ReinforcementPlan } from './reinforcements';

const held: PlaceState = { id: 'mill', status: 'held', timesFreed: 0, bellSilenced: false, morale: 0.5 };
const input = { volunteer: { id: 'runner', awareness: 'alert' as const }, runnerCanAct: true, runnerAtBell: false };
const plan: ReinforcementPlan = { travelSeconds: 3, moraleGain: 0.2, spawns: [
  { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 40, z: 20, yaw: 0 },
] };
const ring = () => advanceAlarm(newAlarm(), held, { ...input, runnerAtBell: true }, 1, plan);

describe('alarm reinforcements', () => {
  it.each(['unaware', 'suspicious'] as const)('no call while %s', awareness => {
    const r = advanceAlarm(newAlarm(), held, { ...input, volunteer: { id: 'runner', awareness } }, 100, plan);
    expect(r.state).toEqual(newAlarm());
    expect(r.spawns).toEqual([]);
  });
  it('a runner has to arrive before travel starts', () => {
    const r = advanceAlarm(newAlarm(), held, input, 100, plan);
    expect(r.state.bell.runnerId).toBe('runner');
    expect(r.state.remaining).toBeNull();
    expect(r.bellRang).toBe(false);
  });
  it('stopping the runner prevents the call and permits a replacement', () => {
    const running = advanceAlarm(newAlarm(), held, input, 1, plan);
    const stopped = advanceAlarm(running.state, held, { ...input, runnerCanAct: false, runnerAtBell: true }, 1, plan);
    expect(stopped.state).toEqual(newAlarm());
    expect(stopped.spawns).toEqual([]);
    expect(advanceAlarm(stopped.state, held, { ...input, runnerAtBell: true }, 1, plan).bellRang).toBe(true);
  });
  it.each([{ ...held, bellSilenced: true }, { ...held, status: 'freed' as const }])('cannot ring a disabled bell', place => {
    const r = advanceAlarm(newAlarm(), place, { ...input, runnerAtBell: true }, 100, plan);
    expect(r.bellRang).toBe(false);
    expect(r.spawns).toEqual([]);
  });
  it('rings once, waits the full travel time, then emits one outside roster and morale event', () => {
    const a = ring();
    expect(a.bellRang).toBe(true);
    expect(a.state.remaining).toBe(3);
    expect(a.spawns).toEqual([]);
    const b = advanceAlarm(a.state, held, input, 2, plan);
    expect(b.state.remaining).toBe(1);
    const c = advanceAlarm(b.state, held, input, 1, plan);
    expect(c.spawns).toEqual(plan.spawns);
    expect(c.moraleDelta).toBe(0.2);
    const d = advanceAlarm(c.state, held, input, 100, plan);
    expect(d.bellRang).toBe(false);
    expect(d.spawns).toEqual([]);
    expect(d.moraleDelta).toBe(0);
  });
  it('a paused zero-time step does not shorten travel', () => {
    expect(advanceAlarm(ring().state, held, input, 0, plan).state.remaining).toBe(3);
  });
  it('silencing after ringing cannot recall a party already called', () => {
    expect(advanceAlarm(ring().state, { ...held, bellSilenced: true }, input, 3, plan).spawns).toHaveLength(1);
  });
  it('freeing the place cancels a pending party permanently for this episode', () => {
    const freed = advanceAlarm(ring().state, { ...held, status: 'freed' }, input, 1, plan);
    expect(freed.spawns).toEqual([]);
    expect(freed.state.remaining).toBeNull();
    expect(advanceAlarm(freed.state, held, input, 10, plan).spawns).toEqual([]);
  });
  it('zero travel delivers immediately and an empty roster gives no morale', () => {
    const a = advanceAlarm(newAlarm(), held, { ...input, runnerAtBell: true }, 0, { ...plan, travelSeconds: 0 });
    expect(a.spawns).toHaveLength(1);
    const b = advanceAlarm(newAlarm(), held, { ...input, runnerAtBell: true }, 0, { ...plan, travelSeconds: 0, spawns: [] });
    expect(b.state.arrived).toBe(true);
    expect(b.moraleDelta).toBe(0);
  });
  it('does not mutate or alias previous state, place, input or authored roster', () => {
    const previous = newAlarm();
    const snapshot = JSON.stringify({ previous, held, input, plan });
    const a = advanceAlarm(previous, held, { ...input, runnerAtBell: true }, 0, { ...plan, travelSeconds: 0 });
    a.spawns[0].x = 999;
    a.state.bell.rung = false;
    expect(JSON.stringify({ previous, held, input, plan })).toBe(snapshot);
    expect(JSON.parse(JSON.stringify(ring().state))).toEqual(ring().state);
  });
  it.each([-1, NaN, Infinity])('rejects invalid time %s', seconds => {
    expect(() => advanceAlarm(newAlarm(), held, input, seconds, plan)).toThrow();
  });
});
