// Skills: levels, experience, the region cap, catch-up, and overflow. Pure logic.

import { ACTIONS } from './actions';
import { PROGRESSION_TUNING as T } from './tuning';
import { SKILLS } from './types';
import type { ExperienceEvent as SharedExperienceEvent } from '../types';
import type { ExperienceEvent, ProgressionState, Rank, SkillGain, SkillId } from './types';

export function createProgression(regionCap: number = T.regionCaps.tallowmere, rank: Rank = 'apprentice'): ProgressionState {
  const skills = {} as ProgressionState['skills'];
  const overflowBank = {} as ProgressionState['overflowBank'];
  for (const s of SKILLS) {
    skills[s] = { level: 1, xp: 0 };
    overflowBank[s] = 0;
  }
  return { skills, rank, regionCap, perks: {}, equipped: [], sets: [], repeats: {}, overflowBank };
}

/** Experience needed to go from `level` to the next. */
export function xpToNext(level: number): number {
  return Math.round(T.xpBase * Math.pow(T.xpGrowth, level - 1));
}

/** Total experience needed to reach `level` from level 1. */
export function xpToReach(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNext(l);
  return total;
}

export function highestLevel(state: ProgressionState): number {
  let best = 1;
  for (const s of SKILLS) best = Math.max(best, state.skills[s].level);
  return best;
}

/** The effective cap: the region's, and never above the game's maximum. */
export function effectiveCap(state: ProgressionState): number {
  return Math.min(state.regionCap, T.maxLevel);
}

/** A skill well below the hero's highest levels faster. */
export function catchUpMultiplier(state: ProgressionState, skill: SkillId): number {
  const gap = highestLevel(state) - state.skills[skill].level;
  if (gap < T.catchUpGap) return 1;
  return Math.min(T.catchUpMax, 1 + (gap - T.catchUpGap + 1) * T.catchUpPerLevel);
}

/** What the next reward under this key is worth, as a multiplier. Does not record it. */
export function repeatMultiplier(state: ProgressionState, repeatKey: string | undefined): number {
  if (repeatKey === undefined) return 1;
  const seen = state.repeats[repeatKey] ?? 0;
  return seen < T.repeatFalloff.length ? T.repeatFalloff[seen] : 0;
}

function clampDifficulty(d: number | undefined): number {
  if (d === undefined || Number.isNaN(d)) return 1;
  return Math.min(T.difficultyMax, Math.max(T.difficultyMin, d));
}

/**
 * Awards experience for something the hero accomplished. Mutates `state`.
 * Unknown actions earn nothing and throw, so a typo cannot silently drop experience.
 * Returns what each skill gained; overflow is reported, and applied by perks.ts.
 */
export function awardExperience(state: ProgressionState, event: ExperienceEvent): SkillGain[] {
  const awards = ACTIONS[event.action];
  if (!awards) throw new Error(`Unknown experience action "${event.action}"`);

  const difficulty = clampDifficulty(event.difficulty);
  const repeat = repeatMultiplier(state, event.repeatKey);
  if (event.repeatKey !== undefined) state.repeats[event.repeatKey] = (state.repeats[event.repeatKey] ?? 0) + 1;

  const gains: SkillGain[] = [];
  for (const award of awards) {
    const amount = Math.round(award.base * difficulty * repeat * catchUpMultiplier(state, award.skill));
    gains.push(addExperience(state, award.skill, amount));
  }
  return gains;
}

/** Turns the shared event's 0-to-1 difficulty into this module's multiplier. */
export function multiplierFromShared(difficulty: number): number {
  const [lo, hi] = T.sharedDifficultyRange;
  const d = Math.min(1, Math.max(0, Number.isNaN(difficulty) ? 0 : difficulty));
  return lo + (hi - lo) * d;
}

/**
 * Awards experience for a shared ExperienceEvent (src/core/types), the form the other streams emit.
 * - The action id may be written with hyphens or underscores.
 * - The event's skill must be one the action really teaches; a mismatch throws, so experience
 *   cannot be sent to the wrong skill by mistake.
 * - The event's region raises the cap if that region's cap is higher. It never lowers it.
 * - Set `repeatable` on the event for targets that can be farmed for free (a practice target, one gathering
 *   spot); rewards for the same action on the same target then shrink to nothing.
 */
export function awardSharedEvent(state: ProgressionState, event: SharedExperienceEvent): SkillGain[] {
  const action = event.action.replace(/-/g, '_');
  const awards = ACTIONS[action];
  if (!awards) throw new Error(`Unknown experience action "${event.action}"`);
  if (!awards.some((a) => a.skill === event.skill)) {
    throw new Error(`Action "${event.action}" does not teach ${event.skill}`);
  }
  const cap = T.regionCaps[event.regionId];
  if (cap !== undefined) raiseRegionCap(state, cap);
  return awardExperience(state, {
    action,
    difficulty: multiplierFromShared(event.difficulty),
    repeatKey: event.repeatable ? `${action}:${event.targetId}` : undefined,
  });
}

/** Adds raw experience to one skill, levelling up to the cap and reporting the rest as overflow. */
export function addExperience(state: ProgressionState, skill: SkillId, amount: number): SkillGain {
  const s = state.skills[skill];
  const cap = effectiveCap(state);
  const levelBefore = s.level;
  let remaining = Math.max(0, amount);

  while (remaining > 0 && s.level < cap) {
    const need = xpToNext(s.level) - s.xp;
    if (remaining >= need) {
      remaining -= need;
      s.level += 1;
      s.xp = 0;
    } else {
      s.xp += remaining;
      remaining = 0;
    }
  }
  return { skill, gained: Math.max(0, amount), levelBefore, levelAfter: s.level, overflow: remaining };
}

/** Entering a new region raises the cap. It never lowers it. */
export function raiseRegionCap(state: ProgressionState, cap: number): void {
  state.regionCap = Math.max(state.regionCap, Math.min(cap, T.maxLevel));
}

/** The levels of the two skills the hero has used most, highest first. */
export function mainSkillLevels(state: ProgressionState): [number, number] {
  const levels = SKILLS.map((s) => state.skills[s].level).sort((a, b) => b - a);
  return [levels[0], levels[1]];
}
