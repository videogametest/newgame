import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BANDITS } from './bandit-data';
import { decideWinBack, friendsSpared, pull, willStay } from './bandits';
import type { WinBackContext } from './bandits';
import { closeTo, OVERHEARD, tellsOf, YIELDS, yieldTells } from '../../data/overheard';

const who = (id: string) => BANDITS.find(b => b.id === id)!;
const dob = who('dob_finch');
const context: WinBackContext = {
  placeId: 'mill', freedDay: 1, day: 2, isMorning: true, recovery: 0.1, banditStates: { pim: 'dead', odo_varn: 'dead' }, heard: [],
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

describe('winning bandits back: decided, never rolled, and by who', () => {
  it('everyone is close to someone at their own place, and the ties come from who talks with whom', () => {
    for (const b of BANDITS) {
      const ties = closeTo(b.id);
      expect(ties.length, b.id).toBeGreaterThan(0);
      for (const t of ties) expect(who(t)).toMatchObject({ placeId: b.placeId, garrison: b.garrison });
      expect(ties).not.toContain(b.id);
    }
    expect(closeTo('dob_finch').sort()).toEqual(['odo_varn', 'pim']);
    expect(closeTo('hob_tarn')).toEqual(['rafe_dunmore']);
    expect(closeTo('corwin_vale')).toEqual(['tom_sable']);
  });
  it('mercy is whether their friends lived, never a count of the dead', () => {
    expect(friendsSpared('dob_finch', {})).toBe(1);
    expect(friendsSpared('dob_finch', { pim: 'dead' })).toBe(0.5);
    expect(friendsSpared('dob_finch', { pim: 'dead', odo_varn: 'dead' })).toBe(0);
    expect(friendsSpared('dob_finch', { pim: 'knocked_out', odo_varn: 'returned_to_stane' })).toBe(1);
    // Everyone else at the Mill dead, his two friends alive: it is as if nobody had been killed.
    expect(friendsSpared('dob_finch', { harl_gadd: 'dead', nessa_roke: 'dead', wyll_carrow: 'dead', bran_oakes: 'dead' })).toBe(1);
  });
  it('the pull of the valley rises with recovery and with friends spared, and stays between 0 and 1', () => {
    const base = pull('dob_finch', context);
    expect(pull('dob_finch', { ...context, recovery: 0.9 })).toBeGreaterThan(base);
    expect(pull('dob_finch', { ...context, banditStates: {} })).toBeGreaterThan(base);
    expect(pull('dob_finch', { ...context, recovery: 99 })).toBeLessThanOrEqual(1);
    expect(pull('dob_finch', { ...context, recovery: Number.NaN })).toBeGreaterThanOrEqual(0);
  });
  it('a tell that was heard, and mercy, guarantee a stay, however poor the valley', () => {
    const bleak = { ...context, recovery: 0 };
    expect(decideWinBack(dob, 'spared', bleak).state).not.toBe('stayed');
    expect(decideWinBack(dob, 'spared', { ...bleak, heard: ['overheard.mill.3'] })).toMatchObject({ state: 'stayed', because: 'tell_heard' });
    expect(decideWinBack(dob, 'knocked_out', { ...bleak, heard: ['overheard.mill.3'] }).state).toBe('stayed');
  });
  it('a tell does nothing for someone else, and nothing for the dead', () => {
    const heard = ['overheard.mill.3'];
    expect(decideWinBack(who('nessa_roke'), 'spared', { ...context, recovery: 0, heard }).state).toBe('returned_to_stane');
    expect(decideWinBack(dob, 'dead', { ...context, heard }).state).toBe('dead');
  });
  it('low loyalty stays if their friends lived; middling never stays once a friend is killed; high needs the valley nearly whole', () => {
    const spared = { banditStates: {}, heard: [] };
    expect(willStay(dob, { ...spared, recovery: 0 })).toBe(true);
    expect(willStay(who('bran_oakes'), { ...spared, recovery: 0 })).toBe(false);
    expect(willStay(who('bran_oakes'), { ...spared, recovery: 0.1 })).toBe(true);
    expect(willStay(who('bran_oakes'), { banditStates: { harl_gadd: 'dead' }, heard: [], recovery: 1 })).toBe(false);
    expect(willStay(who('nessa_roke'), { ...spared, recovery: 0.6 })).toBe(false);
    expect(willStay(who('nessa_roke'), { ...spared, recovery: 0.8 })).toBe(true);
  });
  it('those who fall short leave, or go back to Stane if their loyalty is high, and the reason names the friend', () => {
    expect(decideWinBack(who('bran_oakes'), 'spared', { ...context, recovery: 0, banditStates: {} })).toMatchObject({ state: 'left', because: 'fell_short' });
    expect(decideWinBack(who('bran_oakes'), 'spared', { ...context, recovery: 1, banditStates: { harl_gadd: 'dead' } })).toMatchObject({ state: 'left', because: 'friend_killed' });
    expect(decideWinBack(who('nessa_roke'), 'spared', { ...context, recovery: 0 }).state).toBe('returned_to_stane');
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
    const forge = { ...context, placeId: 'forge', recovery: 1, banditStates: {} };
    expect(decideWinBack(who('tobin_pike'), 'spared', forge).destination).toBe('recruit');
    expect(decideWinBack(who('ketch'), 'spared', forge).destination).toBe('resident');
    // Tobin was Ketch's friend, so Ketch needs his tell or a kinder valley; here the valley is whole.
    expect(decideWinBack(who('ketch'), 'spared', { ...forge, banditStates: { tobin_pike: 'dead' } }).destination).toBe('recruit');
  });
});

describe('a bandit who yields tells one useful thing', () => {
  it('every yield line is in the writing and stands for an information line at the same place', () => {
    const writing = readFileSync('docs/writing/bandits.md', 'utf8');
    for (const y of YIELDS) {
      expect(writing, y.id).toContain(`\`${y.id}\``);
      const same = OVERHEARD.find(o => o.id === y.sameAs)!;
      expect(same, y.sameAs).toMatchObject({ kind: 'information', place: y.place });
      if (y.about) expect(who(y.about)).toBeDefined();
    }
  });
  it('tells something the hero does not know, never about themselves, and nothing once it is all known', () => {
    expect(yieldTells('dob_finch', 'mill', [])?.id).toBe('yield.mill.1');
    expect(yieldTells('harl_gadd', 'mill', [])?.id).toBe('yield.mill.2');
    expect(yieldTells('dob_finch', 'mill', ['overheard.mill.5'])?.id).toBe('yield.mill.2');
    expect(yieldTells('bran_oakes', 'mill', ['overheard.mill.5'])).toBeNull();
    expect(yieldTells('dob_finch', 'mill', ['overheard.mill.5', 'yield.mill.2'])).toBeNull();
    expect(yieldTells('col_ware', 'mill', [])?.id).toBe('yield.mill.retaken.1');
    expect(yieldTells('hew_pollard', 'tax_cart', [])?.id).toBe('yield.cart.1');
    expect(yieldTells('nobody', 'mill', [])).toBeNull();
  });
});
