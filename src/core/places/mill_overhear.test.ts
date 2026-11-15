import { describe, expect, it } from 'vitest';
import { MillOverhearing, nameOf, resolveLines, type OverhearInput, type OverhearMember, type SpokenLine } from './mill_overhear';
import { OVERHEARD } from '../../data/overheard';

// Midday, Harl and Bran only: overheard.mill.1 is the only exchange that fits.
const HARL = 'harl_gadd';
const BRAN = 'bran_oakes';
const EXCHANGE = 'overheard.mill.1';
const def = OVERHEARD.find(o => o.id === EXCHANGE)!;

const words = (lines: SpokenLine[] = [{ speaker: '{A}', text: 'one' }, { speaker: '{B}', text: 'two' }, { speaker: null, text: 'three' }]) =>
  () => lines;

function member(id: string, over: Partial<OverhearMember> = {}): OverhearMember {
  return { id, x: 5, z: 0, alive: true, present: true, sleeping: false, unaware: true, ...over };
}

function input(over: Partial<OverhearInput> = {}, members: OverhearMember[] = [member(HARL), member(BRAN, { x: 6 })]): OverhearInput {
  return { hour: 12, retaken: false, hero: { x: 0, z: 0 }, members, inVisit: true, dt: 0.5, ...over };
}

describe('Mill overheard lines', () => {
  it('play when the hero is close and nobody has noticed him', () => {
    const m = new MillOverhearing(words());
    m.advance(input());
    expect(m.snapshot().caption?.exchangeId).toBe(EXCHANGE);
    expect(m.snapshot().caption?.speakerId).toBe(HARL);
  });

  it('do not play once any Mill man is aware of the hero', () => {
    const m = new MillOverhearing(words());
    m.advance(input({}, [member(HARL), member(BRAN, { unaware: false })]));
    expect(m.snapshot().caption).toBeNull();
    expect(m.saidThisVisit).toEqual([]);
  });

  it('are heard only within earshot', () => {
    const far = new MillOverhearing(words(), undefined, 12);
    far.advance(input({}, [member(HARL, { x: 30 }), member(BRAN, { x: 31 })]));
    expect(far.snapshot().caption).toBeNull();
    const near = new MillOverhearing(words(), undefined, 12);
    near.advance(input());
    expect(near.snapshot().caption).not.toBeNull();
  });

  it('skip a speaker who is gone, asleep or off duty', () => {
    for (const bad of [{ alive: false }, { sleeping: true }, { present: false }]) {
      const m = new MillOverhearing(words());
      m.advance(input({}, [member(HARL, bad), member(BRAN)]));
      expect(m.snapshot().caption).toBeNull();
    }
  });

  it('are said once per visit, and again on a later visit', () => {
    const m = new MillOverhearing(words([{ speaker: '{A}', text: 'one' }]), undefined, 12, 0.1);
    m.advance(input());
    m.advance(input({ dt: 1 }));
    expect(m.snapshot().caption).toBeNull();
    expect(m.saidThisVisit).toEqual([EXCHANGE]);
    m.advance(input({ inVisit: false }));
    expect(m.saidThisVisit).toEqual([]);
    m.advance(input());
    expect(m.snapshot().caption?.exchangeId).toBe(EXCHANGE);
  });

  it('respect the time of day', () => {
    const m = new MillOverhearing(words());
    m.advance(input({ hour: 8 }));
    expect(m.snapshot().caption).toBeNull();
  });

  it('show one line at a time, each for the dwell time', () => {
    const m = new MillOverhearing(words(), undefined, 12, 3);
    m.advance(input());
    expect(m.snapshot().caption?.text).toBe('one');
    m.advance(input({ dt: 2 }));
    expect(m.snapshot().caption?.text).toBe('one');
    m.advance(input({ dt: 1 }));
    expect(m.snapshot().caption?.text).toBe('two');
    expect(m.snapshot().caption?.speakerId).toBe(BRAN);
    m.advance(input({ dt: 3 }));
    expect(m.snapshot().caption?.text).toBe('three');
    expect(m.snapshot().caption?.speakerId).toBe(BRAN);
    m.advance(input({ dt: 3 }));
    expect(m.snapshot().caption).toBeNull();
  });

  it('report the exchange through onHeard when it starts', () => {
    const heard: string[] = [];
    const m = new MillOverhearing(words(), id => heard.push(id));
    m.advance(input());
    m.advance(input({ dt: 0.1 }));
    expect(heard).toEqual([EXCHANGE]);
  });

  it('stop at once when a speaker becomes aware, and do not replay the cut-short exchange', () => {
    const m = new MillOverhearing(words(), undefined, 12, 3);
    m.advance(input());
    m.advance(input({}, [member(HARL), member(BRAN, { unaware: false })]));
    expect(m.snapshot().caption).toBeNull();
    m.advance(input());
    expect(m.snapshot().caption).toBeNull();
    expect(m.saidThisVisit).toEqual([EXCHANGE]);
  });

  it('stop when the Mill is no longer held', () => {
    const m = new MillOverhearing(words(), undefined, 12, 3);
    m.advance(input());
    m.stop();
    expect(m.snapshot().caption).toBeNull();
  });

  it('use the retaken garrison only when the Mill has been retaken', () => {
    const retakenMen = [member('col_ware'), member('jude_barrow', { x: 6 })];
    const before = new MillOverhearing(words());
    before.advance(input({ retaken: false }, retakenMen));
    expect(before.snapshot().caption).toBeNull();
    const after = new MillOverhearing(words());
    after.advance(input({ retaken: true }, retakenMen));
    expect(after.saidThisVisit).toEqual(['overheard.mill.retaken.1']);
  });
});

describe('resolving lines', () => {
  it('maps {A} and {B} to the first and second speakers', () => {
    const out = resolveLines(def, [{ speaker: '{B}', text: 'b' }, { speaker: '{A}', text: 'a' }]);
    expect(out).toEqual([{ speakerId: BRAN, text: 'b' }, { speakerId: HARL, text: 'a' }]);
  });

  it('gives an unattributed line the previous speaker', () => {
    const out = resolveLines(def, [{ speaker: '{B}', text: 'b' }, { speaker: null, text: 'c' }]);
    expect(out.map(l => l.speakerId)).toEqual([BRAN, BRAN]);
  });

  it('names a speaker from the bandit roster', () => {
    expect(nameOf(HARL)).not.toBe(HARL);
    expect(nameOf('nobody_here')).toBe('nobody_here');
  });
});
