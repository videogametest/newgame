// Teachers (GAME_DESIGN.md section 6, Skills). Each tradesperson who comes home gives one lesson in their skill,
// once, free. It is the welcome way to catch up: a player who is behind is never told to go and practise.
import { effectiveCap, highestLevel } from './skills';
import type { ProgressionState, SkillId } from './types';

/** Household id to the skill its people teach. */
export const TEACHERS: Readonly<Record<string, SkillId>> = {
  aldrics: 'smithing',
  marrins: 'cooking',
  tolleys: 'fletching',
  oona: 'gathering',
  sedges: 'archery',
};

export type LessonResult =
  | { ok: true; skill: SkillId; level: number; taken: string[] }
  | { ok: false; reason: 'no_teacher' | 'not_home' | 'already_taken' | 'nothing_to_teach' };

/**
 * Take a household's lesson. It raises their skill by one level if that skill is below the hero's highest, and is
 * then spent. If it would not help yet, it is not spent and can be asked for again later. Mutates `state` on success.
 * `taken` is the saved list of household ids whose lesson has been used.
 */
export function takeLesson(state: ProgressionState, household: string, home: readonly string[], taken: readonly string[]): LessonResult {
  const skill = TEACHERS[household];
  if (!skill) return { ok: false, reason: 'no_teacher' };
  if (!home.includes(household)) return { ok: false, reason: 'not_home' };
  if (taken.includes(household)) return { ok: false, reason: 'already_taken' };
  const s = state.skills[skill];
  if (s.level >= highestLevel(state) || s.level >= effectiveCap(state)) return { ok: false, reason: 'nothing_to_teach' };
  s.level += 1;
  s.xp = 0;
  return { ok: true, skill, level: s.level, taken: [...taken, household] };
}
