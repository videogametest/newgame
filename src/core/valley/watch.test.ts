import { describe, expect, it } from 'vitest';
import { endWatch, newWatch, raidTonight, standWatch, WATCH_PARTIES, WATCH_TUNING, watchOpen, type WatchFacts } from './watch';
import { migrateSave, newGameState } from '../state';

const facts = (over: Partial<WatchFacts> = {}): WatchFacts => ({
  storyMoments: ['first_lantern', 'stane_yields'], places: { mill: 'freed', forge: 'freed', watch_house: 'freed' }, day: 30, timeOfDay: 18.2, ...over,
});

describe('standing watch: raids only ever by invitation', () => {
  it('nobody comes unless the hero stands watch', () => {
    expect(raidTonight(newWatch())).toBeNull();
    expect(newGameState(1).watch).toEqual(newWatch());
  });
  it('is not offered until Stane has yielded: before that the story sets every fight', () => {
    expect(watchOpen(['first_lantern', 'the_turn_survived'])).toBe(false);
    expect(standWatch(newWatch(), 'mill', facts({ storyMoments: [] }))).toEqual({ ok: false, reason: 'not_yet' });
  });
  it('is taken up at a freed place, at dusk, once a night', () => {
    expect(standWatch(newWatch(), 'mill', facts({ places: { mill: 'held' } }))).toEqual({ ok: false, reason: 'not_freed' });
    expect(standWatch(newWatch(), 'mill', facts({ timeOfDay: 12 }))).toEqual({ ok: false, reason: 'wrong_hour' });
    expect(standWatch(newWatch(), 'mill', facts({ timeOfDay: WATCH_TUNING.until }))).toEqual({ ok: false, reason: 'wrong_hour' });
    const taken = standWatch(newWatch(), 'mill', facts());
    expect(taken).toMatchObject({ ok: true, watch: { tonight: 'mill', lastDay: 30 } });
    if (!taken.ok) throw new Error('unreachable');
    expect(standWatch(endWatch(taken.watch, 'won').watch, 'forge', facts())).toEqual({ ok: false, reason: 'already_tonight' });
    expect(standWatch(endWatch(taken.watch, 'won').watch, 'forge', facts({ day: 31 })).ok).toBe(true);
  });
  it('each watch won brings a larger, harder party, up to the last', () => {
    let watch = newWatch();
    const sizes: number[] = [];
    const lessons: number[] = [];
    for (let night = 0; night < 7; night++) {
      const taken = standWatch(watch, 'forge', facts({ day: 40 + night }));
      if (!taken.ok) throw new Error(taken.reason);
      const raid = raidTonight(taken.watch)!;
      expect(raid.placeId).toBe('forge');
      sizes.push(raid.party.length); lessons.push(raid.difficulty);
      watch = endWatch(taken.watch, 'won').watch;
    }
    for (let i = 1; i < sizes.length; i++) { expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1]); expect(lessons[i]).toBeGreaterThanOrEqual(lessons[i - 1]); }
    expect(sizes[0]).toBe(4);
    expect(sizes[6]).toBe(WATCH_PARTIES[WATCH_PARTIES.length - 1].length);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(8);
  });
  it('nothing can be lost: whatever happens, the place stays free, and only a win makes the next one harder', () => {
    const taken = standWatch(newWatch(), 'mill', facts());
    if (!taken.ok) throw new Error('unreachable');
    for (const outcome of ['won', 'hero_fell', 'hero_left'] as const) {
      const end = endWatch(taken.watch, outcome);
      expect(end.placeStays).toBe('freed');
      expect(end.loses).toEqual([]);
      expect(end.watch.tonight).toBeNull();
      expect(end.watch.won).toBe(outcome === 'won' ? 1 : 0);
    }
  });
  it('an older save gains it, untouched', () => {
    const { watch: _w, ...old } = newGameState(3);
    expect(migrateSave(old)!.watch).toEqual(newWatch());
  });
});
