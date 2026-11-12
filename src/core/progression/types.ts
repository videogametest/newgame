// Progression types. Pure data: nothing here may import the engine.
// Owned by Claude's stream (docs/PARALLEL.md). See GAME_DESIGN.md section 6.

export const SKILLS = [
  'archery', 'melee', 'toughness', 'stealth', 'leadership',
  'gathering', 'fletching', 'cooking', 'smithing',
] as const;
export type SkillId = (typeof SKILLS)[number];

export const RANKS = ['apprentice', 'scout', 'warden'] as const;
export type Rank = (typeof RANKS)[number];

export interface SkillState {
  level: number;
  /** Experience earned toward the next level. */
  xp: number;
}

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

/** Everything about the hero's growth. Serializable; part of the save. */
export interface ProgressionState {
  skills: Record<SkillId, SkillState>;
  rank: Rank;
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
