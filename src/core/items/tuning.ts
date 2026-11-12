// Every number here is an untuned placeholder until task 006 balances it against a full playthrough.
// Fold into the single tuning file at integration (GAME_DESIGN.md section 7).
export const ITEMS_TUNING = {
  /** Kilograms the hero can carry and still sprint. */
  carryLimit: 40,
  /** Fixed bonuses for quality. Never rolled (section 6, Loot). */
  quality: {
    common: { effect: 1, value: 1 },
    fine: { effect: 1.15, value: 1.6 },
    masterwork: { effect: 1.3, value: 2.5 },
  },
  /** Tier multiplies what gear does and what it is worth. */
  tier: {
    bronze: { effect: 1, value: 1 },
    iron: { effect: 1.3, value: 2 },
    steel: { effect: 1.6, value: 4 },
  },
  /** Smithing level at which the hero's own work comes out at each quality. */
  craftQualityAt: { fine: 8, masterwork: 16 },
  /** One more arrow per batch for every this many Fletching levels. */
  fletchingLevelsPerExtraArrow: 5,
  /** Extra arrows per batch at the Tolleys' bench. */
  benchExtraArrows: 2,
  /** Arrows a Field Fletcher can make away from a fire in one go. */
  fieldBatch: 3,
  /** In-game days before a gathering spot refills. */
  regrowDays: 3,
  /** Marks an item can carry at each rank of Maker's Mark. */
  marksAtRank: [0, 1, 2, 2],
} as const;
