import { describe, expect, it } from 'vitest';
import { addNote, byPerson, byPlace, isKept, NOTES_TUNING, showCatchUp, whereYouLeftOff, type Note } from './notes';
import { migrateSave, newGameState } from '../state';
import { SAVE_VERSION } from '../types';

const note = (lineId: string, over: Partial<Note> = {}): Note => ({ lineId, kind: 'overheard', speakers: ['harl_gadd', 'nessa_roke'], place: 'mill', day: 2, ...over });

describe('notes: what was said and who said it', () => {
  it('keeps what the player may need again, and not passing talk', () => {
    expect(isKept('overheard', 'overheard')).toBe(true);
    expect(isKept('conversation', 'said')).toBe(true);
    expect(isKept('show', 'said')).toBe(true);
    expect(isKept('above_head', 'said')).toBe(false);
    expect(isKept('campfire', 'said')).toBe(false);
    for (const kind of ['thread', 'trace', 'yield'] as const) expect(isKept('above_head', kind)).toBe(true);
  });
  it('keeps each line once, with the day and place it was first heard', () => {
    let notes = addNote([], note('overheard.mill.5'));
    notes = addNote(notes, note('overheard.mill.5', { day: 9, place: 'wick' }));
    expect(notes).toEqual([note('overheard.mill.5')]);
  });
  it('can be read by person and by place, oldest first', () => {
    const notes = [note('a'), note('b', { speakers: ['hesper'], place: 'wick', kind: 'thread', day: 3 }), note('c', { speakers: ['harl_gadd'], day: 4 })];
    expect(byPerson(notes).harl_gadd.map(n => n.lineId)).toEqual(['a', 'c']);
    expect(byPerson(notes).hesper.map(n => n.lineId)).toEqual(['b']);
    expect(byPlace(notes).mill.map(n => n.lineId)).toEqual(['a', 'c']);
  });
  it('a returning player is shown the last few things said, newest first', () => {
    const notes = ['a', 'b', 'c', 'd', 'e'].map((id, i) => note(id, { day: i }));
    expect(whereYouLeftOff(notes).map(n => n.lineId)).toEqual(['e', 'd', 'c']);
    expect(whereYouLeftOff([])).toEqual([]);
    const day = 86_400_000;
    expect(showCatchUp(0, NOTES_TUNING.awayDays * day, notes)).toBe(true);
    expect(showCatchUp(0, day, notes)).toBe(false);
    expect(showCatchUp(null, 99 * day, notes)).toBe(false);
    expect(showCatchUp(0, 99 * day, [])).toBe(false);
  });
  it('is in the save from version 3, and an older save gains it empty', () => {
    expect(SAVE_VERSION).toBe(3);
    const fresh = newGameState(1);
    expect(fresh).toMatchObject({ notes: [], boundBandits: [], speech: { lines: {}, speakers: {}, last: null } });
    const { notes: _n, speech: _s, boundBandits: _b, ...v2 } = { ...fresh, version: 2, heardLines: ['overheard.mill.5'] };
    const up = migrateSave(v2)!;
    expect(up).toMatchObject({ version: 3, notes: [], heardLines: ['overheard.mill.5'] });
    expect(up.speech.last).toBeNull();
  });
});
