// The things of Tallowmere. Names and descriptions are from docs/writing/items.md and are used exactly as written.
// Weights and values are untuned placeholders.
import type { ItemDef, ItemIndex, Tier } from './types';
import { TIERS } from './types';

const material = (id: string, name: string, weight: number, value: number): ItemDef => ({ id, name, kind: 'material', weight, value });
const arrow = (id: string, name: string, value: number): ItemDef => ({ id, name, kind: 'arrow', weight: 0.05, value });

const ARROWS: ItemDef[] = [
  arrow('arrow_standard', 'Standard arrow', 1),
  arrow('arrow_blunt', 'Blunt arrow', 1),
  arrow('arrow_fire', 'Fire arrow', 4),
  arrow('arrow_whistling', 'Whistling arrow', 4),
];

const MATERIALS: ItemDef[] = [
  // From hunting
  material('venison', 'Venison', 1, 6), material('rabbit', 'Rabbit', 0.5, 3), material('hide', 'Hide', 1.5, 5),
  material('sinew', 'Sinew', 0.1, 2), material('tallow', 'Tallow', 0.3, 2),
  // From the mill yard
  material('goose_quill', 'Goose quill', 0.01, 1),
  // From foraging
  material('yarrow', 'Yarrow', 0.05, 2), material('comfrey', 'Comfrey', 0.05, 2), material('white_comfrey', 'White comfrey', 0.05, 12),
  material('mushrooms', 'Mushrooms', 0.1, 2), material('wild_garlic', 'Wild garlic', 0.05, 1),
  material('pears', 'Pears', 0.2, 1), material('honey', 'Honey', 0.3, 6), material('beeswax', 'Beeswax', 0.2, 4),
  material('flour', 'Flour', 0.5, 2),
  // From the lake
  material('perch', 'Perch', 0.4, 3), material('pike', 'Pike', 1.2, 7), material('eel', 'Eel', 0.6, 6),
  // From trees
  material('ash_stave', 'Ash stave', 1, 6), material('arrow_shaft', 'Arrow shaft', 0.03, 0.5), material('kindling', 'Kindling', 0.3, 0.5),
  // From the hills
  material('copper_ore', 'Copper ore', 1, 3), material('tin_ore', 'Tin ore', 1, 4), material('iron_ore', 'Iron ore', 1.2, 6),
  // Worked
  material('bronze', 'Bronze', 0.8, 10), material('iron', 'Iron', 0.8, 18), material('steel', 'Steel', 0.8, 40),
  material('charcoal', 'Charcoal', 0.3, 1), material('cloth', 'Cloth', 0.2, 3), material('leather', 'Leather', 0.5, 8),
];

const food = (id: string, name: string, heals: number, value: number, description: string, bonus?: ItemDef['bonus']): ItemDef =>
  ({ id, name, kind: 'food', weight: 0.3, value, heals, description, ...(bonus ? { bonus } : {}) });

const FOOD: ItemDef[] = [
  food('apple', 'Apple', 8, 1, 'Sour. Better than nothing.'),
  food('marrins_loaf', "Marrin's Loaf", 20, 4, 'Still warm, if you were quick.'),
  food('smoked_perch', 'Smoked Perch', 25, 6, 'Keeps for a week. Tastes of the fire.'),
  food('rabbit_stew', 'Rabbit Stew', 35, 9, "Bram's favourite. He will tell you so.", { key: 'well_fed', lasts: 'hours' }),
  food('venison_and_mushrooms', 'Venison and Mushrooms', 50, 14, 'A proper meal. You feel it for hours.', { key: 'well_fed', lasts: 'hours' }),
  food('honey_cake', 'Honey Cake', 30, 12, 'Too good to eat on the road. You will anyway.', { key: 'well_fed', lasts: 'hours' }),
  food('soft_foot_broth', 'Soft-Foot Broth', 30, 16, 'Until dawn, your steps are quieter.', { key: 'soft_foot', lasts: 'dawn' }),
  food('owls_supper', "Owl's Supper", 30, 16, 'Until dawn, you see farther in the dark.', { key: 'owl_sight', lasts: 'dawn' }),
  food('bitterleaf_pottage', 'Bitterleaf Pottage', 30, 16, 'Until dawn, wolves dislike the smell of you.', { key: 'wolf_bane', lasts: 'dawn' }),
];

/** Gear exists once per tier. The id is `<tier>_<what>`; the name is the bare noun. */
const GEAR_BASES: { what: string; name: string; kind: 'weapon' | 'armour'; slot: ItemDef['slot']; weight: number; value: number }[] = [
  { what: 'blade', name: 'blade', kind: 'weapon', slot: 'blade', weight: 1.5, value: 20 },
  { what: 'helmet', name: 'helmet', kind: 'armour', slot: 'head', weight: 1.5, value: 15 },
  { what: 'jerkin', name: 'jerkin', kind: 'armour', slot: 'body', weight: 4, value: 25 },
  { what: 'shield', name: 'shield', kind: 'armour', slot: 'shield', weight: 4, value: 20 },
];
const TIER_VALUE: Record<Tier, number> = { bronze: 1, iron: 2, steel: 4 };
const GEAR: ItemDef[] = [
  ...TIERS.flatMap(tier => GEAR_BASES.map((g): ItemDef => ({
    id: `${tier}_${g.what}`, name: g.name, kind: g.kind, slot: g.slot, tier, weight: g.weight, value: g.value * TIER_VALUE[tier],
  }))),
  { id: 'short_bow', name: 'Short bow', kind: 'weapon', slot: 'bow', weight: 1, value: 15 },
  { id: 'throwing_knife', name: 'Throwing knife', kind: 'weapon', weight: 0.2, value: 4 },
];

const unique = (def: Omit<ItemDef, 'value' | 'unique'> & { propertyKey: string; property: string }): ItemDef => {
  const { propertyKey, property, ...rest } = def;
  return { ...rest, value: 0, unique: { propertyKey, property } };
};

const UNIQUE: ItemDef[] = [
  unique({
    id: 'wrens_bow', name: "Wren's Bow", kind: 'weapon', slot: 'bow', weight: 1,
    description: 'An ash bow, older than you are. The grip is worn by one hand, and it is nearly the size of yours.',
    propertyKey: 'long_hold', property: 'The moment of perfect draw can be held twice as long.',
  }),
  unique({
    id: 'patrol_lantern', name: 'The Patrol Lantern', kind: 'tool', weight: 0.8,
    description: "A warden's dark lantern. It gives light when you want it and takes it back when you don't.",
    propertyKey: 'dark_lantern', property: 'Open, wolves keep away and enemies see the hero from farther off. Shut, it is as if it were not there.',
  }),
  unique({
    id: 'lamplighters_striker', name: "The Lamplighter's Striker", kind: 'tool', weight: 0.2,
    description: 'Flint, steel, and a tin of char cloth. The steel is worn into the shape of a thumb.',
    propertyKey: 'light_by_hand', property: 'The hero can light things by hand from close by.',
  }),
  unique({
    id: 'smoker', name: 'The Smoker', kind: 'tool', weight: 0.6,
    description: "A beekeeper's bellows and a tin pot of smouldering rag. Bees think the forest is on fire and stop caring about you. So, it turns out, do geese.",
    propertyKey: 'smoke', property: 'A puff of smoke calms bees and quiets geese for a short while.',
  }),
  unique({
    id: 'fishers_line', name: "The Fisher's Line", kind: 'tool', weight: 0.1,
    description: 'Forty paces of silk line, finer than it has any right to be. It will hold a pike. It will certainly hold a key.',
    propertyKey: 'line_arrow', property: 'Tied to an arrow, it lets the hero pull a small thing back from where the arrow lands.',
  }),
  unique({
    id: 'captains_shield', name: "The Captain's Shield", kind: 'armour', slot: 'shield', weight: 5,
    description: "An officer's shield with the Crown's device beaten nearly flat. He carried it twenty years after the Crown had gone.",
    propertyKey: 'arrow_cover', property: 'Carried by Bram, it stops arrows aimed at anyone standing behind him.',
  }),
];

const keepsake = (id: string, name: string, description?: string): ItemDef =>
  ({ id, name, kind: 'keepsake', weight: 0.1, value: 0, ...(description ? { description } : {}), unique: { propertyKey: 'none', property: '' } });

const KEEPSAKES: ItemDef[] = [
  keepsake('fairlow_key', 'The Fairlow Key', 'An iron door key on a loop of new cord. Somebody has kept the rust off it.'),
  keepsake('guards_helmet', "A Guard's Helmet", "Left on a fencepost, the way you'd leave a hat you meant to come back for."),
  keepsake('taper_stub', 'A Taper Stub', "What was left of the taper you lit the Mill's lantern with. It is not good for anything. You have kept it anyway."),
  keepsake('mill_bill', 'A Mill Bill', 'A pick for dressing millstones. The handle is cut down to fit a small hand.'),
  keepsake('flawed_blade', 'A Flawed Blade', "One of Stane's. It broke at the tang, where somebody meant it to."),
  keepsake('tally_stick', 'A Tally Stick', 'Hazel, notched down both sides. Sixty-one. Some doors more than once.'),
  keepsake('thatching_needle', 'A Thatching Needle', 'Iron, a hand long, polished by use. Not a weapon.'),
  keepsake('mastery_archery', 'A horn thumb ring'), keepsake('mastery_melee', 'A whetstone worn hollow'),
  keepsake('mastery_toughness', 'A roll of clean linen'), keepsake('mastery_stealth', 'A small bell with no clapper'),
  keepsake('mastery_leadership', 'A tally stick, notched'), keepsake('mastery_gathering', 'A painted cork float'),
  keepsake('mastery_fletching', 'A fletching knife'), keepsake('mastery_cooking', 'A wooden spoon, scorched'),
  keepsake('mastery_smithing', 'A small hammer'),
];

const stolen = (id: string, name: string, owner: string, value: number, weight = 0.3): ItemDef =>
  ({ id, name, kind: 'stolen', owner, value, weight });

/** docs/writing/households.md, "Stolen things and whose they are". Where each one lies is in STOLEN_PLACES. */
const STOLEN: ItemDef[] = [
  stolen('smiths_hammer', "The smith's hammer", 'aldrics', 30, 2),
  stolen('wedding_ring', 'A wedding ring', 'marrins', 60, 0.01),
  stolen('bowyers_tools', "A bowyer's tools, in a leather roll", 'tolleys', 40, 1),
  stolen('loom_shuttle', 'A loom shuttle, carved with initials', 'loomises', 15, 0.1),
  stolen('brass_candlesticks', 'A pair of brass candlesticks', 'hollins', 45, 1.5),
  stolen('carved_horse', "A child's carved horse", 'dunns', 5, 0.1),
  stolen('hale_sedges_bow', "Hale Sedge's bow", 'sedges', 50, 1),
];

export const ITEMS: readonly ItemDef[] = [...ARROWS, ...MATERIALS, ...FOOD, ...GEAR, ...UNIQUE, ...KEEPSAKES, ...STOLEN];

export function indexItems(items: readonly ItemDef[] = ITEMS): ItemIndex {
  const map = new Map<string, ItemDef>();
  for (const item of items) {
    if (map.has(item.id)) throw new Error(`Two items share the id ${item.id}`);
    map.set(item.id, item);
  }
  return map;
}

/** Problems with the item data. Empty when it is sound. */
export function validateItems(items: readonly ItemDef[] = ITEMS): string[] {
  const problems: string[] = [];
  for (const item of items) {
    if (!/^[a-z][a-z0-9_]*$/.test(item.id)) problems.push(`${item.id}: ids are snake_case`);
    if (item.weight < 0 || item.value < 0) problems.push(`${item.id}: weight and value cannot be negative`);
    if (item.kind === 'stolen' && !item.owner) problems.push(`${item.id}: a stolen thing needs an owner`);
    if (item.kind !== 'stolen' && item.owner) problems.push(`${item.id}: only stolen things have an owner`);
    if (item.unique && item.value !== 0) problems.push(`${item.id}: unique items are never sold, so they have no price`);
    if (item.kind === 'food' && !(item.heals && item.heals > 0)) problems.push(`${item.id}: food must heal`);
    if ((item.kind === 'keepsake' || item.kind === 'tool') && !item.unique) problems.push(`${item.id}: keepsakes and tools are unique`);
  }
  return problems;
}
