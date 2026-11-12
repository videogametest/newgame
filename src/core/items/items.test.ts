import { describe, expect, it } from 'vitest';
import type { PlaceState } from '../types';
import { TALLOWMERE_PERKS } from '../../data/perks/tallowmere';
import { ACTIONS } from '../progression/actions';
import {
  addMark, addStack, collectedByWalking, craft, craftQuality, discoverByDoing, displayName, drop, dropRule, emptyInventory,
  gearEffect, indexItems, indexRecipes, ITEMS, learnRecipe, load, lootFrom, lootLines, markSeen, nextUpgrade, pickUp,
  RECIPES, recipesFrom, removeStack, retrieve, returnStolen, sortStacks, spotReady, startingRecipes, stolenFate,
  STOLEN_PLACES, store, storeAllMaterials, strongboxOpens, tabOf, takeAll, takeOne, upgrade, validateItems, validateRecipes,
  wouldOverload, type CraftContext, type InventoryState, type Stack,
} from './index';

const index = indexItems();
const get = (id: string) => index.get(id)!;
const carrying = (...stacks: Stack[]): InventoryState =>
  stacks.reduce((inv, s) => pickUp(inv, s, index), { ...emptyInventory(), recipes: RECIPES.map(r => r.id) });
const ctx = (over: Partial<CraftContext> = {}): CraftContext =>
  ({ station: 'campfire', inFight: false, skillLevel: 1, perks: {}, regionId: 'tallowmere', ...over });

describe('item data', () => {
  it('is sound', () => {
    expect(validateItems()).toEqual([]);
    expect(validateRecipes(RECIPES, index)).toEqual([]);
  });
  it('holds the six unique items and seven stolen things from the writing', () => {
    const unique = ITEMS.filter(i => i.unique && i.kind !== 'keepsake').map(i => i.name);
    expect(unique).toEqual(["Wren's Bow", 'The Patrol Lantern', "The Lamplighter's Striker", 'The Smoker', "The Fisher's Line", "The Captain's Shield"]);
    const stolen = ITEMS.filter(i => i.kind === 'stolen');
    expect(stolen).toHaveLength(7);
    expect(Object.keys(STOLEN_PLACES).sort()).toEqual(stolen.map(i => i.id).sort());
  });
  it('has a mastery keepsake for every skill', () => {
    for (const skill of ['archery', 'melee', 'toughness', 'stealth', 'leadership', 'gathering', 'fletching', 'cooking', 'smithing']) {
      expect(index.has(`mastery_${skill}`)).toBe(true);
    }
  });
  it('every perk that declares an items effect is handled or named here', () => {
    const keys = TALLOWMERE_PERKS.filter(p => p.effect.system === 'items').map(p => p.effect.key).sort();
    expect(keys).toEqual(['field_fletcher', 'makers_mark', 'night_stew', 'second_quiver', 'sound_shafts', 'trail_food']);
  });
  it('every recipe earns a registered action', () => {
    for (const r of RECIPES) expect(ACTIONS[r.action]?.[0].skill).toBe(r.skill);
    expect(ACTIONS.item_upgraded[0].skill).toBe('smithing');
  });
  it('names gear by quality, then material, then what it is', () => {
    expect(displayName(get('iron_blade'), 'fine')).toBe('Fine iron blade');
    expect(displayName(get('bronze_helmet'))).toBe('Bronze helmet');
    expect(displayName(get('wrens_bow'))).toBe("Wren's Bow");
    expect(displayName(get('short_bow'), 'masterwork')).toBe('Masterwork short bow');
  });
  it('quality and tier are fixed bonuses that only ever help', () => {
    expect(gearEffect(get('bronze_blade'))).toBe(1);
    expect(gearEffect(get('iron_blade'), 'fine')).toBeGreaterThan(gearEffect(get('iron_blade')));
    expect(gearEffect(get('steel_blade'))).toBeGreaterThan(gearEffect(get('iron_blade'), 'masterwork') - 0.2);
  });
});

describe('carrying and keeping', () => {
  it('piles like with like and keeps qualities apart', () => {
    let s = addStack([], { itemId: 'iron_blade', count: 1 });
    s = addStack(s, { itemId: 'iron_blade', count: 1 });
    s = addStack(s, { itemId: 'iron_blade', count: 1, quality: 'fine' });
    expect(s).toEqual([{ itemId: 'iron_blade', count: 2 }, { itemId: 'iron_blade', count: 1, quality: 'fine' }]);
    expect(removeStack(s, { itemId: 'iron_blade', count: 3 })).toBeNull();
    expect(removeStack(s, { itemId: 'iron_blade', count: 2 })).toEqual([{ itemId: 'iron_blade', count: 1, quality: 'fine' }]);
  });
  it('never changes the list it was given, and refuses bad counts', () => {
    const before: Stack[] = [{ itemId: 'apple', count: 1 }];
    addStack(before, { itemId: 'apple', count: 2 });
    expect(before).toEqual([{ itemId: 'apple', count: 1 }]);
    expect(() => addStack([], { itemId: 'apple', count: 0 })).toThrow();
    expect(() => addStack([], { itemId: 'apple', count: 1.5 })).toThrow();
  });
  it('over the limit the hero cannot sprint, and nothing else changes', () => {
    const inv = carrying({ itemId: 'iron_ore', count: 30 });
    expect(load(inv, index, 40)).toMatchObject({ overLimit: false, canSprint: true });
    expect(wouldOverload(inv, { itemId: 'iron_ore', count: 5 }, index, 40)).toBe(true);
    const heavy = pickUp(inv, { itemId: 'iron_ore', count: 5 }, index);
    expect(load(heavy, index, 40)).toMatchObject({ overLimit: true, canSprint: false });
  });
  it('dots new things until the inventory is opened', () => {
    const inv = carrying({ itemId: 'apple', count: 1 }, { itemId: 'apple', count: 1 });
    expect(inv.unseen).toEqual(['apple']);
    expect(markSeen(inv).unseen).toEqual([]);
  });
  it('moves things to the chest and back, and stores all materials at once', () => {
    const inv = carrying({ itemId: 'apple', count: 2 }, { itemId: 'hide', count: 3 }, { itemId: 'bronze', count: 1 });
    const stored = storeAllMaterials(inv, index);
    expect(stored.carried).toEqual([{ itemId: 'apple', count: 2 }]);
    expect(load(stored, index).weight).toBeCloseTo(0.6);
    expect(store(stored, { itemId: 'apple', count: 3 })).toBeNull();
    expect(retrieve(stored, { itemId: 'hide', count: 1 })!.carried).toContainEqual({ itemId: 'hide', count: 1 });
  });
  it('a unique item asks before it is dropped', () => {
    const inv = carrying({ itemId: 'wrens_bow', count: 1 }, { itemId: 'apple', count: 1 });
    expect(dropRule(get('wrens_bow'))).toBe('ask_first');
    expect(drop(inv, { itemId: 'wrens_bow', count: 1 }, index)).toBeNull();
    expect(drop(inv, { itemId: 'wrens_bow', count: 1 }, index, true)!.carried).toHaveLength(1);
    expect(drop(inv, { itemId: 'apple', count: 1 }, index)!.carried).toHaveLength(1);
  });
  it('files everything under one of the seven tabs', () => {
    expect(tabOf(get('iron_blade'))).toBe('Weapons');
    expect(tabOf(get('arrow_fire'))).toBe('Arrows');
    expect(tabOf(get('wedding_ring'))).toBe('Stolen goods');
    expect(tabOf(get('wrens_bow'))).toBe('Keepsakes');
    expect(tabOf(get('smoker'))).toBe('Keepsakes');
  });
  it('sorts by weight and value, heaviest and dearest first', () => {
    const stacks: Stack[] = [{ itemId: 'apple', count: 1 }, { itemId: 'steel_jerkin', count: 1 }, { itemId: 'wedding_ring', count: 1 }];
    expect(sortStacks(stacks, 'weight', index)[0].itemId).toBe('steel_jerkin');
    expect(sortStacks(stacks, 'value', index)[0].itemId).toBe('steel_jerkin');
    expect(sortStacks(stacks, 'type', index).map(s => s.itemId)).toEqual(['steel_jerkin', 'apple', 'wedding_ring']);
  });
});

describe('loot', () => {
  const carried = { gear: [{ itemId: 'iron_blade', count: 1 }, { itemId: 'iron_helmet', count: 1 }, { itemId: 'arrow_standard', count: 6 }], personal: [{ itemId: 'apple', count: 1 }] };
  it('the dead give up everything they visibly carried', () => {
    expect(lootFrom(carried, 'dead', index).takeable).toHaveLength(4);
  });
  it.each(['knocked_out', 'spared'] as const)('a %s bandit keeps what is theirs; only weapons are taken', state => {
    const loot = lootFrom(carried, state, index);
    expect(loot.takeable.map(s => s.itemId)).toEqual(['iron_blade', 'arrow_standard']);
    expect(loot.leftWithThem).toBe(true);
  });
  it.each(['alive', 'stayed', 'left', 'returned_to_stane'] as const)('nothing can be taken from a bandit who is %s', state => {
    expect(lootFrom(carried, state, index).takeable).toEqual([]);
  });
  it('a strongbox opens only when the lantern is lit', () => {
    const place: PlaceState = { id: 'mill', status: 'cleared', timesFreed: 0, bellSilenced: false, morale: 0 };
    expect(strongboxOpens(place)).toBe(false);
    expect(strongboxOpens({ ...place, status: 'freed' })).toBe(true);
    expect(strongboxOpens({ ...place, status: 'held', timesFreed: 1 })).toBe(false);
  });
  it('shows what is too heavy in red, and lets it be taken anyway', () => {
    const box = { id: 'mill_strongbox', contents: [{ itemId: 'iron_ore', count: 40 }, { itemId: 'wedding_ring', count: 1 }], crowns: 35 };
    const inv = emptyInventory();
    expect(lootLines(box, inv, index).map(l => l.tooHeavy)).toEqual([true, false]);
    const one = takeOne(box, inv, { itemId: 'wedding_ring', count: 1 }, index)!;
    expect(one.crowns).toBe(35);
    expect(one.container.crowns).toBe(0);
    const all = takeAll(one.container, one.inventory, index);
    expect(all.crowns).toBe(0);
    expect(all.container.contents).toEqual([]);
    expect(load(all.inventory, index).canSprint).toBe(false);
  });
  it('arrows and materials are walked over; the rest need E', () => {
    expect(collectedByWalking('arrow')).toBe(true);
    expect(collectedByWalking('material')).toBe(true);
    expect(collectedByWalking('stolen')).toBe(false);
    expect(collectedByWalking('weapon')).toBe(false);
  });
  it('gathering spots refill after a few days', () => {
    expect(spotReady('orchard_1', {}, 1, 3)).toBe(true);
    expect(spotReady('orchard_1', { orchard_1: 4 }, 6, 3)).toBe(false);
    expect(spotReady('orchard_1', { orchard_1: 4 }, 7, 3)).toBe(true);
  });
});

describe('stolen goods', () => {
  it('can be handed back or left at the door', () => {
    const inv = carrying({ itemId: 'wedding_ring', count: 1 });
    expect(returnStolen(inv, 'wedding_ring', true, index)).toMatchObject({ household: 'marrins', how: 'handed' });
    const left = returnStolen(inv, 'wedding_ring', false, index)!;
    expect(left.how).toBe('left_at_door');
    expect(left.inventory.carried).toEqual([]);
    expect(returnStolen(left.inventory, 'wedding_ring', true, index)).toBeNull();
    expect(returnStolen(carrying({ itemId: 'apple', count: 1 }), 'apple', true, index)).toBeNull();
  });
  it('knows what became of each thing', () => {
    const inv = carrying({ itemId: 'carved_horse', count: 1 });
    expect(stolenFate('carved_horse', inv, [], index)).toBe('held');
    expect(stolenFate('carved_horse', emptyInventory(), ['dunns'], index)).toBe('returned');
    expect(stolenFate('carved_horse', { ...emptyInventory(), soldStolen: ['carved_horse'] }, [], index)).toBe('sold');
    expect(stolenFate('carved_horse', emptyInventory(), [], index)).toBe('not_found');
  });
});

describe('crafting', () => {
  it('starts with a few recipes and learns the rest', () => {
    expect(startingRecipes()).toContain('arrows_bronze');
    expect(startingRecipes()).not.toContain('soft_foot_broth');
    expect(recipesFrom('night_stew').sort()).toEqual(['bitterleaf_pottage', 'owls_supper', 'soft_foot_broth']);
    expect(recipesFrom('aldrics')).toEqual(['iron', 'steel']);
    const inv = learnRecipe(learnRecipe(emptyInventory(), 'shafts'), 'shafts');
    expect(inv.recipes).toEqual(['shafts']);
  });
  it('carrying the ingredients for the first time suggests the recipe', () => {
    const inv = { ...carrying({ itemId: 'rabbit', count: 1 }, { itemId: 'wild_garlic', count: 1 }), recipes: [] };
    expect(discoverByDoing(inv)).toEqual(['rabbit_stew']);
    expect(discoverByDoing(learnRecipe(inv, 'rabbit_stew'))).toEqual([]);
  });
  it('makes arrows at a campfire and earns the event, not experience directly', () => {
    const inv = carrying({ itemId: 'arrow_shaft', count: 4 }, { itemId: 'goose_quill', count: 4 }, { itemId: 'bronze', count: 1 });
    const made = craft(inv, 'arrows_bronze', ctx(), index);
    expect(made.ok && made.made).toEqual({ itemId: 'arrow_standard', count: 4 });
    expect(made.ok && made.event).toMatchObject({ skill: 'fletching', action: 'arrows_made', targetId: 'arrows_bronze' });
    expect(made.ok && made.inventory.carried).toEqual([{ itemId: 'arrow_standard', count: 4 }]);
  });
  it('a better fletcher gets more arrows from the same materials', () => {
    const inv = carrying({ itemId: 'arrow_shaft', count: 4 }, { itemId: 'goose_quill', count: 4 }, { itemId: 'bronze', count: 1 });
    const made = craft(inv, 'arrows_bronze', ctx({ skillLevel: 10 }), index);
    expect(made.ok && made.made.count).toBe(6);
  });
  it('bread and cake need the oven; a hearth is a campfire and will not bake', () => {
    const inv = carrying({ itemId: 'flour', count: 2 });
    expect(craft(inv, 'marrins_loaf', ctx({ station: 'campfire' }), index)).toEqual({ ok: false, reason: 'wrong_place' });
    const baked = craft(inv, 'marrins_loaf', ctx({ station: 'oven' }), index);
    expect(baked.ok && baked.made).toEqual({ itemId: 'marrins_loaf', count: 2 });
  });
  it("the Tolleys' bench gives more arrows, and only at a proper station", () => {
    const mats = () => carrying({ itemId: 'arrow_shaft', count: 4 }, { itemId: 'goose_quill', count: 4 }, { itemId: 'bronze', count: 1 });
    const plain = craft(mats(), 'arrows_bronze', ctx(), index);
    const bench = craft(mats(), 'arrows_bronze', ctx({ atFletchersBench: true }), index);
    expect(bench.ok && plain.ok && bench.made.count - plain.made.count).toBe(2);
    const field = craft(mats(), 'arrows_bronze', ctx({ station: null, atFletchersBench: true, perks: { field_fletcher: 1 } }), index);
    expect(field.ok && field.made.count).toBe(3);
  });
  it('refuses the wrong place, a fight, an unlearned recipe, and missing ingredients', () => {
    const inv = carrying({ itemId: 'perch', count: 1 });
    expect(craft(inv, 'smoked_perch', ctx({ station: null }), index)).toEqual({ ok: false, reason: 'wrong_place' });
    expect(craft(inv, 'smoked_perch', ctx({ station: 'forge' }), index)).toEqual({ ok: false, reason: 'wrong_place' });
    expect(craft(inv, 'smoked_perch', ctx({ inFight: true }), index)).toEqual({ ok: false, reason: 'in_fight' });
    expect(craft({ ...inv, recipes: [] }, 'smoked_perch', ctx(), index)).toEqual({ ok: false, reason: 'not_learned' });
    expect(craft(inv, 'rabbit_stew', ctx(), index)).toEqual({ ok: false, reason: 'missing_ingredients' });
    expect(craft(inv, 'nonsense', ctx(), index)).toEqual({ ok: false, reason: 'unknown_recipe' });
    expect(craft(inv, 'smoked_perch', ctx(), index).ok).toBe(true);
  });
  describe('Field Fletcher', () => {
    const mats = () => carrying({ itemId: 'arrow_shaft', count: 8 }, { itemId: 'goose_quill', count: 8 }, { itemId: 'bronze', count: 2 },
      { itemId: 'arrow_standard', count: 2 }, { itemId: 'cloth', count: 2 });
    it('rank 1: a few standard arrows anywhere out of a fight', () => {
      const made = craft(mats(), 'arrows_bronze', ctx({ station: null, perks: { field_fletcher: 1 } }), index);
      expect(made.ok && made.made.count).toBe(3);
      expect(craft(mats(), 'arrow_blunt', ctx({ station: null, perks: { field_fletcher: 1 } }), index).ok).toBe(false);
      expect(craft(mats(), 'arrows_bronze', ctx({ station: null, inFight: true, perks: { field_fletcher: 1 } }), index).ok).toBe(false);
    });
    it('rank 2: special arrows too', () => {
      expect(craft(mats(), 'arrow_blunt', ctx({ station: null, perks: { field_fletcher: 2 } }), index).ok).toBe(true);
    });
    it('rank 3: one arrow in the middle of a fight', () => {
      const made = craft(mats(), 'arrows_bronze', ctx({ station: null, inFight: true, perks: { field_fletcher: 3 } }), index);
      expect(made.ok && made.made.count).toBe(1);
    });
    it('does not turn the open road into a kitchen', () => {
      expect(craft(carrying({ itemId: 'perch', count: 1 }), 'smoked_perch', ctx({ station: null, perks: { field_fletcher: 3 } }), index).ok).toBe(false);
    });
  });
  it('smithing quality comes from skill, never from a roll', () => {
    expect([1, 8, 16].map(craftQuality)).toEqual(['common', 'fine', 'masterwork']);
    const inv = carrying({ itemId: 'bronze', count: 6 }, { itemId: 'leather', count: 2 });
    const a = craft(inv, 'bronze_blade', ctx({ station: 'forge', skillLevel: 9 }), index);
    const b = craft(inv, 'bronze_blade', ctx({ station: 'forge', skillLevel: 9 }), index);
    expect(a.ok && a.made).toEqual({ itemId: 'bronze_blade', count: 1, quality: 'fine' });
    expect(a).toEqual(b);
    const metal = craft(carrying({ itemId: 'copper_ore', count: 2 }, { itemId: 'tin_ore', count: 1 }, { itemId: 'charcoal', count: 1 }), 'bronze', ctx({ station: 'forge', skillLevel: 20 }), index);
    expect(metal.ok && metal.made.quality).toBeUndefined();
  });
  it('upgrades step through quality, then tier, and stop at masterwork steel', () => {
    expect(nextUpgrade({ itemId: 'bronze_blade', count: 1 }, index)!.to).toEqual({ itemId: 'bronze_blade', count: 1, quality: 'fine' });
    expect(nextUpgrade({ itemId: 'bronze_blade', count: 1, quality: 'masterwork' }, index)!.to).toEqual({ itemId: 'iron_blade', count: 1 });
    expect(nextUpgrade({ itemId: 'steel_blade', count: 1, quality: 'masterwork' }, index)).toBeNull();
    expect(nextUpgrade({ itemId: 'wrens_bow', count: 1 }, index)).toBeNull();
    expect(nextUpgrade({ itemId: 'apple', count: 1 }, index)).toBeNull();
  });
  it('upgrading needs the Forge, the materials, and the skill', () => {
    const blade: Stack = { itemId: 'bronze_blade', count: 1 };
    const inv = carrying(blade, { itemId: 'bronze', count: 1 }, { itemId: 'charcoal', count: 1 });
    expect(upgrade(inv, blade, ctx({ skillLevel: 8 }), index)).toEqual({ ok: false, reason: 'wrong_place' });
    expect(upgrade(inv, blade, ctx({ station: 'forge', skillLevel: 2 }), index)).toEqual({ ok: false, reason: 'not_skilled' });
    expect(upgrade(carrying(blade), blade, ctx({ station: 'forge', skillLevel: 8 }), index)).toEqual({ ok: false, reason: 'missing_ingredients' });
    const done = upgrade(inv, blade, ctx({ station: 'forge', skillLevel: 8 }), index);
    expect(done.ok && done.inventory.carried).toEqual([{ itemId: 'bronze_blade', count: 1, quality: 'fine' }]);
    expect(done.ok && done.event.action).toBe('item_upgraded');
  });
  it("Maker's Mark copies a unique property without using the unique item up", () => {
    const blade: Stack = { itemId: 'iron_blade', count: 1 };
    const inv = carrying(blade, { itemId: 'wrens_bow', count: 1 }, { itemId: 'smoker', count: 1 }, { itemId: 'taper_stub', count: 1 });
    const one = addMark(inv, blade, 'wrens_bow', 1, index)!;
    const marked: Stack = { ...blade, marks: ['long_hold'] };
    expect(one.carried).toContainEqual(marked);
    expect(one.carried).toContainEqual({ itemId: 'wrens_bow', count: 1 });
    expect(addMark(one, marked, 'smoker', 1, index)).toBeNull();
    expect(addMark(one, marked, 'smoker', 2, index)!.carried).toContainEqual({ ...blade, marks: ['long_hold', 'smoke'] });
    expect(addMark(one, marked, 'smoker', 2, index, 'long_hold')).toBeNull();
    expect(addMark(one, marked, 'smoker', 3, index, 'long_hold')!.carried).toContainEqual({ ...blade, marks: ['smoke'] });
    expect(addMark(inv, blade, 'taper_stub', 3, index)).toBeNull();
    expect(addMark(inv, blade, 'patrol_lantern', 3, index)).toBeNull();
    expect(addMark(inv, blade, 'wrens_bow', 0, index)).toBeNull();
  });
});

describe('recipes cover what the writing names', () => {
  it('every food in the writing can be made, bought, or foraged', () => {
    const made = new Set(RECIPES.map(r => r.output.itemId));
    const foods = ITEMS.filter(i => i.kind === 'food').map(i => i.id);
    expect(foods.filter(f => !made.has(f))).toEqual(['apple']);
  });
  it('indexes by id', () => {
    expect(indexRecipes().get('steel')!.station).toBe('forge');
  });
});
