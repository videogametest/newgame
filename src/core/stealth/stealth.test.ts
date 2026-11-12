import { describe, expect, it } from 'vitest';
import { advanceAwareness, advanceMarks, isSearching, noticingRate, reaches, reaction, type Observation } from './index';
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
  it.each(['nearby_alert', 'body_found', 'comrade_found', 'geese'] as const)('%s raises alert', kind => {
    expect(advanceAwareness(fresh, observation, 0, [{ kind, position: observation.target }]).awareness).toBe('alert');
  });
  describe('losing the hero', () => {
    const hidden = { ...observation, lineOfSight: false };
    const alert = { awareness: 'alert' as const, notice: t.alertAt, lastKnownPosition: { x: 0, z: 6 } };
    it('an alert enemy searches where the hero was last seen, then drops to suspicious, then returns to routine', () => {
      const searching = advanceAwareness(alert, hidden, 1);
      expect(searching.awareness).toBe('alert');
      expect(isSearching(searching)).toBe(true);
      expect(searching.lastKnownPosition).toEqual({ x: 0, z: 6 });
      const gaveUp = advanceAwareness(alert, hidden, t.searchSeconds);
      expect(gaveUp.awareness).toBe('suspicious');
      const calm = advanceAwareness(gaveUp, hidden, t.suspiciousSeconds);
      expect(calm).toMatchObject({ awareness: 'unaware', notice: 0 });
      expect(calm.lastKnownPosition).toBeUndefined();
    });
    it('notice drains while unseen and builds again when seen', () => {
      const half = { awareness: 'unaware' as const, notice: 0.8 };
      expect(advanceAwareness(half, hidden, 1).notice).toBeLessThan(0.8);
      expect(advanceAwareness(half, observation, 1).notice).toBeGreaterThan(0.8);
      expect(advanceAwareness(half, hidden, 1000).notice).toBe(0);
    });
    it('being seen again resets the search', () => {
      const searching = advanceAwareness(alert, hidden, t.searchSeconds - 1);
      const seen = advanceAwareness(searching, observation, 0.1);
      expect(seen.unseenSeconds).toBe(0);
      expect(advanceAwareness(seen, hidden, t.searchSeconds - 1).awareness).toBe('alert');
    });
    it('Grass Ghost halves the search: a factor of one half gives up in half the time', () => {
      expect(advanceAwareness(alert, hidden, t.searchSeconds / 2, [], t, 1).awareness).toBe('alert');
      expect(advanceAwareness(alert, hidden, t.searchSeconds / 2, [], t, 0.5).awareness).toBe('suspicious');
    });
    it('nothing found is forgotten: an enemy who found a body never goes back to routine', () => {
      const found = advanceAwareness(fresh, hidden, 0, [{ kind: 'body_found', position: { x: 1, z: 1 } }]);
      expect(found.awareness).toBe('alert');
      let s = found;
      for (let i = 0; i < 50; i++) s = advanceAwareness(s, hidden, 5);
      expect(s.awareness).toBe('suspicious');
    });
    it('a noise carries only as far as its radius, and walls do not stop it', () => {
      const near = { kind: 'noise' as const, position: { x: 0, z: 5 }, radius: 8 };
      const far = { kind: 'noise' as const, position: { x: 0, z: 30 }, radius: 8 };
      expect(reaches(near, hidden.observer)).toBe(true);
      expect(reaches(far, hidden.observer)).toBe(false);
      expect(advanceAwareness(fresh, hidden, 0, [near]).awareness).toBe('suspicious');
      expect(advanceAwareness(fresh, hidden, 0, [far]).awareness).toBe('unaware');
      expect(advanceAwareness(fresh, hidden, 0, [{ kind: 'noise', position: { x: 0, z: 300 } }]).awareness).toBe('suspicious');
    });
    it('ignores negative time', () => {
      expect(advanceAwareness(fresh, observation, -1)).toMatchObject(fresh);
    });
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
    expect(reaction('alert', false)).toBe('attack_and_alert_nearby');
    expect(reaction('alert', true)).toBe('return_home');
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
