// Stream E, GAME_DESIGN v21 §§3, 5, 9, 10. Shipped dark.
// Kept inside this stream's owned directory until the coordinator folds these
// values into src/config/tuning.ts and exposes them in the tuning panel.
export type ArrowType = 'standard' | 'fire' | 'blunt' | 'whistling';
export type HitZone = 'body' | 'head';
export type Weight = 'light' | 'heavy';
export type Loyalty = 'low' | 'middling' | 'high';
export type NumericTuning<T> = { readonly [K in keyof T]: number };

export const COMBAT_DEPTH_TUNING = {
  weakPoints: {
    body: 1,
    head: 3, // untuned placeholder
    helmetHead: 1.5, // untuned placeholder
    bruteFrontHead: 1,
    firstStrike: 3, // untuned placeholder
  },
  quiverCapacity: 24, // untuned placeholder
  hitArrowBreakChance: 0.25, // untuned placeholder
  draw: {
    perfectSeconds: 0.15, // untuned placeholder
    damageMultiplier: 1.25, // untuned placeholder
    gravityMultiplier: 0.7, // untuned placeholder
  },
  dodge: {
    perfectSeconds: 0.12, // untuned placeholder
    criticalMultiplier: 2, // untuned placeholder
  },
  attackTurns: { ordinary: 2, commandedGuard: 3 },
  morale: {
    defenderBeaten: -0.1, // untuned placeholder
    leaderBeaten: -0.35, // untuned placeholder (additional to defender loss)
    surprised: -0.15, // untuned placeholder
    fireSpread: -0.2, // untuned placeholder
    reinforcements: 0.2, // untuned placeholder
  },
  loyalty: {
    low: 0.2, // untuned placeholder
    middling: 0.5, // untuned placeholder
    high: 0.9, // untuned placeholder
  },
  winBack: {
    baseStay: 0.2, // untuned placeholder
    recoveryWeight: 0.3, // untuned placeholder
    mercyWeight: 0.3, // untuned placeholder
    loyaltyPenalty: 0.3, // untuned placeholder
    returnLoyaltyThreshold: 0.8, // untuned placeholder
  },
} as const;

export const ARROW_TYPES = {
  standard: { damageMultiplier: 1, lethal: true, ignites: false, distracts: false, revealsAtNight: false, scarce: false },
  fire: { damageMultiplier: 1, lethal: true, ignites: true, distracts: false, revealsAtNight: true, scarce: true },
  blunt: {
    damageMultiplier: 0.5, // untuned placeholder
    lethal: false, ignites: false, distracts: false, revealsAtNight: false, scarce: false,
  },
  whistling: { damageMultiplier: 0, lethal: false, ignites: false, distracts: true, revealsAtNight: false, scarce: true },
} as const satisfies Record<ArrowType, {
  damageMultiplier: number; lethal: boolean; ignites: boolean;
  distracts: boolean; revealsAtNight: boolean; scarce: boolean;
}>;

/** Fixed location data, never a function of the player's skills or rank. */
export interface RegionDifficulty { health: number; damage: number }
export const REGION_DIFFICULTY: Readonly<Record<string, RegionDifficulty>> = {
  tallowmere: { health: 1, damage: 1 },
  // TODO(design §3): later-region multipliers require region definitions.
};

/** No XP, loot quality, story, or reward multiplier may enter this shape. */
export interface DifficultyMultipliers {
  enemyDamage: number;
  enemySenses: number;
  perfectDrawWindow: number;
  perfectDodgeWindow: number;
  arrowBreakChance: number;
  foodHealing: number;
  reinforcements: number;
  arrowSupply: number;
  foodSupply: number;
}
export type DifficultyPreset = 'lantern' | 'dusk' | 'moonless';
export const DIFFICULTY_PRESETS: Record<DifficultyPreset, DifficultyMultipliers> = {
  // All non-identity preset values below are // untuned placeholder
  lantern: { enemyDamage: 0.7, enemySenses: 0.75, perfectDrawWindow: 1.5, perfectDodgeWindow: 1.5, arrowBreakChance: 0.2, foodHealing: 1.4, reinforcements: 1, arrowSupply: 1, foodSupply: 1 },
  dusk: { enemyDamage: 1, enemySenses: 1, perfectDrawWindow: 1, perfectDodgeWindow: 1, arrowBreakChance: 1, foodHealing: 1, reinforcements: 1, arrowSupply: 1, foodSupply: 1 },
  moonless: { enemyDamage: 1.3, enemySenses: 1.25, perfectDrawWindow: 1, perfectDodgeWindow: 1, arrowBreakChance: 1, foodHealing: 1, reinforcements: 1.5, arrowSupply: 0.7, foodSupply: 0.7 },
};
