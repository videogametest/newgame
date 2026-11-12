// Stream H (Claude). The melody as note data, from docs/writing/melody.md. Change the score there first, then here.
// Pure data: no audio, no engine imports.

export type Instrument = 'harp' | 'flute' | 'strings' | 'horn';

/** One note of a part. `start` and `beats` are in beats from the start of the score. */
export interface ScoreNote {
  pitch: string;
  start: number;
  beats: number;
}

export const SCORE = {
  key: 'G major',
  beatsPerBar: 3,
  tempo: 72,
  bars: 8,
  /** Bars of silence before any repeat. */
  restBars: 4,
} as const;

/** The tune, bar by bar: [pitch, beats]. */
const TUNE_BARS: [string, number][][] = [
  [['D4', 1], ['G4', 1], ['B4', 1]],
  [['A4', 2], ['G4', 1]],
  [['E4', 1], ['G4', 1], ['A4', 1]],
  [['D4', 3]],
  [['D4', 1], ['G4', 1], ['B4', 1]],
  [['D5', 2], ['B4', 1]],
  [['A4', 1], ['G4', 1], ['E4', 1]],
  [['G4', 3]],
];

function lay(bars: [string, number][][], firstBar = 0): ScoreNote[] {
  const notes: ScoreNote[] = [];
  bars.forEach((bar, i) => {
    let at = (firstBar + i) * SCORE.beatsPerBar;
    for (const [pitch, beats] of bar) {
      notes.push({ pitch, start: at, beats });
      at += beats;
    }
  });
  return notes;
}

const held = (pitches: string[][]): ScoreNote[] =>
  pitches.flatMap((bar, i) => bar.map(pitch => ({ pitch, start: i * SCORE.beatsPerBar, beats: SCORE.beatsPerBar })));

export const TUNE: readonly ScoreNote[] = lay(TUNE_BARS);
/** Bars 1 and 2: what Hesper hums and what the wren sings. */
export const FIRST_PHRASE: readonly ScoreNote[] = lay(TUNE_BARS.slice(0, 2));

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

/** "A4" is 69. Sharps and flats are both read. */
export function midiOf(pitch: string): number {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(pitch);
  if (!m) throw new Error(`Not a pitch: ${pitch}`);
  const name = FLATS[m[1]] ?? m[1];
  const index = NAMES.indexOf(name);
  if (index < 0) throw new Error(`Not a pitch: ${pitch}`);
  return (Number(m[2]) + 1) * 12 + index;
}

export function pitchOf(midi: number): string {
  return `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export const hertz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

const up = (notes: readonly ScoreNote[], semitones: number): ScoreNote[] =>
  notes.map(n => ({ ...n, pitch: pitchOf(midiOf(n.pitch) + semitones) }));

export interface Layer {
  instrument: Instrument;
  notes: readonly ScoreNote[];
  /** Loudness against the tune, 0 to 1. */
  level: number;
  /** A plucked note rings out on its own; a held one stops when its beats are up. */
  rings: boolean;
}

/** The five layers. Each is added on top of the ones before it. */
export const LAYERS: readonly Layer[] = [
  { instrument: 'harp', rings: true, level: 1, notes: TUNE },
  { instrument: 'harp', rings: true, level: 0.7, notes: held([['G2'], ['D2'], ['C2'], ['D2'], ['G2'], ['G2'], ['C2'], ['G2']]) },
  { instrument: 'flute', rings: false, level: 0.45, notes: up(lay(TUNE_BARS.slice(4), 4), 12) },
  { instrument: 'strings', rings: false, level: 0.35, notes: held([['B3', 'D4'], ['A3', 'D4'], ['G3', 'C4'], ['F#3', 'A3'], ['B3', 'D4'], ['B3', 'G4'], ['G3', 'E4'], ['B3', 'D4']]) },
  { instrument: 'horn', rings: false, level: 0.3, notes: held([['B3'], ['A3'], ['G3'], ['F#3'], ['B3'], ['B3'], ['C4'], ['B3']]) },
];

/** Each character's tone as their text appears. Anyone not named gets A4 or E4, by turns. */
export const CHARACTER_TONES: Readonly<Record<string, string>> = { hesper: 'D4', bram: 'G4', stane: 'B3' };
