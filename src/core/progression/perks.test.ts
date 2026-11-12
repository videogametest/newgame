import { describe, expect, it } from 'vitest';
import { TALLOWMERE_PERKS } from '../../data/perks/tallowmere';
import {
  addMastery, applyOverflow, availableSource, earnPerk, equipPerks, grantLevelPerks, hasPerk,
  indexPerks, isEquipped, ledger, loadSet, perksEarned, rankForMastery, recordPerkUse, saveSet,
  settleGains, slotCount, validatePerks,
} from './perks';
import { addExperience, awardExperience, createProgression, xpToReach } from './skills';
import { PROGRESSION_TUNING as T } from './tuning';
import type { PerkDef } from './types';

const defs = TALLOWMERE_PERKS;
const index = indexPerks(defs);
const perk = (id: string): PerkDef => index[id];

describe('earning', () => {
  it('earns a perk once and keeps it for good', () => {
    const s = createProgression();
    expect(earnPerk(s, perk('pinning_shot'))).toBe(true);
    expect(earnPerk(s, perk('pinning_shot'))).toBe(false);
    expect(perksEarned(s)).toBe(1);
    expect(s.perks.pinning_shot.rank).toBe(1);
  });

  it('grants level perks when the skill reaches the level, and not before', () => {
    const s = createProgression();
    addExperience(s, 'stealth', xpToReach(5));
    expect(grantLevelPerks(s, defs)).toEqual([]);
    addExperience(s, 'stealth', xpToReach(6));
    expect(grantLevelPerks(s, defs)).toEqual(['grass_ghost']);
    expect(grantLevelPerks(s, defs)).toEqual([]);
  });
});

describe('nothing is missable', () => {
  it('uses the primary source while the teacher is around', () => {
    expect(availableSource(perk('arc_reader'), new Set())).toEqual({ kind: 'person', person: 'fisher' });
  });

  it('falls back to Hesper when the teacher is dead or gone', () => {
    expect(availableSource(perk('arc_reader'), new Set(['fisher'])).kind).toBe('hesper');
  });

  it('can still earn every perk with every person lost', () => {
    const everyone = new Set(defs.flatMap((d) => (d.source.kind === 'person' ? [d.source.person] : [])));
    const s = createProgression();
    for (const d of defs) {
      const source = availableSource(d, everyone);
      expect(source.kind, d.id).not.toBe('person');
      earnPerk(s, d, source === d.source ? 'primary' : 'fallback');
    }
    expect(perksEarned(s)).toBe(defs.length);
  });

  it('records which way a perk was earned', () => {
    const s = createProgression();
    earnPerk(s, perk('stand_down'), 'fallback');
    expect(s.perks.stand_down.via).toBe('fallback');
  });
});

describe('slots', () => {
  it('gives 3, 5, and 7 slots by rank', () => {
    const s = createProgression();
    expect(slotCount(s)).toBe(3);
    s.rank = 'scout';
    expect(slotCount(s)).toBe(5);
    s.rank = 'warden';
    expect(slotCount(s)).toBe(7);
  });

  it('only changes perks at a rest site', () => {
    const s = createProgression();
    earnPerk(s, perk('whistle'));
    expect(() => equipPerks(s, ['whistle'], false)).toThrow();
    equipPerks(s, ['whistle'], true);
    expect(isEquipped(s, 'whistle')).toBe(true);
  });

  it('refuses more perks than there are slots, and perks not earned', () => {
    const s = createProgression();
    for (const id of ['whistle', 'grass_ghost', 'riposte', 'held_breath']) earnPerk(s, perk(id));
    expect(() => equipPerks(s, ['whistle', 'grass_ghost', 'riposte', 'held_breath'], true)).toThrow();
    expect(() => equipPerks(s, ['dusk_cloak'], true)).toThrow();
  });

  it('ignores a perk listed twice', () => {
    const s = createProgression();
    earnPerk(s, perk('whistle'));
    equipPerks(s, ['whistle', 'whistle'], true);
    expect(s.equipped).toEqual(['whistle']);
  });
});

describe('saved sets', () => {
  it('saves and loads a named set', () => {
    const s = createProgression();
    for (const id of ['whistle', 'grass_ghost', 'riposte']) earnPerk(s, perk(id));
    equipPerks(s, ['whistle', 'grass_ghost'], true);
    saveSet(s, 'Night work');
    equipPerks(s, ['riposte'], true);
    saveSet(s, 'Open fight');
    loadSet(s, 'Night work', true);
    expect(s.equipped).toEqual(['whistle', 'grass_ghost']);
  });

  it('replaces a set saved under the same name and allows only three', () => {
    const s = createProgression();
    earnPerk(s, perk('whistle'));
    equipPerks(s, ['whistle'], true);
    saveSet(s, 'A');
    saveSet(s, 'A');
    saveSet(s, 'B');
    saveSet(s, 'C');
    expect(s.sets.length).toBe(T.maxSets);
    expect(() => saveSet(s, 'D')).toThrow();
  });

  it('cannot be loaded in the field', () => {
    const s = createProgression();
    earnPerk(s, perk('whistle'));
    equipPerks(s, ['whistle'], true);
    saveSet(s, 'A');
    expect(() => loadSet(s, 'A', false)).toThrow();
  });
});

describe('mastery', () => {
  it('has three ranks at the tuned thresholds', () => {
    expect(rankForMastery(0)).toBe(1);
    expect(rankForMastery(T.masteryForRank2)).toBe(2);
    expect(rankForMastery(T.masteryForRank3)).toBe(3);
  });

  it('grows by use only while the perk is equipped', () => {
    const s = createProgression();
    earnPerk(s, perk('whistle'));
    expect(recordPerkUse(s, 'whistle')).toBeNull();
    equipPerks(s, ['whistle'], true);
    recordPerkUse(s, 'whistle');
    expect(s.perks.whistle.mastery).toBe(T.masteryPerUse);
  });

  it('reaches rank 3 with enough use and never drops', () => {
    const s = createProgression();
    earnPerk(s, perk('whistle'));
    equipPerks(s, ['whistle'], true);
    for (let i = 0; i < T.masteryForRank3 / T.masteryPerUse; i++) recordPerkUse(s, 'whistle');
    expect(s.perks.whistle.rank).toBe(3);
    equipPerks(s, [], true);
    expect(s.perks.whistle.rank).toBe(3);
  });

  it('is not earned by a perk the hero does not have', () => {
    const s = createProgression();
    expect(() => addMastery(s, 'whistle', 10)).toThrow();
  });
});

describe('overflow is never wasted', () => {
  it('feeds the equipped perks of a capped skill', () => {
    const s = createProgression(20);
    earnPerk(s, perk('pinning_shot'));
    earnPerk(s, perk('held_breath'));
    equipPerks(s, ['pinning_shot'], true);
    applyOverflow(s, index, 'archery', 100);
    expect(s.perks.pinning_shot.mastery).toBe(100 * T.masteryPerOverflow);
    expect(s.perks.held_breath.mastery).toBe(0);
  });

  it('feeds all the skill\'s perks when none is equipped', () => {
    const s = createProgression(20);
    earnPerk(s, perk('pinning_shot'));
    earnPerk(s, perk('held_breath'));
    applyOverflow(s, index, 'archery', 100);
    expect(s.perks.pinning_shot.mastery).toBe(50 * T.masteryPerOverflow);
    expect(s.perks.held_breath.mastery).toBe(50 * T.masteryPerOverflow);
  });

  it('banks it when the hero has no perk of that skill yet, and spends it on the first one', () => {
    const s = createProgression(20);
    applyOverflow(s, index, 'smithing', 80);
    expect(s.overflowBank.smithing).toBe(80);
    earnPerk(s, perk('makers_mark'));
    expect(s.overflowBank.smithing).toBe(0);
    expect(s.perks.makers_mark.mastery).toBe(80 * T.masteryPerOverflow);
  });

  it('keeps a capped skill growing its perks through ordinary play', () => {
    const s = createProgression(20);
    addExperience(s, 'archery', xpToReach(20));
    earnPerk(s, perk('pinning_shot'));
    equipPerks(s, ['pinning_shot'], true);
    for (let i = 0; i < 200; i++) settleGains(s, defs, index, awardExperience(s, { action: 'weak_point_hit' }));
    expect(s.skills.archery.level).toBe(20);
    expect(s.perks.pinning_shot.rank).toBeGreaterThan(1);
  });
});

describe('the ledger', () => {
  it('lists every perk, with a hint for those not earned and the summary for those earned', () => {
    const s = createProgression();
    earnPerk(s, perk('whistle'));
    const entries = ledger(s, defs);
    expect(entries.length).toBe(defs.length);
    const whistle = entries.find((e) => e.id === 'whistle')!;
    const cloak = entries.find((e) => e.id === 'dusk_cloak')!;
    expect(whistle.earned).toBe(true);
    expect(whistle.text).toBe(perk('whistle').summary);
    expect(cloak.earned).toBe(false);
    expect(cloak.text).toBe(perk('dusk_cloak').hint);
    expect(hasPerk(s, 'dusk_cloak')).toBe(false);
  });
});

describe('validation', () => {
  it('flags a perk whose teacher can be lost and has no fallback', () => {
    const bad: PerkDef = { ...perk('arc_reader'), id: 'bad', fallback: null };
    expect(validatePerks([bad]).length).toBeGreaterThan(0);
  });

  it('flags a fallback that can itself be lost', () => {
    const bad: PerkDef = { ...perk('arc_reader'), id: 'bad', fallback: { kind: 'person', person: 'someone' } };
    expect(validatePerks([bad]).length).toBeGreaterThan(0);
  });
});
