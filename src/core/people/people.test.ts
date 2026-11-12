import { describe, expect, it } from 'vitest';
import {
  HOUSEHOLDS, homeCount, meetsTrigger, recoveryLevel, updateHouseholds, windowCount,
  type PeopleWorld, type Trigger,
} from './households';
import {
  activePerks, bondStage, canRecruit, chooseParty, fulfilWish, growBond, initialCompany,
  recruit, fall, restCompany, type CompanionId, type WishEvent,
} from './companions';
import { householdLine, selectDialogue, showOptions, showResponse, WRITING, writtenGroup } from './dialogue';
import { PAIR_BEHAVIOURS, traitIntent } from './traits';

const world = (): PeopleWorld => ({
  day: 4, places: [], households: [], bandits: {}, stolenGoodsReturned: [], projectsBuilt: [], storyMoments: [],
});
const free = (id: string) => ({ id, status: 'freed' as const, timesFreed: 1, bellSilenced: false, morale: 0 });
function homes(n: number) {
  return HOUSEHOLDS.slice(0, n).map(d => ({ id: d.id, home: true, homeSince: 1 }));
}
const member = (id: CompanionId) => ({
  ...initialCompany().find(c => c.id === id)!, joined: true, travelling: true,
});
function satisfy(trigger: Trigger, w: PeopleWorld): void {
  switch (trigger.kind) {
    case 'always': break;
    case 'place': w.places.push(free(trigger.id)); break;
    case 'returned': w.stolenGoodsReturned.push(trigger.id); break;
    case 'household': w.households.push({ id: trigger.id, home: true }); break;
    case 'project': w.projectsBuilt.push(trigger.id); break;
    case 'windows': w.households = homes(trigger.count); break;
    case 'bandit': w.bandits[trigger.id] = trigger.outcome; break;
    case 'all': trigger.conditions.forEach(t => satisfy(t, w)); break;
    case 'any': satisfy(trigger.conditions[0], w); break;
  }
}

describe('§9 households', () => {
  it.each(HOUSEHOLDS.map(d => [d.id, d] as const))('%s returns only at its written trigger', (_id, d) => {
    const w = world();
    expect(meetsTrigger(d.trigger, w)).toBe(d.id === 'hesper');
    satisfy(d.trigger, w);
    expect(meetsTrigger(d.trigger, w)).toBe(true);
    expect(updateHouseholds(w).find(h => h.id === d.id)).toMatchObject({ home: true });
  });
  it('starts with one window, while Maren is physically present but has no light', () => {
    const first = updateHouseholds(world());
    expect(homeCount(first)).toBe(1);
    expect(HOUSEHOLDS.find(d => d.id === 'maren')?.presentFromStart).toBe(true);
    expect(first.find(h => h.id === 'maren')?.home).toBe(false);
  });
  it('clearing a place is not lighting it', () => {
    const w = world();
    w.places = [{ ...free('mill'), status: 'cleared' }];
    expect(meetsTrigger(HOUSEHOLDS[2].trigger, w)).toBe(false);
  });
  it('permits lantern projects to make the east road safe independently of the Forge', () => {
    const w = world(); w.projectsBuilt = ['east_road_lanterns'];
    expect(meetsTrigger(HOUSEHOLDS[4].trigger, w)).toBe(true);
  });
  it('brings grieving Pikes home at fourteen windows only when Tobin is dead', () => {
    const w = world(); w.households = homes(13); w.bandits.tobin_pike = 'dead';
    expect(meetsTrigger(HOUSEHOLDS[5].trigger, w)).toBe(false);
    w.households = homes(14);
    expect(meetsTrigger(HOUSEHOLDS[5].trigger, w)).toBe(true);
    w.bandits.tobin_pike = 'left';
    expect(meetsTrigger(HOUSEHOLDS[5].trigger, w)).toBe(false);
  });
  it('checks thresholds without an order-dependent cascade; does not mutate or overwrite homeSince', () => {
    const w = world(); w.places = [free('mill')];
    const before = JSON.stringify(w);
    const first = updateHouseholds(w);
    expect(JSON.stringify(w)).toBe(before);
    expect(homeCount(first)).toBe(3);
    expect(first.find(h => h.id === 'kettles')?.home).toBe(false);
    const second = updateHouseholds({ ...w, day: 5, households: first });
    expect(second.find(h => h.id === 'kettles')).toMatchObject({ home: true, homeSince: 5 });
    expect(second.find(h => h.id === 'marrins')?.homeSince).toBe(4);
  });
  it('does not send a household away on retaking (the miller flees to Wick)', () => {
    const w = world(); w.households = [{ id: 'marrins', home: true, homeSince: 1 }];
    expect(updateHouseholds(w).find(h => h.id === 'marrins')?.home).toBe(true);
  });
  it('counts each known home once and separates villages', () => {
    expect(homeCount([...homes(2), ...homes(2), { id: 'outsider', home: true }])).toBe(2);
    expect(homeCount(homes(16), 'elsewhere')).toBe(0);
  });
});

describe('§9 windows and derived recovery', () => {
  const hours = { dusk: 18, dawn: 6, smallHours: 2 }; // test fixture, not shipped clock tuning
  it('keeps Fairlow separate from sixteen windows and dark before finale', () => {
    expect(windowCount(homes(16), 20, hours)).toEqual({ lit: 16, total: 16, fairlow: false });
    expect(windowCount(homes(16), 20, hours, true)).toEqual({ lit: 16, total: 16, fairlow: true });
  });
  it.each([18, 23, 0, 1])('lights home windows at night hour %s', h => {
    expect(windowCount(homes(3), h, hours).lit).toBe(3);
  });
  it('only Hesper remains lit in the small hours', () => {
    expect(windowCount(homes(16), 2, hours).lit).toBe(1);
    expect(windowCount(homes(16), 5, hours).lit).toBe(1);
  });
  it.each([6, 12, 17])('all windows are dark in daylight hour %s', h => {
    expect(windowCount(homes(16), h, hours, true).lit).toBe(0);
    expect(windowCount(homes(16), h, hours, true).fairlow).toBe(false);
  });
  it('normalises day wrap and does not count a duplicate window', () => {
    expect(windowCount([...homes(2), ...homes(2)], -1, hours).lit).toBe(2);
  });
  it('derives all five §9 inputs and loses freed-place contribution on retaking', () => {
    const w = world(); w.households = homes(3); w.places = [free('mill')];
    w.bandits = { tobin_pike: 'stayed', ketch: 'left' };
    w.stolenGoodsReturned = ['aldrics', 'aldrics']; w.projectsBuilt = ['inn', 'inn'];
    const weights = { places: 5, households: 2, bandits: 3, returned: 4, projects: 6 };
    expect(recoveryLevel(w, weights)).toBe(24);
    w.places[0].status = 'held';
    expect(recoveryLevel(w, weights)).toBe(19);
  });
});

describe('§6 company', () => {
  it('starts with Bram alone, never a paid recruit', () => {
    expect(initialCompany().filter(c => c.travelling).map(c => c.id)).toEqual(['bram']);
    expect(canRecruit('bram', world())).toBe(true);
    expect(canRecruit('tamsin', world())).toBe(false);
  });
  it.each([['tamsin', 'sedges'], ['bracken', 'sedges'], ['garrick', 'aldrics'], ['oona', 'oona']] as const)(
    'makes %s recruitable through %s', (id, householdId) => {
      const w = world(); w.households = [{ id: householdId, home: true }];
      expect(recruit(initialCompany(), id, w).find(c => c.id === id)?.joined).toBe(true);
      expect(recruit(initialCompany(), id, w).find(c => c.id === id)?.travelling).toBe(false);
    });
  it('supports Garrick alone at ten windows only if the hammer was sold', () => {
    const w = world(); w.households = HOUSEHOLDS.filter(d => d.id !== 'aldrics').slice(0, 10)
      .map(d => ({ id: d.id, home: true }));
    expect(canRecruit('garrick', w)).toBe(false);
    expect(canRecruit('garrick', w, true)).toBe(true);
    w.households.pop();
    expect(canRecruit('garrick', w, true)).toBe(false);
  });
  it('requires Tobin won back; Ketch replaces dead Tobin only after being won back', () => {
    const w = world(); w.bandits = { tobin_pike: 'dead', ketch: 'spared' };
    expect(canRecruit('tobin_pike', w)).toBe(false);
    expect(canRecruit('ketch', w)).toBe(false);
    w.bandits.ketch = 'stayed';
    expect(canRecruit('ketch', w)).toBe(true);
    w.bandits.tobin_pike = 'stayed';
    expect(canRecruit('tobin_pike', w)).toBe(true);
    expect(canRecruit('ketch', w)).toBe(false);
  });
  it('never exceeds three places; Bracken uses one and rejects duplicates', () => {
    const company = initialCompany().map(c => ({ ...c, joined: true }));
    expect(chooseParty(company, ['bram', 'tamsin', 'bracken'], 'campfire').ok).toBe(true);
    expect(chooseParty(company, ['bram', 'tamsin', 'bracken', 'oona'], 'campfire').ok).toBe(false);
    expect(chooseParty(company, ['bram', 'bram'], 'hesper').ok).toBe(false);
    expect(chooseParty(company, ['tobin_pike', 'ketch'], 'hesper').ok).toBe(false);
  });
  it('swaps at Hesper or a campfire only, and cannot choose an unjoined member', () => {
    expect(chooseParty(initialCompany(), ['bram'], 'field').ok).toBe(false);
    expect(chooseParty(initialCompany(), ['tamsin'], 'hesper').ok).toBe(false);
    expect(chooseParty(initialCompany(), [], 'hesper').company.every(c => !c.travelling)).toBe(true);
  });
  it('falls without death, recovers at rest, and Bracken cannot be wounded', () => {
    expect(fall(member('bram')).wounded).toBe(true);
    expect(fall(member('bracken')).wounded).toBe(false);
    expect(restCompany([fall(member('bram'))])[0].wounded).toBe(false);
    expect(member('bram').wounded).toBe(false);
  });
  it.each(['travel', 'fight', 'campfire'] as const)('grows bond by %s only while travelling', event => {
    expect(growBond(member('bram'), event).bond).toBeGreaterThan(0);
    expect(growBond({ ...member('bram'), travelling: false }, event).bond).toBe(0);
    expect(growBond({ ...member('bram'), joined: false }, event).bond).toBe(0);
  });
  it('gates the third stage on the wish, unlocks one perk per stage, and never lowers bond', () => {
    const c = { ...member('bram'), bond: 10000 };
    expect(bondStage(c)).toBe(2);
    expect(activePerks(c)).toEqual(['Shieldwall', 'Breaker']);
    expect(growBond(c, 'travel', -3).bond).toBe(c.bond);
    expect(activePerks(fulfilWish(c, { kind: 'inn_meal', innRebuilt: true }))).toHaveLength(3);
  });
  const wishes: [CompanionId, WishEvent][] = [
    ['bram', { kind: 'inn_meal', innRebuilt: true }],
    ['tamsin', { kind: 'bow_returned_to_hale' }],
    ['tobin_pike', { kind: 'pikes_door', pikesHome: true }],
    ['oona', { kind: 'firefly_grove' }],
    ['garrick', { kind: 'forge_craft', madeBy: 'garrick' }],
    ['bracken', { kind: 'campfire', sedgesHome: true, sheepVisible: true }],
  ];
  it.each(wishes)('fulfils %s wish only for its written event', (id, event) => {
    expect(fulfilWish(member(id), event).wishFulfilled).toBe(true);
    expect(fulfilWish({ ...member(id), joined: false }, event).wishFulfilled).toBe(false);
    if (id !== 'tamsin') {
      expect(fulfilWish({ ...member(id), travelling: false }, event).wishFulfilled).toBe(false);
    }
  });
  it('does not invent a Ketch wish or fulfil under incomplete wish conditions', () => {
    expect(fulfilWish(member('ketch'), { kind: 'pikes_door', pikesHome: true }).wishFulfilled).toBe(false);
    expect(fulfilWish(member('garrick'), { kind: 'forge_craft', madeBy: 'hero' }).wishFulfilled).toBe(false);
    expect(fulfilWish(member('bram'), { kind: 'inn_meal', innRebuilt: false }).wishFulfilled).toBe(false);
    expect(fulfilWish(member('bracken'), { kind: 'campfire', sedgesHome: true, sheepVisible: false }).wishFulfilled).toBe(false);
    expect(fulfilWish(member('tobin_pike'), { kind: 'pikes_door', pikesHome: false }).wishFulfilled).toBe(false);
  });
});

describe('§6 traits as pure intentions', () => {
  it('Bram prioritises marks and holds attention; Breaker remains authored bond-two data', () => {
    expect(traitIntent(member('bram'), { markedTarget: 'leader', nearestEnemy: 'guard' }))
      .toMatchObject({ target: 'leader', drawsAttention: true });
    expect(activePerks({ ...member('bram'), bond: 10000 })).toContain('Breaker');
    expect(traitIntent({ ...member('bram'), bond: 10000 }, {}).breaksGuard).toBe(true);
  });
  it('Tamsin shoots marked targets', () => {
    expect(traitIntent(member('tamsin'), { markedTarget: 'runner' }).target).toBe('runner');
  });
  it('Tobin reveals watched patrols and at bond two accelerates morale loss', () => {
    expect(traitIntent(member('tobin_pike'), {}).revealsPatrols).toBe(false);
    expect(traitIntent({ ...member('tobin_pike'), bond: 10000 }, { placeWatched: true }))
      .toMatchObject({ revealsPatrols: true, fasterMoraleLoss: true });
  });
  it('Oona never attacks, revives Bram first, and improves food at bond two', () => {
    expect(traitIntent({ ...member('oona'), bond: 10000 }, { fallenCompanions: ['tamsin', 'bram'] }))
      .toMatchObject({ canAttack: false, reviveTarget: 'bram', improvesFood: true });
  });
  it('Garrick staggers heavy enemies', () => {
    expect(traitIntent(member('garrick'), {}).staggersHeavy).toBe(true);
  });
  it('Bracken is unharmable, detects unnoticed enemies and leads to secrets at bond two', () => {
    expect(traitIntent({ ...member('bracken'), bond: 10000 }, { unnoticedEnemy: 'guard', nearbySecret: 'cache' }))
      .toMatchObject({ canAttack: false, canBeHarmed: false, growlToward: 'guard', leadToward: 'cache' });
  });
  it('waiting and wounded companions cannot contribute fight intentions', () => {
    expect(traitIntent({ ...member('bram'), wounded: true }, { markedTarget: 'guard' }))
      .toMatchObject({ canAttack: false, target: undefined, drawsAttention: false });
  });
  it('retains all four authored pair behaviours as data', () => {
    expect(PAIR_BEHAVIOURS).toHaveLength(4);
  });
});

describe('§10 exact writing and dialogue selection', () => {
  it('loads exact source text rather than rewritten copies', () => {
    expect(writtenGroup({ source: 'bram', group: 'bram.arrival' })[0].text)
      .toBe("That's it? That's the valley? You talked about it for ten years. It's very green.");
    expect(writtenGroup({ source: 'hesper', group: 'hesper.lantern.first' })).toHaveLength(3);
    expect(writtenGroup({ source: 'hesper', group: 'hesper.trial.shoulder.pass' })[0].text).toBe("Hm. That'll do.");
  });
  it('household meetings advance in order, then repeat the last, without mutating history', () => {
    const rule = { ref: { source: 'households' as const, group: 'marrins.return' },
      form: 'above_head' as const, mode: 'ordered' as const };
    const first = selectDialogue([rule], world())!;
    const second = selectDialogue([rule], world(), first.history)!;
    const third = selectDialogue([rule], world(), second.history)!;
    expect(first.line.speaker).toBe('Ansa');
    expect(second.line.speaker).toBe('Corin');
    expect(third.line).toEqual(second.line);
    expect(Object.values(first.history)).toEqual([1]);
  });
  it('one-of cycles never repeat consecutively; shoulder uses every line before repeats', () => {
    const rule = { ref: { source: 'hesper' as const, group: 'hesper.trial.shoulder.fail' },
      form: 'conversation' as const, mode: 'cycle' as const };
    let history = {};
    const lines: string[] = [];
    for (let i = 0; i < 9; i++) {
      const next = selectDialogue([rule], world(), history)!;
      lines.push(next.line.text); history = next.history;
    }
    expect(new Set(lines.slice(0, 8)).size).toBe(8);
    expect(lines[8]).toBe(lines[0]);
  });
  it('state and bond gates select nothing prematurely, and once-only lines stop', () => {
    const rule = { ref: { source: 'companions' as const, group: 'tamsin.camp.3' },
      form: 'campfire' as const, mode: 'once' as const, minBond: 2 as const,
      when: { kind: 'project' as const, id: 'inn' } };
    const w = world();
    expect(selectDialogue([rule], w, {}, member('tamsin'))).toBeUndefined();
    w.projectsBuilt = ['inn'];
    expect(selectDialogue([rule], w, {}, member('tamsin'))).toBeUndefined();
    const c = { ...member('tamsin'), bond: 10000 };
    const first = selectDialogue([rule], w, {}, c)!;
    const second = selectDialogue([rule], w, first.history, c)!;
    expect(selectDialogue([rule], w, second.history, c)).toBeUndefined();
  });
  it('uses exact Show responses for found items only, and authored fallback for unknown things', () => {
    const item = { id: 'wrens_bow', kind: 'unique_item' as const, responses: { stane: "Wren's bow" } };
    expect(showOptions([item, item], [])).toEqual([]);
    expect(showOptions([item, item], [item.id])).toHaveLength(1);
    expect(showResponse('stane', item, [])).toBeUndefined();
    expect(showResponse('stane', item, [item.id])?.text).toBe(
      "Wren's. Wren was the last one through the gate. Looked back at the Fairlow house the whole way to the bend. Then went.");
    expect(showResponse('hesper', item, [item.id])?.text).toBe("I don't know what that is. I'm old, not all-knowing.");
    expect(showResponse('stane', item, [item.id])?.speaker).toBeUndefined();
  });
  it('references lighter household lines and interface text without rewriting them', () => {
    expect(householdLine('The Kettles', 'Return')?.text).toBe("Three lights. Three's a village. Two's just neighbours.");
    expect(householdLine('The Kettles', 'Return')?.speaker).toBeUndefined();
    expect(WRITING.interface).toContain('"{count} of 16 windows lit."');
    expect(writtenGroup({ source: 'bram', group: 'missing' })).toEqual([]);
  });
});
