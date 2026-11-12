import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIRST_PHRASE, hertz, LAYERS, midiOf, pitchOf, SCORE, TUNE } from './score';
import { allSampleFiles, sampleFor, SAMPLES } from './samples';
import { castle, characterTone, hum, lanternLayers, melody, nextStart, wickLayers, wrenSong } from './sequencer';

const beat = 60 / SCORE.tempo;

describe('the score', () => {
  it('reads pitches both ways', () => {
    expect(midiOf('A4')).toBe(69);
    expect(midiOf('C4')).toBe(60);
    expect(midiOf('F#3')).toBe(54);
    expect(midiOf('Eb4')).toBe(63);
    expect(pitchOf(67)).toBe('G4');
    expect(hertz(69)).toBe(440);
    expect(() => midiOf('H2')).toThrow();
  });
  it('is eight bars of three, and every bar is full', () => {
    for (let bar = 0; bar < SCORE.bars; bar++) {
      const inBar = TUNE.filter(n => Math.floor(n.start / 3) === bar);
      expect(inBar.reduce((sum, n) => sum + n.beats, 0)).toBe(3);
    }
    expect(TUNE.map(n => n.pitch).join(' ')).toBe('D4 G4 B4 A4 G4 E4 G4 A4 D4 D4 G4 B4 D5 B4 A4 G4 E4 G4');
  });
  it('the first phrase is bars one and two', () => {
    expect(FIRST_PHRASE.map(n => n.pitch)).toEqual(['D4', 'G4', 'B4', 'A4', 'G4']);
  });
  it('has five layers: the flute waits four bars, then doubles the tune an octave up', () => {
    expect(LAYERS.map(l => l.instrument)).toEqual(['harp', 'harp', 'flute', 'strings', 'horn']);
    const flute = LAYERS[2].notes;
    expect(Math.min(...flute.map(n => n.start))).toBe(12);
    expect(flute.map(n => n.pitch)).toEqual(['D5', 'G5', 'B5', 'D6', 'B5', 'A5', 'G5', 'E5', 'G5']);
    expect(LAYERS[1].notes.map(n => n.pitch)).toEqual(['G2', 'D2', 'C2', 'D2', 'G2', 'G2', 'C2', 'G2']);
    expect(LAYERS[3].notes).toHaveLength(16);
    expect(LAYERS[4].notes.map(n => n.pitch)).toEqual(['B3', 'A3', 'G3', 'F#3', 'B3', 'B3', 'C4', 'B3']);
  });
  it('the tune is always the loudest thing', () => {
    for (const layer of LAYERS.slice(1)) expect(layer.level).toBeLessThan(LAYERS[0].level);
  });
});

describe('the sequencer', () => {
  it('times the melody at 72 beats a minute with four bars of rest', () => {
    const one = melody(1);
    expect(one.events).toHaveLength(TUNE.length);
    expect(one.seconds).toBeCloseTo(24 * beat);
    expect(one.restSeconds).toBeCloseTo(12 * beat);
    expect(one.events[1].at).toBeCloseTo(beat);
    expect(nextStart(10, one)).toBeCloseTo(10 + 36 * beat);
  });
  it('adds layers without changing the ones beneath', () => {
    const tune = melody(1).events;
    for (let n = 2; n <= 5; n++) {
      const more = melody(n).events;
      expect(more.length).toBeGreaterThan(melody(n - 1).events.length);
      for (const e of tune) expect(more).toContainEqual(e);
    }
    expect(melody(0).events).toEqual(tune);
    expect(melody(9).events).toEqual(melody(5).events);
  });
  it('is the same every time', () => {
    expect(melody(5)).toEqual(melody(5));
  });
  it('swells toward the third bar of each phrase and stays soft', () => {
    const g = (bar: number) => melody(1).events.find(e => Math.abs(e.at - bar * 3 * beat) < 1e-9)!.gain;
    expect(g(2)).toBeGreaterThan(g(0));
    expect(g(2)).toBeGreaterThan(g(3));
    expect(g(6)).toBe(g(2));
    for (const e of melody(5).events) expect(e.gain).toBeLessThanOrEqual(1);
  });
  it('the lantern melody gains a layer per place, and all of them at the Watch-house', () => {
    expect([1, 2, 3].map(n => lanternLayers(n, false))).toEqual([1, 2, 3]);
    expect(lanternLayers(0, false)).toBe(1);
    expect(lanternLayers(3, true)).toBe(5);
  });
  it("Wick's theme gains a layer at four, eight, twelve, and sixteen lit windows", () => {
    expect([1, 3, 4, 7, 8, 12, 15, 16, 17].map(wickLayers)).toEqual([1, 1, 2, 2, 3, 4, 4, 5, 5]);
  });
  it("the wren sings Hesper's phrase two octaves up and quicker", () => {
    const h = hum(), w = wrenSong();
    expect(w.events.map(e => e.midi)).toEqual(h.events.map(e => e.midi + 24));
    expect(w.seconds).toBeLessThan(h.seconds / 2);
    expect(h.restSeconds).toBe(0);
  });
  it('the castle is the tune upside down around G4, in G minor, on low strings, slower', () => {
    const c = castle();
    const gMinor = new Set([7, 9, 10, 0, 2, 3, 5]);
    expect(c.events.every(e => e.instrument === 'strings')).toBe(true);
    expect(c.events.every(e => gMinor.has(e.midi % 12))).toBe(true);
    expect(c.seconds).toBeGreaterThan(melody(1).seconds);
    const byTime = [...c.events].sort((a, b) => a.at - b.at).map(e => pitchOf(e.midi + 12));
    expect(byTime.slice(0, 3)).toEqual(['C5', 'G4', 'D#4']);
    expect(pitchOf(c.events[c.events.length - 1].midi + 12)).toBe('G4');
  });
  it('gives each main character a tone from the melody', () => {
    expect(pitchOf(characterTone('hesper').midi)).toBe('D4');
    expect(pitchOf(characterTone('bram').midi)).toBe('G4');
    expect(pitchOf(characterTone('stane').midi)).toBe('B3');
    expect([0, 1].map(t => pitchOf(characterTone('ansa_marrin', t).midi))).toEqual(['A4', 'E4']);
  });
});

describe('the samples', () => {
  it('every recording is in the repo, with its licence', () => {
    for (const file of allSampleFiles()) expect(existsSync(`public/assets/${file}`), file).toBe(true);
    expect(existsSync('public/assets/audio/vsco2_ce/LICENSE.txt')).toBe(true);
  });
  it('plays a recorded note as it is and its neighbours slightly shifted', () => {
    expect(sampleFor('harp', midiOf('D4'))).toMatchObject({ rate: 1, shift: 0 });
    expect(sampleFor('harp', midiOf('G4')).file).toContain('harp_');
    expect(sampleFor('flute', midiOf('C6')).rate).toBe(1);
    expect(sampleFor('harp', midiOf('D5')).rate).toBeCloseTo(2 ** (2 / 12));
  });
  it('no note in any version is stretched more than three semitones', () => {
    for (const piece of [melody(5), hum(), wrenSong(), castle()]) {
      for (const e of piece.events) expect(Math.abs(sampleFor(e.instrument, e.midi).shift), `${e.instrument} ${pitchOf(e.midi)}`).toBeLessThanOrEqual(3);
    }
    expect(Object.keys(SAMPLES)).toEqual(['harp', 'flute', 'strings', 'horn']);
  });
});
