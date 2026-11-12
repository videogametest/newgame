// Stream F2 (Claude). Items, loot, and crafting. GAME_DESIGN.md section 6: Loot, Gathering, Crafting, Carrying.
// Pure data and rules. No engine imports. Shipped dark until task 006.

export type ItemKind = 'weapon' | 'arrow' | 'armour' | 'food' | 'material' | 'stolen' | 'keepsake' | 'tool';
export const TIERS = ['bronze', 'iron', 'steel'] as const;
export type Tier = (typeof TIERS)[number];
export const QUALITIES = ['common', 'fine', 'masterwork'] as const;
export type Quality = (typeof QUALITIES)[number];
export type GearSlot = 'blade' | 'bow' | 'head' | 'body' | 'shield';

/** What a cooked meal lends, beyond healing. Keys are read by the system that owns the effect. */
export interface MealBonus {
  key: 'well_fed' | 'soft_foot' | 'owl_sight' | 'wolf_bane';
  /** 'hours' runs out on the clock; 'dawn' lasts until the next dawn (Night Stew). */
  lasts: 'hours' | 'dawn';
}

export interface ItemDef {
  id: string;
  /** The base name. For gear the shown name adds quality and tier: see `displayName`. */
  name: string;
  kind: ItemKind;
  /** Kilograms against the carry limit. */
  weight: number;
  /** Base worth in crowns, before quality, the trader, and the valley's recovery. */
  value: number;
  /** The detail panel's words, from docs/writing/items.md. Used exactly as written. */
  description?: string;
  tier?: Tier;
  slot?: GearSlot;
  /** A unique item: placed by hand, one property, never sold, and dropping it asks first. */
  unique?: { propertyKey: string; property: string };
  /** A stolen thing: the household it belongs to. */
  owner?: string;
  /** Health restored when eaten. */
  heals?: number;
  bonus?: MealBonus;
}

/** A pile of one thing. Gear of different quality or with different marks does not share a pile. */
export interface Stack {
  itemId: string;
  count: number;
  /** Absent means common. */
  quality?: Quality;
  /** Property keys worked in with the Maker's Mark perk. */
  marks?: string[];
}

export interface InventoryState {
  carried: Stack[];
  /** The chest at Hesper's, and later the Fairlow house. Unlimited. */
  stored: Stack[];
  /** Item ids picked up since the inventory was last opened: the dot. */
  unseen: string[];
  /** Stolen things the hero sold instead of returning. Their household says its sold line once. */
  soldStolen: string[];
  /** Recipe ids the hero knows. */
  recipes: string[];
}

export type ItemIndex = ReadonlyMap<string, ItemDef>;
