// Turns the score into timed notes. Pure: seconds in, a list out. The player schedules the list; a test can read it.
import { CHARACTER_TONES, FIRST_PHRASE, LAYERS, midiOf, SCORE, TUNE, type Instrument, type ScoreNote } from './score';

/** One note to sound. Times are seconds from the start of the piece. */
export interface NoteEvent {
  instrument: Instrument;
  midi: number;
  at: number;
  /** How long it is held. A ringing note may sound for longer. */
  seconds: number;
  /** 0 to 1. */
  gain: number;
  rings: boolean;
}

export interface Piece {
  events: NoteEvent[];
  /** Length of the music itself. */
  seconds: number;
  /** Silence to leave before any repeat. */
  restSeconds: number;
}

/** Each four-bar phrase swells slightly toward its third bar and falls away. */
const SWELL = [0.86, 0.93, 1, 0.84];
const swellAt = (beat: number) => SWELL[Math.floor(beat / SCORE.beatsPerBar) % SWELL.length];

function play(notes: readonly ScoreNote[], instrument: Instrument, tempo: number, level: number, rings: boolean, shift = 0): NoteEvent[] {
  const beat = 60 / tempo;
  return notes.map(n => ({
    instrument, rings, midi: midiOf(n.pitch) + shift, at: n.start * beat, seconds: n.beats * beat, gain: level * swellAt(n.start),
  }));
}

function piece(events: NoteEvent[], bars: number, tempo: number, restBars: number = SCORE.restBars): Piece {
  const bar = SCORE.beatsPerBar * 60 / tempo;
  return { events: events.sort((a, b) => a.at - b.at || a.midi - b.midi), seconds: bars * bar, restSeconds: restBars * bar };
}

/** The melody with the first `layers` layers, 1 to 5. */
export function melody(layers: number): Piece {
  const count = Math.max(1, Math.min(LAYERS.length, Math.floor(layers)));
  return piece(LAYERS.slice(0, count).flatMap(l => play(l.notes, l.instrument, SCORE.tempo, l.level, l.rings)), SCORE.bars, SCORE.tempo);
}

/** The lantern melody: one layer for each place freed; every layer once the Watch-house is freed. */
export function lanternLayers(placesFreed: number, watchHouseFreed: boolean): number {
  return watchHouseFreed ? LAYERS.length : Math.max(1, Math.min(LAYERS.length, placesFreed));
}

/** Wick's theme: layer 1 from the start, then one more at four, eight, twelve, and sixteen lit windows. */
export function wickLayers(litWindows: number): number {
  return 1 + Math.min(4, Math.max(0, Math.floor(litWindows / 4)));
}

/** Hesper's hum: the first phrase alone, low and plain. */
export function hum(): Piece {
  return piece(play(FIRST_PHRASE, 'flute', SCORE.tempo, 0.5, false), 2, SCORE.tempo, 0);
}

/** The wren's song: the first phrase two octaves up and quicker. */
export function wrenSong(): Piece {
  const tempo = SCORE.tempo * 2.5;
  return piece(play(FIRST_PHRASE, 'harp', tempo, 0.5, true, 24), 2, tempo, 0);
}

/** The castle: the tune turned upside down around G4, which lands it in G minor, on low strings alone, slower. */
export function castle(): Piece {
  const tempo = 54;
  const axis = midiOf('G4');
  const turned = TUNE.map(n => ({ ...n, midi: 2 * axis - midiOf(n.pitch) - 12 }));
  const beat = 60 / tempo;
  const events = turned.map((n): NoteEvent => ({
    instrument: 'strings', rings: false, midi: n.midi, at: n.start * beat, seconds: n.beats * beat, gain: 0.6 * swellAt(n.start),
  }));
  return piece(events, SCORE.bars, tempo);
}

/** The short tone that plays as a character's text appears. `turn` alternates the tone for unnamed characters. */
export function characterTone(character: string, turn = 0): NoteEvent {
  const pitch = CHARACTER_TONES[character] ?? (turn % 2 === 0 ? 'A4' : 'E4');
  const instrument: Instrument = character === 'hesper' ? 'flute' : character === 'stane' ? 'horn' : 'harp';
  return { instrument, midi: midiOf(pitch), at: 0, seconds: 0.5, gain: 0.4, rings: instrument === 'harp' };
}

/** When the next repeat of a looping piece should start, given when this one started. */
export function nextStart(startedAt: number, p: Piece): number {
  return startedAt + p.seconds + p.restSeconds;
}
