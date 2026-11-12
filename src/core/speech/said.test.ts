import { describe, expect, it } from 'vitest';
import { writtenGroup } from '../people/dialogue';
import { emptySpeechLog, gameHour, nextLine, SPEECH_TUNING, type SpeechLog } from './said';

const ask = (log: SpeechLog, now: number, extra = {}) => nextLine(log, { speaker: 'tamsin', group: 'tamsin.field', count: 3, now, ...extra });

describe('nobody repeats themselves', () => {
  it('says every line of a group once, in the order written, before any is said again', () => {
    let log = emptySpeechLog();
    const said: number[] = [];
    for (let hour = 0; hour < 9; hour += 3) { const r = ask(log, hour)!; said.push(r.index); log = r.log; }
    expect(said).toEqual([0, 1, 2]);
  });
  it('goes quiet when a group has run out, and starts again only after a full day', () => {
    let log = emptySpeechLog();
    for (let hour = 0; hour < 9; hour += 3) log = ask(log, hour)!.log;
    expect(ask(log, 12)).toBeNull();
    expect(ask(log, 23)).toBeNull();
    expect(ask(log, 24)?.index).toBe(0);
  });
  it('one speaker does not talk again too soon, and nobody talks over anybody', () => {
    const log = ask(emptySpeechLog(), 10)!.log;
    expect(ask(log, 10 + SPEECH_TUNING.speakerGapHours - 0.1)).toBeNull();
    expect(nextLine(log, { speaker: 'garrick', group: 'garrick.field', count: 3, now: 10.1 })).toBeNull();
    expect(nextLine(log, { speaker: 'garrick', group: 'garrick.field', count: 3, now: 10 + SPEECH_TUNING.companyGapHours })?.index).toBe(0);
  });
  it('a shout in a fight ignores the quiet, never the no-repeat rule', () => {
    let log = emptySpeechLog();
    const fight = (now: number) => nextLine(log, { speaker: 'tamsin', group: 'tamsin.fight', count: 2, now, urgent: true });
    log = fight(1)!.log; log = fight(1.01)!.log;
    expect(fight(1.02)).toBeNull();
  });
  it('is the same every time, changes nothing it was given, and survives a save', () => {
    const log = emptySpeechLog();
    const a = ask(log, 5)!;
    expect(ask(log, 5)).toEqual(a);
    expect(log).toEqual(emptySpeechLog());
    expect(ask(JSON.parse(JSON.stringify(a.log)), 8)?.index).toBe(1);
    expect(nextLine(log, { speaker: 'x', group: 'empty', count: 0, now: 0 })).toBeNull();
    expect(gameHour(1, 18)).toBe(18);
    expect(gameHour(3, 6)).toBe(54);
  });
});

describe('the company has things to say', () => {
  it('every companion has lines for what they notice, and every pair has an exchange on the road', () => {
    const who = ['tamsin', 'tobin', 'oona', 'garrick'];
    for (const w of who) for (const what of ['sees.shot', 'sees.spared', 'sees.secret', 'at.night']) {
      expect(writtenGroup({ source: 'companions', group: `${w}.${what}` }).length, `${w}.${what}`).toBeGreaterThan(0);
    }
    const all = ['bram', ...who];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const lines = writtenGroup({ source: 'companions', group: `road.${all[i]}.${all[j]}` });
      expect(lines.length, `road.${all[i]}.${all[j]}`).toBeGreaterThanOrEqual(2);
      for (const l of lines) expect(l.speaker, l.text).toBeDefined();
    }
  });
  it('nobody in the game counts the dead aloud', () => {
    expect(writtenGroup({ source: 'hesper', group: 'hesper.mercy.none' })).toEqual([]);
    expect(writtenGroup({ source: 'bram', group: 'bram.fight.won.killing' })).toEqual([]);
    expect(writtenGroup({ source: 'hesper', group: 'hesper.bandit.friend' }).length).toBeGreaterThan(0);
  });
});
