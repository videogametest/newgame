import { describe, expect, it } from 'vitest';
import { advanceAwareness, advanceMarks, noticingRate, reaction, type Observation } from './index';
import { STEALTH_TUNING as t } from './tuning';

const observation: Observation = {
  observer: { x: 0, z: 0 }, yaw: 0, target: { x: 0, z: 6 },
  lineOfSight: true, movement: 'walking', tallGrass: false, night: false, illuminated: false,
};
const fresh = { awareness: 'unaware' as const, notice: 0 };
describe('§5 noticing', () => {
  it('decreases continuously with distance and stops at range', () => {
    expect(noticingRate(observation)).toBeGreaterThan(noticingRate({ ...observation, target: { x: 0, z: 12 } }));
    expect(noticingRate({ ...observation, target: { x: 0, z: t.range } })).toBe(0);
  });
  it('cannot see through scenery', () => {
    expect(noticingRate({ ...observation, lineOfSight: false })).toBe(0);
  });
  it('requires facing and handles yaw wrap', () => {
    expect(noticingRate({ ...observation, yaw: Math.PI })).toBe(0);
    expect(noticingRate({ ...observation, yaw: 2 * Math.PI })).toBe(noticingRate(observation));
  });
  it('has no undefined heading for coincident positions', () => {
    expect(noticingRate({ ...observation, target: observation.observer })).toBe(t.noticePerSecond);
  });
  it('night hides, but illumination cancels the night advantage', () => {
    expect(noticingRate({ ...observation, night: true })).toBeLessThan(noticingRate(observation));
    expect(noticingRate({ ...observation, night: true, illuminated: true })).toBe(noticingRate(observation));
  });
  it('grass reduces visibility', () => {
    expect(noticingRate({ ...observation, tallGrass: true })).toBeLessThan(noticingRate(observation));
  });
  it('movement and the still crouched cloak matter even in the open', () => {
    const rate = (movement: Observation['movement']) => noticingRate({ ...observation, movement });
    expect(rate('crouchedStill')).toBeLessThan(rate('crouched'));
    expect(rate('still')).toBeLessThan(rate('walking'));
    expect(rate('crouched')).toBeLessThan(rate('walking'));
    expect(rate('walking')).toBeLessThan(rate('sprinting'));
  });
});
describe('§5 awareness and reactions', () => {
  it('moves through exactly unaware, suspicious, alert', () => {
    const suspicious = advanceAwareness(fresh, observation, t.suspiciousAt / noticingRate(observation));
    expect(suspicious.awareness).toBe('suspicious');
    expect(advanceAwareness(suspicious, observation, t.alertAt / noticingRate(observation)).awareness).toBe('alert');
  });
  it('whistling/startled birds cause investigation, not immediate alert', () => {
    const next = advanceAwareness(fresh, { ...observation, lineOfSight: false }, 1, [{ kind: 'noise', position: { x: 4, z: 3 } }]);
    expect(next.awareness).toBe('suspicious');
    expect(next.lastKnownPosition).toEqual({ x: 4, z: 3 });
    expect(reaction(next.awareness, false)).toBe('investigate');
  });
  it.each(['nearby-alert', 'body-found', 'comrade-found', 'geese'] as const)('%s raises alert', kind => {
    expect(advanceAwareness(fresh, observation, 0, [{ kind, position: observation.target }]).awareness).toBe('alert');
  });
  it('does not guess search timeouts or alert reset rules', () => {
    const alert = { awareness: 'alert' as const, notice: t.alertAt };
    expect(advanceAwareness(alert, { ...observation, lineOfSight: false }, 100).awareness).toBe('alert');
    expect(advanceAwareness(fresh, observation, -1)).toEqual(fresh);
  });
  it('is timestep invariant and does not mutate inputs', () => {
    const before = JSON.stringify([fresh, observation]);
    let split = advanceAwareness(fresh, observation, 1);
    split = advanceAwareness(split, observation, 1);
    expect(split).toEqual(advanceAwareness(fresh, observation, 2));
    expect(JSON.stringify([fresh, observation])).toBe(before);
  });
  it('returns home beyond the caller-computed leash; suspicious turns to investigate', () => {
    expect(reaction('unaware', false)).toBe('routine');
    expect(reaction('suspicious', false)).toBe('investigate');
    expect(reaction('alert', false)).toBe('attack-and-alert-nearby');
    expect(reaction('alert', true)).toBe('return-home');
  });
});
describe('§5 marking', () => {
  const empty = () => ({ focusId: null, heldSeconds: 0, remaining: {} });
  it('requires a continuous bow zoom hold', () => {
    const a = advanceMarks(empty(), 'a', t.markHoldSeconds / 2);
    expect(a.newlyMarked).toEqual([]);
    expect(advanceMarks(a.state, 'a', t.markHoldSeconds / 2).newlyMarked).toEqual(['a']);
  });
  it('resets hold on target switch or loss', () => {
    const a = advanceMarks(empty(), 'a', t.markHoldSeconds / 2);
    expect(advanceMarks(a.state, 'b', t.markHoldSeconds / 2).newlyMarked).toEqual([]);
    expect(advanceMarks(a.state, null, 1).state.heldSeconds).toBe(0);
  });
  it('keeps outlines through scenery until duration expires', () => {
    const a = advanceMarks(empty(), 'a', t.markHoldSeconds);
    expect(advanceMarks(a.state, null, t.markDurationSeconds / 2).state.remaining.a).toBeGreaterThan(0);
    expect(advanceMarks(a.state, null, t.markDurationSeconds).state.remaining).toEqual({});
  });
  it('refreshes an existing mark without repeated achievement events', () => {
    const a = advanceMarks(empty(), 'a', t.markHoldSeconds);
    expect(advanceMarks(a.state, 'a', 1).newlyMarked).toEqual([]);
    expect(a.state.remaining.a).toBe(t.markDurationSeconds);
  });
});
