import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../saves/codec';
import { newGameState } from '../state';
import { canLightLantern, lightLantern, millWindowOn } from './lantern';
const lamp = { x: 5, z: 6 };
const ready = () => { const g = newGameState(1066); g.places[0].status = 'cleared'; g.day = 4; return g; };
describe('the lantern ritual', () => {
  it('requires cleared, not held or already freed, and does not mutate on refusal', () => {
    for (const status of ['held', 'freed'] as const) { const g = ready(); g.places[0].status = status; const before = structuredClone(g);
      expect(lightLantern(g, 'mill', lamp, lamp)).toBe(false); expect(g).toEqual(before); }
  });
  it('requires a living hero within reach, and a known place', () => {
    const g = ready(); expect(canLightLantern(g, 'mill', { x: 8, z: 6 }, lamp)).toBe(false);
    expect(lightLantern(g, 'missing', lamp, lamp)).toBe(false); g.hero.hp = 0;
    expect(lightLantern(g, 'mill', lamp, lamp)).toBe(false);
  });
  it('captures exactly once on interact, records day and increments retaking without altering the clock', () => {
    const g = ready(), before = g.timeOfDay;
    expect(lightLantern(g, 'mill', lamp, lamp)).toBe(true);
    expect(g.places[0]).toMatchObject({ status: 'freed', timesFreed: 1, freedDay: 4 });
    expect(lightLantern(g, 'mill', lamp, lamp)).toBe(false); expect(g.timeOfDay).toBe(before);
    g.places[0].status = 'cleared'; expect(lightLantern(g, 'mill', lamp, lamp)).toBe(true); expect(g.places[0].timesFreed).toBe(2);
  });
  it('does not light a window before the first capture', () => { const g = ready(); g.timeOfDay = 22; expect(millWindowOn(g)).toBe(false); });
  it.each([[18.99, false], [19, true], [23.9, true], [0, true], [0.99, true], [1, false], [12, false]])('window clock %s => %s', (hour, on) => {
    const g = ready(); lightLantern(g, 'mill', lamp, lamp); g.timeOfDay = hour as number; expect(millWindowOn(g)).toBe(on);
  });
  it('keeps the recovered window through retaking', () => { const g = ready(); lightLantern(g, 'mill', lamp, lamp); g.places[0].status = 'held'; g.timeOfDay = 22; expect(millWindowOn(g)).toBe(true); });
});

it('the real save codec retains the ritual and recovered window', () => {
  const g = ready(); lightLantern(g, 'mill', lamp, lamp); g.timeOfDay = 22;
  const read = decodeSave(encodeSave(g), 1066);
  expect(read.status).toBe('loaded'); expect(read.state.places[0]).toEqual(g.places[0]); expect(millWindowOn(read.state)).toBe(true);
});
