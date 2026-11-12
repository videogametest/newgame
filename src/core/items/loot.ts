// Loot rules (GAME_DESIGN.md section 6, Loot) and the loot window (section 10).
import type { BanditState, PlaceState } from '../types';
import { addStack, pickUp, removeStack, wouldOverload } from './inventory';
import type { InventoryState, ItemIndex, Stack } from './types';

/** What an enemy visibly wears and holds, and what is theirs alone. */
export interface Carried {
  /** Weapons, armour, quiver: what you can see on them from a ridge. */
  gear: Stack[];
  /** Personal things. A living bandit keeps these. */
  personal: Stack[];
}

/**
 * What can be taken from a downed enemy. Knocked-out and spared bandits keep their personal things and their armour;
 * only their weapons and arrows are taken. The loot window then says "You leave them what's theirs."
 */
export function lootFrom(carried: Carried, state: BanditState, index: ItemIndex): { takeable: Stack[]; leftWithThem: boolean } {
  if (state === 'dead') return { takeable: [...carried.gear, ...carried.personal].map(s => ({ ...s })), leftWithThem: false };
  if (state !== 'knocked_out' && state !== 'spared') return { takeable: [], leftWithThem: false };
  const takeable = carried.gear.filter(s => {
    const kind = index.get(s.itemId)?.kind;
    return kind === 'weapon' || kind === 'arrow';
  }).map(s => ({ ...s }));
  return { takeable, leftWithThem: true };
}

/** A strongbox opens only once its place is freed: cleared is not enough, the lantern must be lit. */
export function strongboxOpens(place: PlaceState): boolean {
  return place.status === 'freed';
}

/** A body, a chest, or a strongbox with things in it. */
export interface Container {
  id: string;
  contents: Stack[];
  crowns: number;
}

export interface LootLine {
  stack: Stack;
  weight: number;
  /** Shown in red: taking it would put the hero over the carry limit. */
  tooHeavy: boolean;
}

export function lootLines(container: Container, inv: InventoryState, index: ItemIndex, limit?: number): LootLine[] {
  return container.contents.map(stack => ({
    stack: { ...stack },
    weight: (index.get(stack.itemId)?.weight ?? 0) * stack.count,
    tooHeavy: wouldOverload(inv, stack, index, limit),
  }));
}

export interface Taken {
  container: Container;
  inventory: InventoryState;
  /** Crowns gained. Opening a container takes its crowns at once: they weigh nothing. */
  crowns: number;
}

/** Tap E: take one line. Taking something too heavy is allowed; the hero then cannot sprint. Null if it is not there. */
export function takeOne(container: Container, inv: InventoryState, stack: Stack, index: ItemIndex): Taken | null {
  const contents = removeStack(container.contents, stack);
  if (!contents) return null;
  return { container: { ...container, contents, crowns: 0 }, inventory: pickUp(inv, stack, index), crowns: container.crowns };
}

/** Hold E: take everything. */
export function takeAll(container: Container, inv: InventoryState, index: ItemIndex): Taken {
  let inventory = inv;
  for (const stack of container.contents) inventory = pickUp(inventory, stack, index);
  return { container: { ...container, contents: [], crowns: 0 }, inventory, crowns: container.crowns };
}

/** Things collected by walking over them; everything else needs E (section 6, Picking up). */
export function collectedByWalking(kind: string): boolean {
  return kind === 'arrow' || kind === 'material';
}

/** Put found things into a container, for building strongboxes and chests from data. */
export function fill(container: Container, stacks: readonly Stack[]): Container {
  return { ...container, contents: stacks.reduce((c, s) => addStack(c, s), container.contents) };
}

// ---------- Gathering spots ----------

export interface GatherSpot {
  id: string;
  yields: Stack;
  /** The experience action it earns: forage, cut_wood, mine_ore, catch_fish, hunt_yield. */
  action: string;
}

/** A spot is ready if it was never gathered or enough days have passed. `gatheredOn` maps spot id to the day it was taken. */
export function spotReady(spotId: string, gatheredOn: Readonly<Record<string, number>>, day: number, regrowDays: number): boolean {
  const last = gatheredOn[spotId];
  return last === undefined || day - last >= regrowDays;
}
