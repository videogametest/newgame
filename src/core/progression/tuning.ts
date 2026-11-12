// Progression numbers. Provisional until the systems are wired and the pacing test runs
// against a real playthrough (task 006). Viktor may fold this into the main tuning file;
// the values and their meaning stay Claude's to change.

import type { Rank } from './types';

export const PROGRESSION_TUNING = {
  /** The highest level a skill can ever reach. */
  maxLevel: 50,
  /** Region caps by region id. */
  regionCaps: { tallowmere: 20 } as Record<string, number>,

  /** Experience needed to go from level L to L+1 is base * growth^(L-1), rounded. */
  xpBase: 35,
  xpGrowth: 1.1,

  /**
   * The shared ExperienceEvent rates difficulty from 0 (trivial) to 1 (hardest). It is turned
   * into a multiplier on this line: 0 gives the first value, 1 gives the second. An ordinary
   * feat sits near 0.2, which gives a multiplier of 1.
   */
  sharedDifficultyRange: [0.5, 3] as [number, number],

  /**
   * Easy things stop teaching. The shared 0-to-1 difficulty is also read as a lesson level: difficulty times this
   * number. A skill above the lesson level loses `easyPerLevel` of the reward for each level it is above, down to
   * `easyFloor`. This is what keeps a skill from racing ahead of the story, however thorough the player is.
   */
  lessonLevelsPerDifficulty: 40,
  easyPerLevel: 0.22,
  easyFloor: 0.1,

  /** Difficulty multipliers on an event are clamped to this range. */
  difficultyMin: 0.25,
  difficultyMax: 4,

  /**
   * Multiplier for the 1st, 2nd, 3rd... reward under one repeat key. Past the end it is 0.
   */
  repeatFalloff: [1, 0.75, 0.5, 0.3, 0.15, 0.05],

  /** Catch-up: a skill this many levels below the hero's highest starts to level faster. */
  catchUpGap: 4,
  /** Extra multiplier per level of gap beyond catchUpGap. */
  catchUpPerLevel: 0.15,
  /** The catch-up multiplier never exceeds this. */
  catchUpMax: 2,

  /** Perk slots by rank. */
  slots: { apprentice: 3, scout: 5, warden: 7 } as Record<Rank, number>,
  /** How many named sets can be saved. */
  maxSets: 3,

  /** Mastery points needed in total to reach rank 2 and rank 3. */
  masteryForRank2: 120,
  masteryForRank3: 360,
  /** Mastery points for one meaningful use of an equipped perk. */
  masteryPerUse: 4,
  /** Mastery points per point of overflow experience. */
  masteryPerOverflow: 0.5,
} as const;
