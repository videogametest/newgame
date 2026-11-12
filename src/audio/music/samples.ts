// Which recording plays each note. Samples are VSCO 2 Community Edition (CC0); the licence is beside the files.
// A note with no recording of its own plays the nearest one, sped up or slowed down.
// VSCO names its flute, viola, and horn files an octave below what sounds; the pitches here were measured, not read.
import { midiOf, type Instrument } from './score';

const DIR = 'audio/vsco2_ce';

export interface Sample {
  /** Path relative to public/assets. */
  file: string;
  /** The pitch that sounds. */
  midi: number;
}

const set = (prefix: string, pitches: string[]): Sample[] =>
  pitches.map(p => ({ file: `${DIR}/${prefix}_${p.toLowerCase()}.ogg`, midi: midiOf(p) }));

/** Harp: the concert harp. Flute: solo flute with vibrato. Strings: the viola section. Horn: a French horn, sustained. */
export const SAMPLES: Readonly<Record<Instrument, readonly Sample[]>> = {
  harp: set('harp', ['D2', 'A2', 'D4', 'F4', 'A4', 'C5', 'D6', 'A6']),
  flute: set('flute', ['C4', 'E4', 'A4', 'C5', 'E5', 'A5', 'C6']),
  strings: set('strings', ['D3', 'G3', 'B3', 'D4', 'F4']),
  horn: set('horn', ['F3', 'A3', 'C4']),
};

/** The recording to play for a note, and how fast to play it. A rate of 2 is an octave up. */
export function sampleFor(instrument: Instrument, midi: number): { file: string; rate: number; shift: number } {
  const options = SAMPLES[instrument];
  let best = options[0];
  for (const s of options) if (Math.abs(s.midi - midi) < Math.abs(best.midi - midi)) best = s;
  return { file: best.file, rate: 2 ** ((midi - best.midi) / 12), shift: midi - best.midi };
}

export function allSampleFiles(): string[] {
  return Object.values(SAMPLES).flatMap(list => list.map(s => s.file));
}
