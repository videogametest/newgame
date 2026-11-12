// Notes: a plain record of what was said and who said it (GAME_DESIGN.md section 6, "Seeing it"). Claude's.
// There is no quest log; this is what stands in its place. It never says what to do. It keeps what the player
// was told, so that a thing heard twenty hours ago can be read again.

export type NoteKind =
  /** An exchange between bandits, heard unnoticed. */
  | 'overheard'
  /** Said to the hero in a conversation, or in answer to Show. */
  | 'said'
  /** Hesper's one line at a rest about something left open. */
  | 'thread'
  /** Where someone went when they moved: nobody leaves without a trace. */
  | 'trace'
  /** What a bandit gave up when they yielded. */
  | 'yield';

export interface Note {
  /** The line or exchange id in the writing. One note per id. */
  lineId: string;
  kind: NoteKind;
  /** Who said it: a person id. For an exchange, everyone who spoke. */
  speakers: string[];
  /** Where it was said: a place id. */
  place: string;
  day: number;
}

export type SpeechForm = 'above_head' | 'conversation' | 'campfire' | 'overheard' | 'show';

/**
 * What is kept. Everything said to the hero in a conversation or in answer to Show, every overheard exchange, every
 * loose thread, every trace, every yield. Passing lines above heads, shouts in a fight, and campfire talk are not:
 * the record is for what the player may need again.
 */
export function isKept(form: SpeechForm, kind: NoteKind): boolean {
  if (kind !== 'said') return true;
  return form === 'conversation' || form === 'show';
}

/** Add a note. A line already kept keeps its first day and place, so the record never reorders itself. */
export function addNote(notes: readonly Note[], note: Note): Note[] {
  return notes.some(n => n.lineId === note.lineId) ? [...notes] : [...notes, { ...note, speakers: [...note.speakers] }];
}

/** The Notes tab, by person: for each speaker, what they said, oldest first. */
export function byPerson(notes: readonly Note[]): Record<string, Note[]> {
  const out: Record<string, Note[]> = {};
  for (const n of notes) for (const s of n.speakers) (out[s] ??= []).push(n);
  return out;
}

/** The Notes tab, by place. */
export function byPlace(notes: readonly Note[]): Record<string, Note[]> {
  const out: Record<string, Note[]> = {};
  for (const n of notes) (out[n.place] ??= []).push(n);
  return out;
}

export const NOTES_TUNING = {
  /** How many notes the "where you left off" card shows on Continue. */
  catchUp: 3,
  /** Real days away after which Continue shows the card without being asked. It can always be opened from Notes. */
  awayDays: 3,
} as const;

/** The most recent things said, newest first: what a returning player is shown on Continue. */
export function whereYouLeftOff(notes: readonly Note[], count: number = NOTES_TUNING.catchUp): Note[] {
  return notes.slice(-Math.max(0, count)).reverse();
}

/** Whether Continue should open on the card. `lastPlayed` and `now` are real times in milliseconds. */
export function showCatchUp(lastPlayed: number | null, now: number, notes: readonly Note[]): boolean {
  return lastPlayed !== null && notes.length > 0 && now - lastPlayed >= NOTES_TUNING.awayDays * 86_400_000;
}
