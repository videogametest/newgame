// Carrying and keeping (GAME_DESIGN.md section 6) and the inventory screen's rules (section 10).
import { ITEMS_TUNING } from './tuning';
import type { InventoryState, ItemDef, ItemIndex, Quality, Stack } from './types';

export function emptyInventory(): InventoryState {
  return { carried: [], stored: [], unseen: [], soldStolen: [], recipes: [] };
}

const marksOf = (s: Stack) => [...(s.marks ?? [])].sort().join('+');
/** Two stacks pile together only when item, quality, and marks all match. */
export function sameKind(a: Stack, b: Stack): boolean {
  return a.itemId === b.itemId && (a.quality ?? 'common') === (b.quality ?? 'common') && marksOf(a) === marksOf(b);
}

function defOf(index: ItemIndex, itemId: string): ItemDef {
  const def = index.get(itemId);
  if (!def) throw new Error(`Unknown item ${itemId}`);
  return def;
}

function checkCount(count: number): void {
  if (!Number.isInteger(count) || count <= 0) throw new Error(`A count must be a whole number above zero, got ${count}`);
}

/** A new list with the stack added. Never changes the list it was given. */
export function addStack(stacks: readonly Stack[], stack: Stack): Stack[] {
  checkCount(stack.count);
  const at = stacks.findIndex(s => sameKind(s, stack));
  if (at < 0) return [...stacks, { ...stack }];
  return stacks.map((s, i) => (i === at ? { ...s, count: s.count + stack.count } : s));
}

/** A new list with the stack removed, or null if there is not enough of it. */
export function removeStack(stacks: readonly Stack[], stack: Stack): Stack[] | null {
  checkCount(stack.count);
  const at = stacks.findIndex(s => sameKind(s, stack));
  if (at < 0 || stacks[at].count < stack.count) return null;
  return stacks.flatMap((s, i) => (i !== at ? [s] : s.count === stack.count ? [] : [{ ...s, count: s.count - stack.count }]));
}

/** How many of an item, of any quality. */
export function countOf(stacks: readonly Stack[], itemId: string): number {
  return stacks.reduce((n, s) => n + (s.itemId === itemId ? s.count : 0), 0);
}

export function weightOf(stacks: readonly Stack[], index: ItemIndex): number {
  return stacks.reduce((kg, s) => kg + defOf(index, s.itemId).weight * s.count, 0);
}

/** Crowns weigh nothing, so they are not in here at all (section 6, Carrying). */
export function load(inv: InventoryState, index: ItemIndex, limit: number = ITEMS_TUNING.carryLimit) {
  const weight = weightOf(inv.carried, index);
  return { weight, limit, overLimit: weight > limit, canSprint: weight <= limit };
}

/** True if taking this would put the hero over the limit: the loot window shows it in red. Taking it is still allowed. */
export function wouldOverload(inv: InventoryState, stack: Stack, index: ItemIndex, limit: number = ITEMS_TUNING.carryLimit): boolean {
  return weightOf(inv.carried, index) + defOf(index, stack.itemId).weight * stack.count > limit;
}

/** Pick something up. It joins what the hero carries and is dotted as new. */
export function pickUp(inv: InventoryState, stack: Stack, index: ItemIndex): InventoryState {
  defOf(index, stack.itemId);
  return {
    ...inv,
    carried: addStack(inv.carried, stack),
    unseen: inv.unseen.includes(stack.itemId) ? inv.unseen : [...inv.unseen, stack.itemId],
  };
}

/** Opening the inventory clears the dots. */
export function markSeen(inv: InventoryState): InventoryState {
  return { ...inv, unseen: [] };
}

function move(inv: InventoryState, stack: Stack, from: 'carried' | 'stored'): InventoryState | null {
  const to = from === 'carried' ? 'stored' : 'carried';
  const taken = removeStack(inv[from], stack);
  if (!taken) return null;
  return { ...inv, [from]: taken, [to]: addStack(inv[to], stack) };
}
/** Null when the hero does not have that many. Only possible at the chest. */
export const store = (inv: InventoryState, stack: Stack) => move(inv, stack, 'carried');
export const retrieve = (inv: InventoryState, stack: Stack) => move(inv, stack, 'stored');

/** The "Store all materials" button. */
export function storeAllMaterials(inv: InventoryState, index: ItemIndex): InventoryState {
  let next = inv;
  for (const stack of inv.carried) {
    if (defOf(index, stack.itemId).kind === 'material') next = store(next, stack) ?? next;
  }
  return next;
}

/** Unique items cannot be lost: dropping one asks first. Everything else drops freely. */
export function dropRule(def: ItemDef): 'drop' | 'ask_first' {
  return def.unique ? 'ask_first' : 'drop';
}

/** Null when the hero is not carrying it. `confirmed` is the player's yes to the question a unique item asks. */
export function drop(inv: InventoryState, stack: Stack, index: ItemIndex, confirmed = false): InventoryState | null {
  if (dropRule(defOf(index, stack.itemId)) === 'ask_first' && !confirmed) return null;
  const carried = removeStack(inv.carried, stack);
  return carried ? { ...inv, carried } : null;
}

export const TABS = ['Weapons', 'Arrows', 'Armour', 'Food', 'Materials', 'Stolen goods', 'Keepsakes'] as const;
export type Tab = (typeof TABS)[number];

/** Which inventory tab a thing sits under. Unique items of any kind are kept together under Keepsakes. */
export function tabOf(def: ItemDef): Tab {
  if (def.unique) return 'Keepsakes';
  switch (def.kind) {
    case 'weapon': return 'Weapons';
    case 'arrow': return 'Arrows';
    case 'armour': return 'Armour';
    case 'food': return 'Food';
    case 'material': return 'Materials';
    case 'stolen': return 'Stolen goods';
    default: return 'Keepsakes';
  }
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Its quality, if not common, then its material, then what it is": "Fine iron blade". */
export function displayName(def: ItemDef, quality: Quality = 'common'): string {
  if (def.unique || !def.tier) return quality === 'common' ? def.name : capital(`${quality} ${def.name.charAt(0).toLowerCase()}${def.name.slice(1)}`);
  return capital(`${quality === 'common' ? '' : `${quality} `}${def.tier} ${def.name}`);
}

/** What gear does, as a multiplier on its base: tier times quality. Fixed, never rolled. */
export function gearEffect(def: ItemDef, quality: Quality = 'common'): number {
  return ITEMS_TUNING.quality[quality].effect * (def.tier ? ITEMS_TUNING.tier[def.tier].effect : 1);
}

export type SortBy = 'type' | 'weight' | 'value';
export function sortStacks(stacks: readonly Stack[], by: SortBy, index: ItemIndex): Stack[] {
  const key = (s: Stack): number | string => {
    const def = defOf(index, s.itemId);
    return by === 'type' ? `${TABS.indexOf(tabOf(def))}${def.name}` : by === 'weight' ? -def.weight * s.count : -def.value * s.count;
  };
  return [...stacks].sort((a, b) => {
    const ka = key(a), kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : a.itemId.localeCompare(b.itemId);
  });
}
