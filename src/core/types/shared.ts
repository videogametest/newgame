// Shared shapes for the world, progression, and save. Pure data, no engine imports.
// Revised for review 001 (docs/reviews/001-shared-types.md). Each stream builds against these; a stream that needs one
// changed asks the coordinator (docs/PARALLEL.md rule 1). Definitions (names, positions, trades) live in src/data, not here.

import type { CompanionState } from '../people/companions';
import type { Purse } from '../economy/purse';
import type { InventoryState } from '../items/types';
import type { Quiver, RecoverableArrow } from '../combat/quiver';
import type { Stories } from '../stories/stories';
import type { Taking } from '../valley/learns';
import type { Note } from '../notes/notes';
import type { SpeechLog } from '../speech/said';

/** A point on the ground plane (metres). */
export interface Vec2 {
  x: number;
  z: number;
}

// ---------- Places and households (GameDesign section 9) ----------

/** There is one village, Wick; there are no towns in Tallowmere. */
export type PlaceKind = 'village' | 'camp' | 'outpost';

/** A place's definition, in data (src/data). Never saved. */
export interface PlaceDef {
  id: string;
  kind: PlaceKind;
  name: string;
  position: Vec2;
  /** Region whose fixed difficulty applies here (design section 6). */
  regionId: string;
}

/** Held, then cleared of defenders, then freed only when the hero lights its lantern (section 9). */
export type PlaceStatus = 'held' | 'cleared' | 'freed';

/** A place's saved state. */
export interface PlaceState {
  id: string;
  status: PlaceStatus;
  /** How many times the hero has lit its lantern. More than one means it was retaken. */
  timesFreed: number;
  /** The alarm bell has no clapper (the Light Fingers perk). */
  bellSilenced: boolean;
  /** Morale of the defenders, 0 to 1. */
  morale: number;
  /** The day its lantern was last lit. Bandits taken to Wick decide at the next dawn. */
  freedDay?: number;
}

/** A household's saved state. Name, trade, house position, and trigger are definitions in data. */
export interface Household {
  id: string;
  /** True once the thing that brings them home has happened. */
  home: boolean;
  /** The in-game day they came home, for lines and for the order windows lit in. */
  homeSince?: number;
}

/** Whether a household's window is lit is derived from `home` and the hour; it is not stored. */

/** Where a bandit stands now. Each bandit is in exactly one of these. */
export type BanditState = 'alive' | 'dead' | 'knocked_out' | 'spared' | 'stayed' | 'left' | 'returned_to_stane';

// ---------- Skills and progression (GameDesign section 6) ----------

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

/** The hero's rank, earned through Hesper's trials, not experience (design section 6, Apprenticeship). */
export type HeroRank = 'apprentice' | 'scout' | 'warden';

/** Mastery rank of an earned perk. Rank is derived from mastery points. */
export type MasteryRank = 1 | 2 | 3;

export interface PerkProgress {
  rank: MasteryRank;
  /** Mastery points earned in total. Rank is derived from this. */
  mastery: number;
  /** How the perk was earned: from its primary source or its fallback. */
  via: 'primary' | 'fallback';
}

export interface PerkSet {
  name: string;
  perks: string[];
}

/** Everything about the hero's growth. Serializable; part of the save. Moved here from progression/types.ts (review 001, item 3). */
export interface ProgressionState {
  skills: Record<SkillId, SkillState>;
  rank: HeroRank;
  /** No skill passes this level in the current region. */
  regionCap: number;
  /** Earned perks by id. A perk is never removed once earned. */
  perks: Record<string, PerkProgress>;
  /** Ids of equipped perks. Only these are active. */
  equipped: string[];
  /** Up to three named sets of perks. */
  sets: PerkSet[];
  /** How many times each repeat key has been rewarded. */
  repeats: Record<string, number>;
  /** Overflow experience waiting for a perk of that skill to exist. */
  overflowBank: Record<SkillId, number>;
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
  /** True for a target that can be farmed for free (a practice target, one gathering spot). Read by awardSharedEvent. */
  repeatable?: boolean;
}

// ---------- Squad ----------
// Items are defined in src/core/items (ItemDef, Stack, InventoryState) and crowns in src/core/economy (Purse).

/** A recruit in the squad. Wounded members sit out the next battle (design section 3). Provisional. */
export interface SquadMember {
  id: string;
  name: string;
  level: number;
  wounded: boolean;
}

// ---------- Hero and the save ----------

/** The hero's state that a save holds. The rank is progression.rank, not a second copy here (review 001, item 3). */
export interface HeroState {
  position: Vec2;
  hp: number;
  maxHp: number;
  /** The region the hero is in. Sets the skill caps and the enemies' fixed difficulty. */
  regionId: string;
}

/** Save format version. Bump with a migration when the shape changes (design section 7). */
export const SAVE_VERSION = 3;

/**
 * The single serialisable game state (design section 7). Terrain and scenery are NOT stored: they come from the seed.
 * Migrate older saves by `version` in src/config/save.ts (SAVE_VERSION). Settings are not part of this object; they
 * have their own storage key (design section 10).
 */
export interface GameState {
  version: number;
  /** World seed. Terrain and scenery are generated from it. */
  seed: number;
  /** Hour of day, 0 to 24. */
  timeOfDay: number;
  /** In-game day count. Drives income, restocking, the tax cart, and "the next morning". */
  day: number;
  hero: HeroState;
  progression: ProgressionState;
  /** What the hero carries and has stored, recipes known, and stolen things sold (src/core/items). */
  inventory: InventoryState;
  /** Crowns carried and stored (src/core/economy). */
  purse: Purse;
  /** The last day whose income from freed places has been paid into the chest. */
  incomePaidThrough: number;
  /** Gathering spot id to the day it was last taken from. */
  gatheredOn: Record<string, number>;
  /** The tax cart's last run was stopped, so Stane's tax is lifted until the next one. */
  lastCartStopped: boolean;
  /** The arrows in the quiver, and those lying in the world that can be picked up. */
  quiver: Quiver;
  arrowsInWorld: RecoverableArrow[];
  /** Everyone who can travel with the hero, and how things stand with each (src/core/people). */
  company: CompanionState[];
  /** Overheard line ids the hero has heard. A tell that was heard guarantees a spared bandit stays. */
  heardLines: string[];
  /** How the hero took each place, for the valley to learn from (src/core/valley). */
  takings: Taking[];
  /** The five household stories (src/core/stories). */
  stories: Stories;
  /** The last loose thread Hesper mentioned, so she does not repeat it. */
  lastThread: string | null;
  /** What was said and who said it: the Notes tab (src/core/notes). Added in save version 3. */
  notes: Note[];
  /** Which lines have been said and when, so nobody repeats themselves (src/core/speech). Added in save version 3. */
  speech: SpeechLog;
  /** Household ids whose one lesson has been taken (src/core/progression/lessons). Added in save version 3. */
  lessonsTaken: string[];
  /** Knocked-out bandits the hero has bound. Added in save version 3. */
  boundBandits: string[];
  places: PlaceState[];
  households: Household[];
  /** Ids of chests already opened. */
  openedChests: string[];
  /** Ids of places the hero has found: the map and the compass. */
  discoveredPlaces: string[];
  /** Ids of fragments found: the Notes tab and Show. */
  fragmentsFound: string[];
  /** Bandit id to where they stand now. */
  bandits: Record<string, BanditState>;
  /** Ids of people who are dead or gone, so perk fallbacks know to apply. */
  lostPeople: string[];
  /** Ids of trials passed: rank and trial perks. */
  trialsPassed: string[];
  /** Ids of households that have had a stolen thing returned. */
  stolenGoodsReturned: string[];
  /** Ids of projects built for Wick. */
  projectsBuilt: string[];
  /** Ids of campfires found: the map. */
  campfiresFound: string[];
  /** Ids of story moments reached: the first lantern, the turn, Stane yielding, the finale. */
  storyMoments: string[];
}
