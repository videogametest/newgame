// Traders (GAME_DESIGN.md section 6, Money and trade). Prices improve and stock widens as the valley recovers.
import { addStack, removeStack } from '../items/inventory';
import { ITEMS_TUNING } from '../items/tuning';
import type { InventoryState, ItemDef, ItemIndex, Quality, Stack } from '../items/types';
import { gain, spend, type Purse } from './purse';
import { ECONOMY_TUNING } from './tuning';

export interface Market {
  /** The valley recovery level, 0 to 1, derived by the people stream. */
  recovery: number;
  /** True while Stane's tax applies (see `taxed`). */
  taxed: boolean;
  /** Goodwill the village bears the hero, 0 to 1, from the household stories. Takes a little off what traders charge. */
  goodwill?: number;
}

const mix = ([a, b]: readonly [number, number], t: number) => a + (b - a) * Math.min(1, Math.max(0, t));

/** What a thing is worth before any trader touches it. */
export function worth(def: ItemDef, quality: Quality = 'common'): number {
  return def.value * ITEMS_TUNING.quality[quality].value;
}

/** What a trader charges for one. Never less than one crown. */
export function buyPrice(def: ItemDef, quality: Quality, market: Market): number {
  const price = worth(def, quality) * mix(ECONOMY_TUNING.buyMarkup, market.recovery) * (market.taxed ? ECONOMY_TUNING.taxPrice : 1)
    * (1 - ECONOMY_TUNING.goodwillDiscount * Math.min(1, Math.max(0, market.goodwill ?? 0)));
  return Math.max(1, Math.ceil(price));
}

/** What a trader pays for one. Always below the price to buy it back, so trade is never a money machine. */
export function sellPrice(def: ItemDef, quality: Quality, market: Market): number {
  const price = Math.floor(worth(def, quality) * mix(ECONOMY_TUNING.sellShare, market.recovery));
  return Math.min(price, buyPrice(def, quality, market) - 1);
}

export interface StockLine {
  itemId: string;
  /** How many the trader has after each restock. */
  count: number;
  quality?: Quality;
  /** The recovery level at which the trader starts to carry it. */
  fromRecovery: number;
}

export interface TraderDef {
  id: string;
  /** The household whose return brings this trader. */
  household: string;
  stock: StockLine[];
}

/** Stock and thresholds are untuned placeholders. The Kettles are the general trader who comes early. */
export const TRADERS: readonly TraderDef[] = [
  { id: 'kettles', household: 'kettles', stock: [
    { itemId: 'arrow_standard', count: 30, fromRecovery: 0 }, { itemId: 'apple', count: 6, fromRecovery: 0 },
    { itemId: 'cloth', count: 6, fromRecovery: 0 }, { itemId: 'arrow_shaft', count: 20, fromRecovery: 0.1 },
    { itemId: 'throwing_knife', count: 4, fromRecovery: 0.2 }, { itemId: 'leather', count: 4, fromRecovery: 0.3 },
    { itemId: 'arrow_whistling', count: 3, fromRecovery: 0.5 },
  ] },
  { id: 'marrins', household: 'marrins', stock: [
    { itemId: 'marrins_loaf', count: 6, fromRecovery: 0 }, { itemId: 'flour', count: 6, fromRecovery: 0 },
    { itemId: 'honey_cake', count: 2, fromRecovery: 0.6 },
  ] },
  { id: 'tolleys', household: 'tolleys', stock: [
    { itemId: 'arrow_standard', count: 40, fromRecovery: 0 }, { itemId: 'arrow_blunt', count: 10, fromRecovery: 0 },
    { itemId: 'ash_stave', count: 4, fromRecovery: 0 }, { itemId: 'arrow_fire', count: 5, fromRecovery: 0.5 },
  ] },
  { id: 'aldrics', household: 'aldrics', stock: [
    { itemId: 'bronze', count: 6, fromRecovery: 0 }, { itemId: 'charcoal', count: 10, fromRecovery: 0 },
    { itemId: 'iron', count: 4, fromRecovery: 0.4 }, { itemId: 'iron_blade', count: 1, fromRecovery: 0.5 },
    { itemId: 'steel', count: 2, fromRecovery: 0.8 },
  ] },
  // The fisher never left: 'fisher' is not one of the sixteen households, and this trader is there from the start.
  { id: 'fisher', household: 'fisher', stock: [
    { itemId: 'perch', count: 6, fromRecovery: 0 }, { itemId: 'smoked_perch', count: 3, fromRecovery: 0 }, { itemId: 'eel', count: 2, fromRecovery: 0 },
  ] },
];

/** What a trader has on the shelf after a restock. The tax thins it; a line never drops below one once it is carried. */
export function shelf(trader: TraderDef, market: Market): Stack[] {
  return trader.stock.filter(line => market.recovery >= line.fromRecovery).map(line => ({
    itemId: line.itemId,
    count: Math.max(1, Math.floor(line.count * (market.taxed ? ECONOMY_TUNING.taxStock : 1))),
    ...(line.quality ? { quality: line.quality } : {}),
  }));
}

export interface Deal {
  purse: Purse;
  inventory: InventoryState;
  /** The trader's shelf after the deal. */
  shelf: Stack[];
  crowns: number;
}
export type Refusal = 'unknown_item' | 'not_in_stock' | 'not_enough_crowns' | 'not_carried' | 'never_sold';

const qualityOf = (s: Stack): Quality => s.quality ?? 'common';

export function buy(purse: Purse, inv: InventoryState, traderShelf: readonly Stack[], stack: Stack, market: Market, index: ItemIndex): Deal | Refusal {
  const def = index.get(stack.itemId);
  if (!def) return 'unknown_item';
  const left = removeStack(traderShelf, stack);
  if (!left) return 'not_in_stock';
  const crowns = buyPrice(def, qualityOf(stack), market) * stack.count;
  const paid = spend(purse, crowns);
  if (!paid) return 'not_enough_crowns';
  return { purse: paid, inventory: { ...inv, carried: addStack(inv.carried, stack) }, shelf: left, crowns };
}

/**
 * Sell to a trader. Unique items are never sold. A stolen thing can be: it is then recorded as sold for good, and
 * the sell list shows whose it is first ("This is {name}'s."), which is the caller's to display.
 */
export function sell(purse: Purse, inv: InventoryState, traderShelf: readonly Stack[], stack: Stack, market: Market, index: ItemIndex): Deal | Refusal {
  const def = index.get(stack.itemId);
  if (!def) return 'unknown_item';
  if (def.unique) return 'never_sold';
  const carried = removeStack(inv.carried, stack);
  if (!carried) return 'not_carried';
  const crowns = sellPrice(def, qualityOf(stack), market) * stack.count;
  const stolen = def.kind === 'stolen';
  return {
    purse: gain(purse, crowns),
    inventory: { ...inv, carried, soldStolen: stolen ? [...inv.soldStolen, def.id] : inv.soldStolen },
    // A sold stolen thing does not go on the shelf: it cannot be bought back.
    shelf: stolen ? [...traderShelf] : addStack(traderShelf, stack),
    crowns,
  };
}

/** Whose a stolen thing is, for the sell list. Null for anything else. */
export function ownerOf(def: ItemDef): string | null {
  return def.kind === 'stolen' ? def.owner ?? null : null;
}
