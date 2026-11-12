import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BANDITS } from './bandit-data';
import { decideWinBack, mercyShare, pull, willStay } from './bandits';
import type { WinBackContext } from './bandits';
import { OVERHEARD, tellsOf } from '../../data/overheard';

const who = (id: string) => BANDITS.find(b => b.id === id)!;
const dob = who('dob_finch');
const context: WinBackContext = {
  placeId: 'mill', freedDay: 1, day: 2, isMorning: true, recovery: 0.1, garrison: ['spared', 'dead', 'dead', 'dead'], heard: [],
};

describe('the bandits, as data', () => {
  it('has every named defender once, and not Stane', () => {
    expect(BANDITS).toHaveLength(29);
    expect(new Set(BANDITS.map(b => b.id)).size).toBe(29);
    expect(BANDITS.some(b => b.name.includes('Stane'))).toBe(false);
    for (const b of BANDITS) expect(b.id).toMatch(/^[a-z][a-z_]*$/);
  });
  it('matches the writing: every name, trade, and habit note is in bandits.md', () => {
    const writing = readFileSync('docs/writing/bandits.md', 'utf8');
    for (const b of BANDITS) {
      expect(writing, b.name).toContain(b.name.replace('Sergeant ', '').replace('Lieutenant ', ''));
      expect(writing, b.formerTrade).toContain(b.formerTrade);
    }
    expect(who('dob_finch')).toMatchObject({ loyalty: 'low', unit: 'soldier', formerTrade: "A miller's hand, at this mill" });
    expect(who('harl_gadd')).toMatchObject({ loyalty: 'high', leader: true });
    expect(who('maud_kerr').garrison).toBe('retaken');
    expect(BANDITS.filter(b => b.cart).map(b => b.id).sort()).toEqual(['gant', 'hew_pollard', 'rikke']);
  });
  it('every overheard line exists in the writing, and every speaker is a bandit or Stane', () => {
    const writing = readFileSync('docs/writing/bandits.md', 'utf8');
    for (const line of OVERHEARD) {
      expect(writing, line.id).toContain(`\`${line.id}\``);
      for (const s of line.speakers) expect(s === 'stane' || BANDITS.some(b => b.id === s), `${line.id}: ${s}`).toBe(true);
    }
    expect(tellsOf('hew_pollard')).toEqual(['overheard.watch.4', 'overheard.cart.1']);
    expect(tellsOf('nessa_roke')).toEqual([]);
  });
});

describe('winning bandits back: decided, never rolled', () => {
  it('mercy is the share of beaten defenders who were not killed', () => {
    expect(mercyShare(['dead', 'spared', 'knocked_out', 'alive'])).toBeCloseTo(2 / 3);
    expect(mercyShare(['stayed', 'left', 'returned_to_stane', 'dead'])).toBeCloseTo(3 / 4);
    expect(mercyShare([])).toBe(0);
    expect(mercyShare(['alive', 'alive'])).toBe(0);
  });
  it('the pull of the valley rises with recovery and with mercy, and stays between 0 and 1', () => {
    const base = pull(context);
    expect(pull({ ...context, recovery: 0.9 })).toBeGreaterThan(base);
    expect(pull({ ...context, garrison: ['spared', 'spared', 'knocked_out'] })).toBeGreaterThan(base);
    expect(pull({ ...context, recovery: 99 })).toBeLessThanOrEqual(1);
    expect(pull({ ...context, recovery: Number.NaN })).toBeGreaterThanOrEqual(0);
  });
  it('a tell that was heard, and mercy, guarantee a stay, however poor the valley', () => {
    const bleak = { ...context, recovery: 0, garrison: ['spared', 'dead', 'dead', 'dead', 'dead', 'dead'] as const };
    expect(decideWinBack(dob, 'spared', bleak).state).not.toBe('stayed');
    expect(decideWinBack(dob, 'spared', { ...bleak, heard: ['overheard.mill.3'] })).toMatchObject({ state: 'stayed', because: 'tell_heard' });
    expect(decideWinBack(dob, 'knocked_out', { ...bleak, heard: ['overheard.mill.3'] }).state).toBe('stayed');
  });
  it('a tell does nothing for someone else, and nothing for the dead', () => {
    const heard = ['overheard.mill.3'];
    expect(decideWinBack(who('nessa_roke'), 'spared', { ...context, recovery: 0, heard }).state).toBe('returned_to_stane');
    expect(decideWinBack(dob, 'dead', { ...context, heard }).state).toBe('dead');
  });
  it('without a tell, low loyalty stays sooner than middling, and high almost never', () => {
    const kind = { ...context, recovery: 0.4, garrison: ['spared', 'spared', 'dead'] as const };
    expect(willStay(dob, kind)).toBe(true);
    expect(willStay(who('bran_oakes'), { ...context, recovery: 0.1 })).toBe(false);
    expect(willStay(who('bran_oakes'), { ...context, recovery: 0.6, garrison: ['spared', 'spared'] })).toBe(true);
    expect(willStay(who('nessa_roke'), { ...context, recovery: 0.6, garrison: ['spared', 'spared'] })).toBe(false);
    expect(willStay(who('nessa_roke'), { ...context, recovery: 1, garrison: ['spared'] })).toBe(true);
  });
  it('those who fall short leave, or go back to Stane if their loyalty is high', () => {
    const bleak = { ...context, recovery: 0, garrison: ['spared', 'dead', 'dead', 'dead'] as const };
    expect(decideWinBack(who('bran_oakes'), 'spared', bleak)).toMatchObject({ state: 'left', because: 'fell_short' });
    expect(decideWinBack(who('nessa_roke'), 'spared', bleak).state).toBe('returned_to_stane');
  });
  it('is the same every time: there is no seed and no chance', () => {
    const a = decideWinBack(dob, 'spared', context);
    for (let i = 0; i < 20; i++) expect(decideWinBack(dob, 'spared', context)).toEqual(a);
    expect(decideWinBack.length).toBeLessThanOrEqual(4);
  });
  it('decides at the first dawn after the lantern, not before, and only for that place', () => {
    for (const update of [{ day: 1 }, { day: 2, isMorning: false }, { freedDay: null }, { placeId: 'forge' }]) {
      expect(decideWinBack(dob, 'spared', { ...context, heard: ['overheard.mill.3'], ...update })).toMatchObject({ state: 'spared', because: 'not_yet' });
    }
    expect(decideWinBack(dob, 'spared', { ...context, heard: ['overheard.mill.3'], day: 5, isMorning: false }).state).toBe('stayed');
  });
  it.each(['alive', 'dead', 'stayed', 'left', 'returned_to_stane'] as const)('never changes a bandit who is %s', state => {
    expect(decideWinBack(dob, state, { ...context, heard: ['overheard.mill.3'] }).state).toBe(state);
  });
  it('Tobin may be recruited; Ketch stands in only if Tobin was killed', () => {
    const forge = { ...context, placeId: 'forge', recovery: 1, garrison: ['spared', 'spared'] as const };
    expect(decideWinBack(who('tobin_pike'), 'spared', forge).destination).toBe('recruit');
    expect(decideWinBack(who('ketch'), 'spared', forge).destination).toBe('resident');
    expect(decideWinBack(who('ketch'), 'spared', { ...forge, banditStates: { tobin_pike: 'dead' } }).destination).toBe('recruit');
  });
});
