// PROVISIONAL shared shapes for the open-world streams. Pure data, no engine imports.
// Each stream builds against these. A stream that needs one changed asks the coordinator (docs/PARALLEL.md rule 1).
// Fields marked "provisional" are placeholders until their task wires them in.

/** A point on the ground plane (metres). */
export interface Vec2 {
  x: number;
  z: number;
}

/** A place on the world map: a town, an outpost, or a bandit camp (design section 4). Provisional. */
export type PlaceKind = 'town' | 'outpost' | 'camp';

export interface Place {
  id: string;
  kind: PlaceKind;
  name: string;
  position: Vec2;
  /** Region whose fixed difficulty applies here (design section 6). Provisional. */
  regionId: string;
  captured: boolean;
}

/** A household living in a place. Its lit windows and recovery are derived by the people stream. Provisional. */
export interface Household {
  id: string;
  placeId: string;
  /** Number of windows that can light in this house (design section 9). Provisional. */
  windowCount: number;
  /** Windows currently lit. Derived state; the save may keep it. */
  litWindows: number;
}

/** The nine skills that level by use (design section 6, table under Skills). No classes. */
export const SKILL_IDS = [
  'archery',
  'melee',
  'toughness',
  'stealth',
  'leadership',
  'gathering',
  'fletching',
  'cooking',
  'smithing',
] as const;

export type SkillId = (typeof SKILL_IDS)[number];

/** Levels run 1 to 50 across the game; each region caps them (design section 6). */
export interface SkillState {
  level: number;
  /** Experience within the current level. Provisional: the XP curve is data, not design. */
  xp: number;
}

/**
 * One accomplishment that can earn experience (design section 6, Skills rules). Progression decides how much it is
 * worth; nothing else grants experience. Provisional.
 */
export interface ExperienceEvent {
  skill: SkillId;
  /** What happened, as a data id, e.g. 'arrow-hit', 'weak-point-hit', 'perfect-dodge', 'knockout', 'forage'. Provisional. */
  action: string;
  /** What it happened to: an enemy, a place, an item or a node id. */
  targetId: string;
  /** How hard the feat was, 0 (trivial) to 1 (hardest). Harder feats teach more. Provisional. */
  difficulty: number;
  /** The region the event happened in; sets the skill cap that applies. */
  regionId: string;
}

/** The hero's rank, earned through Hesper's trials, not experience (design section 6, Apprenticeship). */
export type HeroRank = 'apprentice' | 'scout' | 'warden';

/** An item in data (src/data). Gear, materials, food, and arrows all weigh something; gold does not. Provisional. */
export interface ItemDef {
  id: string;
  name: string;
  /** Weight in kilograms against the carry limit (design section 6). */
  weight: number;
  /** Base value in gold. */
  value: number;
}

export interface ItemStack {
  itemId: string;
  count: number;
}

/** A recruit in the squad. Wounded members sit out the next battle (design section 3). Provisional. */
export interface SquadMember {
  id: string;
  name: string;
  level: number;
  wounded: boolean;
}

/** The hero's state that a save holds. */
export interface HeroState {
  position: Vec2;
  hp: number;
  maxHp: number;
  gold: number;
  rank: HeroRank;
  /** The region the hero is in. Sets the skill caps and the enemies' fixed difficulty. */
  regionId: string;
}

/**
 * The single serialisable game state (design section 7). Terrain and scenery are NOT stored: they come from the seed.
 * Migrate older saves by `version` in src/config/save.ts (SAVE_VERSION).
 */
/** Save format version. Bump with a migration when the shape changes (design section 7). */
export const SAVE_VERSION = 1;

export interface GameState {
  version: number;
  /** World seed. Terrain and scenery are generated from it. */
  seed: number;
  /** Hour of day, 0 to 24. */
  timeOfDay: number;
  hero: HeroState;
  skills: Record<SkillId, SkillState>;
  inventory: ItemStack[];
  squad: SquadMember[];
  places: Place[];
  households: Household[];
  /** Ids of chests already opened. */
  openedChests: string[];
}
