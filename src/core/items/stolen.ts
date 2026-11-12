// Stolen goods: the link between looting and the story (GAME_DESIGN.md section 6; docs/writing/households.md).
import { removeStack } from './inventory';
import type { InventoryState, ItemIndex } from './types';

/** Where each stolen thing lies. Container ids are placed by the world; these name the place only. */
export const STOLEN_PLACES: Readonly<Record<string, string>> = {
  smiths_hammer: 'forge_anvil',
  wedding_ring: 'mill_strongbox',
  bowyers_tools: 'waterfall_cave',
  loom_shuttle: 'watch_house_strongbox',
  brass_candlesticks: 'tax_cart',
  carved_horse: 'forge_strongbox',
  hale_sedges_bow: 'watch_house_wall',
};

export interface Returned {
  inventory: InventoryState;
  /** The household it went back to. Add it to GameState.stolenGoodsReturned. */
  household: string;
  /** Handed to its owner, or left at the door of a house nobody has come home to yet. */
  how: 'handed' | 'left_at_door';
}

/** Give a stolen thing back. Works whether or not the family is home. Null if the hero is not carrying it. */
export function returnStolen(inv: InventoryState, itemId: string, ownerIsHome: boolean, index: ItemIndex): Returned | null {
  const def = index.get(itemId);
  if (!def || def.kind !== 'stolen' || !def.owner) return null;
  const carried = removeStack(inv.carried, { itemId, count: 1 });
  if (!carried) return null;
  return { inventory: { ...inv, carried }, household: def.owner, how: ownerIsHome ? 'handed' : 'left_at_door' };
}

/** A stolen thing can be returned or sold, never both, and a returned thing cannot be taken back. */
export function stolenFate(itemId: string, inv: InventoryState, returnedHouseholds: readonly string[], index: ItemIndex): 'held' | 'returned' | 'sold' | 'not_found' {
  const def = index.get(itemId);
  if (def?.owner && returnedHouseholds.includes(def.owner)) return 'returned';
  if (inv.soldStolen.includes(itemId)) return 'sold';
  const has = [...inv.carried, ...inv.stored].some(s => s.itemId === itemId);
  return has ? 'held' : 'not_found';
}

/** Households that will never get their thing back, because it was sold. What each does then is written in docs/writing/households.md. */
export function householdsSoldOut(inv: InventoryState, index: ItemIndex): string[] {
  return inv.soldStolen.flatMap(id => index.get(id)?.owner ?? []);
}
