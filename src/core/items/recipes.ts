// Crafting (GAME_DESIGN.md section 6): fletching and cooking at a campfire, smithing at the Forge.
// Recipes are data. Making something is the only way crafting earns experience, through an ExperienceEvent.
import type { ExperienceEvent, SkillId } from '../types';
import { addStack, countOf, removeStack } from './inventory';
import { ITEMS_TUNING } from './tuning';
import type { InventoryState, ItemIndex, Quality, Stack, Tier } from './types';
import { QUALITIES, TIERS } from './types';

/** A hearth in any home the hero is welcome in counts as a campfire. The oven is the Marrins'. */
export type Station = 'campfire' | 'forge' | 'oven';
export type LearnedBy = 'start' | 'doing' | 'note' | 'person' | 'perk';

export interface Recipe {
  id: string;
  skill: Extract<SkillId, 'fletching' | 'cooking' | 'smithing'>;
  station: Station;
  inputs: { itemId: string; count: number }[];
  output: { itemId: string; count: number };
  /** The experience action it earns (src/core/progression/actions.ts). */
  action: 'arrows_made' | 'meal_cooked' | 'item_crafted';
  /** How hard it is, 0 to 1: sets how much it teaches. */
  difficulty: number;
  learnedBy: LearnedBy;
  /** For 'person': who teaches it. For 'perk': the perk that unlocks it. */
  from?: string;
}

const r = (id: string, skill: Recipe['skill'], station: Station, inputs: [string, number][], output: [string, number],
  difficulty: number, learnedBy: LearnedBy, from?: string): Recipe => ({
  id, skill, station, inputs: inputs.map(([itemId, count]) => ({ itemId, count })), output: { itemId: output[0], count: output[1] },
  action: skill === 'fletching' ? 'arrows_made' : skill === 'cooking' ? 'meal_cooked' : 'item_crafted',
  difficulty, learnedBy, ...(from ? { from } : {}),
});

/** Quantities and difficulties are untuned placeholders. */
export const RECIPES: readonly Recipe[] = [
  // Fletching: shafts, feathers, and heads become arrows.
  r('arrows_bronze', 'fletching', 'campfire', [['arrow_shaft', 4], ['goose_quill', 4], ['bronze', 1]], ['arrow_standard', 4], 0.2, 'start'),
  r('arrows_iron', 'fletching', 'campfire', [['arrow_shaft', 6], ['goose_quill', 6], ['iron', 1]], ['arrow_standard', 6], 0.3, 'doing'),
  r('arrow_blunt', 'fletching', 'campfire', [['arrow_standard', 1], ['cloth', 1]], ['arrow_blunt', 1], 0.3, 'start'),
  r('arrow_fire', 'fletching', 'campfire', [['arrow_standard', 1], ['tallow', 1], ['cloth', 1]], ['arrow_fire', 1], 0.5, 'person', 'tolleys'),
  r('arrow_whistling', 'fletching', 'campfire', [['arrow_standard', 1], ['beeswax', 1]], ['arrow_whistling', 1], 0.5, 'note'),
  r('shafts', 'fletching', 'campfire', [['ash_stave', 1]], ['arrow_shaft', 8], 0.1, 'start'),
  // Cooking
  r('smoked_perch', 'cooking', 'campfire', [['perch', 1]], ['smoked_perch', 1], 0.1, 'start'),
  r('rabbit_stew', 'cooking', 'campfire', [['rabbit', 1], ['wild_garlic', 1]], ['rabbit_stew', 1], 0.3, 'doing'),
  r('venison_and_mushrooms', 'cooking', 'campfire', [['venison', 1], ['mushrooms', 2]], ['venison_and_mushrooms', 1], 0.5, 'doing'),
  // Baking needs the Marrins' oven: bread and cake cannot be made over an open fire.
  r('marrins_loaf', 'cooking', 'oven', [['flour', 2]], ['marrins_loaf', 2], 0.3, 'person', 'marrins'),
  r('honey_cake', 'cooking', 'oven', [['honey', 1], ['flour', 1]], ['honey_cake', 1], 0.5, 'person', 'ashbys'),
  r('soft_foot_broth', 'cooking', 'campfire', [['eel', 1], ['wild_garlic', 1]], ['soft_foot_broth', 1], 0.7, 'perk', 'night_stew'),
  r('owls_supper', 'cooking', 'campfire', [['pike', 1], ['yarrow', 1]], ['owls_supper', 1], 0.7, 'perk', 'night_stew'),
  r('bitterleaf_pottage', 'cooking', 'campfire', [['venison', 1], ['comfrey', 1]], ['bitterleaf_pottage', 1], 0.7, 'perk', 'night_stew'),
  // Smithing: metal first, then things made of it.
  r('charcoal', 'smithing', 'forge', [['kindling', 4]], ['charcoal', 2], 0.1, 'start'),
  r('bronze', 'smithing', 'forge', [['copper_ore', 2], ['tin_ore', 1], ['charcoal', 1]], ['bronze', 2], 0.2, 'start'),
  r('iron', 'smithing', 'forge', [['iron_ore', 2], ['charcoal', 2]], ['iron', 1], 0.5, 'person', 'aldrics'),
  r('steel', 'smithing', 'forge', [['iron', 2], ['charcoal', 3]], ['steel', 1], 0.8, 'person', 'aldrics'),
  ...TIERS.flatMap((tier, i) => [
    r(`${tier}_blade`, 'smithing', 'forge', [[tier, 3], ['leather', 1]], [`${tier}_blade`, 1], 0.3 + 0.25 * i, i === 0 ? 'start' : 'doing'),
    r(`${tier}_helmet`, 'smithing', 'forge', [[tier, 2], ['leather', 1]], [`${tier}_helmet`, 1], 0.3 + 0.25 * i, i === 0 ? 'start' : 'doing'),
    r(`${tier}_jerkin`, 'smithing', 'forge', [[tier, 3], ['leather', 3]], [`${tier}_jerkin`, 1], 0.4 + 0.25 * i, i === 0 ? 'start' : 'doing'),
    r(`${tier}_shield`, 'smithing', 'forge', [[tier, 4], ['leather', 1]], [`${tier}_shield`, 1], 0.4 + 0.25 * i, i === 0 ? 'start' : 'doing'),
  ]),
];

export function indexRecipes(recipes: readonly Recipe[] = RECIPES): ReadonlyMap<string, Recipe> {
  return new Map(recipes.map(x => [x.id, x]));
}

/** Problems with the recipe data. Empty when it is sound. */
export function validateRecipes(recipes: readonly Recipe[], index: ItemIndex): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const x of recipes) {
    if (seen.has(x.id)) problems.push(`${x.id}: two recipes share this id`);
    seen.add(x.id);
    for (const { itemId } of [...x.inputs, x.output]) if (!index.has(itemId)) problems.push(`${x.id}: unknown item ${itemId}`);
    if ((x.learnedBy === 'person' || x.learnedBy === 'perk') && !x.from) problems.push(`${x.id}: needs to say who or what teaches it`);
    if (x.inputs.some(i => i.itemId === x.output.itemId)) problems.push(`${x.id}: makes what it is made from`);
  }
  return problems;
}

/** Recipes known from the first minute. */
export function startingRecipes(recipes: readonly Recipe[] = RECIPES): string[] {
  return recipes.filter(x => x.learnedBy === 'start').map(x => x.id);
}

/** Learn a recipe. Learning one twice changes nothing. */
export function learnRecipe(inv: InventoryState, recipeId: string): InventoryState {
  return inv.recipes.includes(recipeId) ? inv : { ...inv, recipes: [...inv.recipes, recipeId] };
}

/** Recipes a returned household teaches, or an earned perk unlocks. Call when either happens. */
export function recipesFrom(source: string, recipes: readonly Recipe[] = RECIPES): string[] {
  return recipes.filter(x => x.from === source).map(x => x.id);
}

/**
 * "Learned by doing": a recipe of the same skill and station whose ingredients the hero is carrying for the first time
 * suggests itself. Returns the ids to learn.
 */
export function discoverByDoing(inv: InventoryState, recipes: readonly Recipe[] = RECIPES): string[] {
  return recipes
    .filter(x => x.learnedBy === 'doing' && !inv.recipes.includes(x.id) && x.inputs.every(i => countOf(inv.carried, i.itemId) >= i.count))
    .map(x => x.id);
}

export interface CraftContext {
  /** Where the hero is standing, or null for the open road. */
  station: Station | null;
  inFight: boolean;
  /** The hero's level in the recipe's skill. */
  skillLevel: number;
  /** Mastery rank of each equipped perk, by id. Unequipped perks are absent. */
  perks: Readonly<Record<string, number>>;
  regionId: string;
  /** At the Tolleys' fletching bench: a better jig, so more arrows from the same materials. */
  atFletchersBench?: boolean;
}

export type CraftRefusal = 'unknown_recipe' | 'not_learned' | 'wrong_place' | 'in_fight' | 'missing_ingredients';
export type CraftResult =
  | { ok: true; inventory: InventoryState; made: Stack; event: ExperienceEvent }
  | { ok: false; reason: CraftRefusal };

const SPECIAL_ARROWS = ['arrow_blunt', 'arrow_fire', 'arrow_whistling'];

/** Field Fletcher: standard arrows anywhere out of a fight at rank 1, special arrows at rank 2, one arrow mid-fight at rank 3. */
function fieldFletch(recipe: Recipe, ctx: CraftContext): 'no' | 'batch' | 'one' {
  const rank = ctx.perks.field_fletcher ?? 0;
  if (recipe.skill !== 'fletching' || !recipe.output.itemId.startsWith('arrow_') || recipe.output.itemId === 'arrow_shaft') return 'no';
  if (rank < 1 || (SPECIAL_ARROWS.includes(recipe.output.itemId) && rank < 2)) return 'no';
  if (ctx.inFight) return rank >= 3 ? 'one' : 'no';
  return 'batch';
}

/** The quality of the hero's own smithing. Fixed by level, never rolled. Only gear has quality. */
export function craftQuality(smithingLevel: number): Quality {
  const at = ITEMS_TUNING.craftQualityAt;
  return smithingLevel >= at.masterwork ? 'masterwork' : smithingLevel >= at.fine ? 'fine' : 'common';
}

export function craft(inv: InventoryState, recipeId: string, ctx: CraftContext, index: ItemIndex,
  recipes: ReadonlyMap<string, Recipe> = indexRecipes()): CraftResult {
  const recipe = recipes.get(recipeId);
  if (!recipe) return { ok: false, reason: 'unknown_recipe' };
  if (!inv.recipes.includes(recipeId)) return { ok: false, reason: 'not_learned' };

  const atStation = ctx.station === recipe.station && !ctx.inFight;
  const field = atStation ? 'no' : fieldFletch(recipe, ctx);
  if (!atStation && field === 'no') return { ok: false, reason: ctx.inFight ? 'in_fight' : 'wrong_place' };

  let carried: Stack[] | null = inv.carried;
  for (const input of recipe.inputs) {
    // Ingredients are taken from common-quality piles: materials and arrows have no quality.
    carried = carried && removeStack(carried, { itemId: input.itemId, count: input.count });
  }
  if (!carried) return { ok: false, reason: 'missing_ingredients' };

  let count = recipe.output.count;
  if (recipe.action === 'arrows_made' && recipe.output.itemId === 'arrow_standard') {
    count += Math.floor(ctx.skillLevel / ITEMS_TUNING.fletchingLevelsPerExtraArrow);
    if (ctx.atFletchersBench && atStation) count += ITEMS_TUNING.benchExtraArrows;
  }
  if (field === 'batch') count = Math.min(count, ITEMS_TUNING.fieldBatch);
  if (field === 'one') count = 1;

  const def = index.get(recipe.output.itemId);
  const isGear = def?.kind === 'weapon' || def?.kind === 'armour';
  const quality = recipe.skill === 'smithing' && isGear ? craftQuality(ctx.skillLevel) : 'common';
  const made: Stack = { itemId: recipe.output.itemId, count, ...(quality !== 'common' ? { quality } : {}) };
  return {
    ok: true,
    inventory: { ...inv, carried: addStack(carried, made) },
    made,
    event: { skill: recipe.skill, action: recipe.action, targetId: recipe.id, difficulty: recipe.difficulty, regionId: ctx.regionId },
  };
}

// ---------- Upgrades at the Forge ----------

export interface Upgrade {
  to: Stack;
  cost: { itemId: string; count: number }[];
}

/**
 * The next step for a piece of gear: common to fine to masterwork within its tier, then up a tier at common.
 * Null when there is nothing further (masterwork steel), or the thing is not tiered gear.
 */
export function nextUpgrade(stack: Stack, index: ItemIndex): Upgrade | null {
  const def = index.get(stack.itemId);
  if (!def?.tier || def.unique) return null;
  const q = QUALITIES.indexOf(stack.quality ?? 'common');
  if (q < QUALITIES.length - 1) {
    return { to: { ...stack, count: 1, quality: QUALITIES[q + 1] }, cost: [{ itemId: def.tier, count: q + 1 }, { itemId: 'charcoal', count: q + 1 }] };
  }
  const t = TIERS.indexOf(def.tier);
  if (t >= TIERS.length - 1) return null;
  const next: Tier = TIERS[t + 1];
  const toId = stack.itemId.replace(`${def.tier}_`, `${next}_`);
  if (!index.has(toId)) return null;
  const { quality: _dropped, ...rest } = stack;
  return { to: { ...rest, itemId: toId, count: 1 }, cost: [{ itemId: next, count: 3 }, { itemId: 'charcoal', count: 2 }] };
}

export type UpgradeResult =
  | { ok: true; inventory: InventoryState; made: Stack; event: ExperienceEvent }
  | { ok: false; reason: 'wrong_place' | 'nothing_further' | 'missing_ingredients' | 'not_skilled' };

/** Upgrading needs the Forge, the materials, and the skill: fine and masterwork need the same levels as crafting them. */
export function upgrade(inv: InventoryState, stack: Stack, ctx: CraftContext, index: ItemIndex): UpgradeResult {
  if (ctx.station !== 'forge' || ctx.inFight) return { ok: false, reason: 'wrong_place' };
  const step = nextUpgrade(stack, index);
  if (!step) return { ok: false, reason: 'nothing_further' };
  const wanted = step.to.quality ?? 'common';
  if (QUALITIES.indexOf(wanted) > QUALITIES.indexOf(craftQuality(ctx.skillLevel))) return { ok: false, reason: 'not_skilled' };
  let carried: Stack[] | null = removeStack(inv.carried, { ...stack, count: 1 });
  for (const c of step.cost) carried = carried && removeStack(carried, c);
  if (!carried) return { ok: false, reason: 'missing_ingredients' };
  const tierStep = TIERS.indexOf(index.get(step.to.itemId)!.tier!);
  return {
    ok: true,
    inventory: { ...inv, carried: addStack(carried, step.to) },
    made: step.to,
    event: {
      skill: 'smithing', action: 'item_upgraded', targetId: step.to.itemId,
      difficulty: Math.min(1, 0.3 + 0.2 * tierStep + 0.15 * QUALITIES.indexOf(wanted)), regionId: ctx.regionId,
    },
  };
}

// ---------- Maker's Mark ----------

/**
 * Work a found unique item's property into a thing of the hero's own making. The unique item is not used up.
 * Rank 1: one mark. Rank 2: two. Rank 3: a mark can be exchanged, by passing `replace`.
 */
export function addMark(inv: InventoryState, target: Stack, uniqueId: string, rank: number, index: ItemIndex, replace?: string): InventoryState | null {
  const source = index.get(uniqueId);
  const def = index.get(target.itemId);
  const owned = [...inv.carried, ...inv.stored].some(s => s.itemId === uniqueId);
  if (!source?.unique || source.unique.propertyKey === 'none' || !owned || !def?.tier || def.unique || rank < 1) return null;
  const key = source.unique.propertyKey;
  let marks = [...(target.marks ?? [])];
  if (marks.includes(key)) return null;
  if (replace !== undefined) {
    if (rank < 3 || !marks.includes(replace)) return null;
    marks = marks.filter(m => m !== replace);
  }
  if (marks.length >= ITEMS_TUNING.marksAtRank[Math.min(rank, 3)]) return null;
  const carried = removeStack(inv.carried, { ...target, count: 1 });
  if (!carried) return null;
  return { ...inv, carried: addStack(carried, { ...target, count: 1, marks: [...marks, key].sort() }) };
}
