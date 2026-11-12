import { describe, expect, it } from 'vitest';
import { BANDITS } from './bandit-data';
import { decideWinBack, sparedShare, stayChance } from './bandits';
import type { WinBackContext } from './bandits';
import { COMBAT_DEPTH_TUNING as D } from './data';

const bandit = BANDITS.find(b => b.id === 'dob_finch')!;
const context: WinBackContext = {
  placeId: 'mill', placeStatus: 'freed', freedDay: 1, day: 2, isMorning: true, recovery: 0.5, fellows: ['spared', 'dead'],
};
const alwaysStay = { ...D.winBack, baseStay: 1, recoveryWeight: 0, mercyWeight: 0, loyaltyPenalty: 0 };
const neverStay = { ...alwaysStay, baseStay: 0 };
describe('winning bandits back (§5, §6, §9)', () => {
  it('uses every named garrison member, once; Stane is not a conversion candidate', () => {
    expect(BANDITS).toHaveLength(29);
    expect(new Set(BANDITS.map(b => b.id)).size).toBe(29);
    for (const b of BANDITS) {
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.formerTrade.length).toBeGreaterThan(0);
      expect(['low', 'middling', 'high']).toContain(b.loyalty);
    }
    expect(BANDITS.some(b => b.name.includes('Stane'))).toBe(false);
  });
  it('preserves written names, natures and trades', () => {
    expect(bandit).toMatchObject({ name: 'Dob Finch', loyalty: 'low', formerTrade: "A miller's hand, at this mill" });
    expect(BANDITS.find(b => b.id === 'harl_gadd')?.loyalty).toBe('high');
    expect(BANDITS.find(b => b.id === 'tobin_pike')?.recruitRole).toBe('comrade_knowledge');
  });
  it('uses the same-place defeated fellows, ignoring other lifecycle states', () => {
    expect(sparedShare(['dead', 'spared', 'knocked_out', 'alive', 'left', 'stayed', 'returned_to_stane'])).toBeCloseTo(2 / 3);
    expect(sparedShare([])).toBe(0);
  });
  it('chance rises with recovery and spared fellows, and falls with loyalty', () => {
    const chance = stayChance(bandit, context);
    expect(stayChance(bandit, { ...context, recovery: 1 })).toBeGreaterThan(chance);
    expect(stayChance(bandit, { ...context, fellows: ['spared', 'knocked_out'] })).toBeGreaterThan(chance);
    expect(stayChance({ ...bandit, loyalty: 'high' }, context)).toBeLessThan(chance);
    expect(stayChance(bandit, { ...context, recovery: 10 })).toBe(stayChance(bandit, { ...context, recovery: 1 }));
    expect(stayChance(bandit, context, alwaysStay)).toBe(1);
    expect(stayChance(bandit, context, neverStay)).toBe(0);
  });
  it.each(['held', 'cleared'] as const)('cannot resolve a %s place', placeStatus => {
    expect(decideWinBack(bandit, 'spared', { ...context, placeStatus }, 42, alwaysStay)).toEqual({ state: 'spared', seed: 42, destination: null });
  });
  it('waits until a subsequent morning, at the correct freed place', () => {
    for (const update of [{ day: 1 }, { day: 0 }, { isMorning: false }, { placeId: 'forge' }]) {
      expect(decideWinBack(bandit, 'spared', { ...context, ...update }, 42, alwaysStay).state).toBe('spared');
    }
  });
  it.each(['alive', 'dead', 'stayed', 'left', 'returned_to_stane'] as const)('never converts %s bandits or rerolls completed decisions', state => {
    expect(decideWinBack(bandit, state, context, 42, alwaysStay)).toEqual({ state, seed: 42, destination: null });
  });
  it.each(['spared', 'knocked_out'] as const)('permits %s bandits to become residents', state => {
    expect(decideWinBack(bandit, state, context, 42, alwaysStay)).toMatchObject({ state: 'stayed', destination: 'resident' });
  });
  it('has all three decisions: stay, leave and return to Stane', () => {
    expect(decideWinBack(bandit, 'spared', context, 42, alwaysStay).state).toBe('stayed');
    expect(decideWinBack(bandit, 'spared', context, 42, neverStay).state).toBe('left');
    expect(decideWinBack({ ...bandit, loyalty: 'high' }, 'spared', context, 42, neverStay).state).toBe('returned_to_stane');
  });
  it('is replayable, seeded and pure; chance zero and one are exact', () => {
    const copy = structuredClone(context);
    expect(decideWinBack(bandit, 'spared', context, 42)).toEqual(decideWinBack(bandit, 'spared', context, 42));
    expect(context).toEqual(copy);
    expect(decideWinBack(bandit, 'spared', context, 42).seed).not.toBe(42);
    expect(decideWinBack(bandit, 'spared', context, 42, alwaysStay).state).toBe('stayed');
    expect(decideWinBack(bandit, 'spared', context, 42, neverStay).state).toBe('left');
  });
  it('Tobin is recruitable; Ketch replaces him only if Tobin was killed', () => {
    const forge = { ...context, placeId: 'forge' };
    const tobin = BANDITS.find(b => b.id === 'tobin_pike')!;
    const ketch = BANDITS.find(b => b.id === 'ketch')!;
    expect(decideWinBack(tobin, 'spared', forge, 42, alwaysStay).destination).toBe('recruit');
    expect(decideWinBack(ketch, 'spared', forge, 42, alwaysStay).destination).toBe('resident');
    expect(decideWinBack(ketch, 'spared', { ...forge, banditStates: { tobin_pike: 'dead' } }, 42, alwaysStay).destination).toBe('recruit');
    expect(decideWinBack(ketch, 'spared', { ...forge, banditStates: { tobin_pike: 'stayed' } }, 42, alwaysStay).destination).toBe('resident');
  });
});
