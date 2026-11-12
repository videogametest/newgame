// Progression types. Pure data: nothing here may import the engine.
// Owned by Claude's stream (docs/PARALLEL.md). See GAME_DESIGN.md section 6.

// Skill ids, skill state, the hero's rank, perk progress, and ProgressionState live in src/core/types
// (docs/PARALLEL.md rule 1; review 001, item 3). They are re-exported here under this module's names.
import { SKILL_IDS } from '../types';
import type { HeroRank, MasteryRank, PerkProgress, PerkSet, ProgressionState, SkillId, SkillState } from '../types';

export const SKILLS = SKILL_IDS;
export type { MasteryRank, PerkProgress, PerkSet, ProgressionState, SkillId, SkillState };
export type Rank = HeroRank;
export const RANKS: readonly Rank[] = ['apprentice', 'scout', 'warden'];

/**
 * Something the hero accomplished. Experience is only ever awarded for a registered
 * action (see actions.ts); there is no way to award it for time passing or for harm taken.
 */
export interface ExperienceEvent {
  action: string;
  /**
   * How hard the feat was, as a multiplier: 1 is ordinary. A long shot or a tougher
   * target is above 1. Clamped by the tuning.
   */
  difficulty?: number;
  /**
   * Set this when the same thing can be done again and again to the same target for
   * free: a practice target, a single gathering spot. Rewards under one key shrink to nothing.
   * Leave it unset for ordinary fights, where every enemy is a new target.
   */
  repeatKey?: string;
}

export interface SkillGain {
  skill: SkillId;
  gained: number;
  levelBefore: number;
  levelAfter: number;
  /** Experience that could not raise the skill because it is at the region cap. */
  overflow: number;
}

export type PerkSource =
  | { kind: 'level'; skill: SkillId; level: number }
  | { kind: 'trial'; trial: string }
  | { kind: 'story'; moment: string }
  | { kind: 'secret'; place: string }
  /** A person teaches it. People can be killed or can leave, so these need a fallback. */
  | { kind: 'person'; person: string }
  /** Hesper teaches it in someone's place, for crowns. Only ever a fallback. */
  | { kind: 'hesper'; cost: number };

/** Which system implements a perk's effect. That stream owns the code; this only declares it. */
export type PerkSystem = 'combat' | 'stealth' | 'squad' | 'items' | 'world';

export interface PerkDef {
  id: string;
  name: string;
  skill: SkillId;
  /** What the perk lets the hero do, in one sentence, as shown to the player. */
  summary: string;
  /** What each mastery rank adds. Rank 1 is the perk as first earned. */
  ranks: [string, string, string];
  source: PerkSource;
  /** Required when the source can be lost. Null when it cannot. */
  fallback: PerkSource | null;
  /** Shown in the ledger before the perk is earned. Says where to look, never what to do. */
  hint: string;
  /** The system that implements the effect, and the key it is known by there. */
  effect: { system: PerkSystem; key: string };
}

export interface LedgerEntry {
  id: string;
  name: string;
  skill: SkillId;
  earned: boolean;
  /** Present when earned. */
  rank?: MasteryRank;
  equipped: boolean;
  /** The summary when earned; the hint when not. */
  text: string;
}
