import { describe, expect, it } from 'vitest';
import { takeLesson, TEACHERS } from './lessons';
import { createProgression } from './skills';
import { HOUSEHOLDS } from '../people/households';

describe('teachers: one free lesson from each tradesperson who comes home', () => {
  it('every teacher is a real household', () => {
    for (const id of Object.keys(TEACHERS)) expect(HOUSEHOLDS.some(h => h.id === id), id).toBe(true);
  });
  it('raises a skill that is behind by one level, once', () => {
    const state = createProgression();
    state.skills.archery.level = 9;
    state.skills.smithing.xp = 12;
    const r = takeLesson(state, 'aldrics', ['aldrics'], []);
    expect(r).toMatchObject({ ok: true, skill: 'smithing', level: 2, taken: ['aldrics'] });
    expect(state.skills.smithing).toEqual({ level: 2, xp: 0 });
    expect(takeLesson(state, 'aldrics', ['aldrics'], ['aldrics'])).toEqual({ ok: false, reason: 'already_taken' });
  });
  it('is not spent when it would not help, so it can never be wasted', () => {
    const state = createProgression();
    state.skills.smithing.level = 9;
    expect(takeLesson(state, 'aldrics', ['aldrics'], [])).toEqual({ ok: false, reason: 'nothing_to_teach' });
    state.skills.archery.level = 12;
    expect(takeLesson(state, 'aldrics', ['aldrics'], []).ok).toBe(true);
  });
  it('needs the household home, and never passes the region cap', () => {
    const state = createProgression();
    state.skills.archery.level = 9;
    expect(takeLesson(state, 'aldrics', [], [])).toEqual({ ok: false, reason: 'not_home' });
    expect(takeLesson(state, 'wains', ['wains'], [])).toEqual({ ok: false, reason: 'no_teacher' });
    const capped = createProgression(5);
    capped.skills.smithing.level = 5; capped.skills.archery.level = 5;
    expect(takeLesson(capped, 'aldrics', ['aldrics'], []).ok).toBe(false);
  });
});
