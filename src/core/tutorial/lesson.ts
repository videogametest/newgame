// The first evening (task 010). Pure: no engine, DOM or storage. Queue item 25 built steps 1 and 2, item 26 step 3
// (the yard, ./yard.ts), item 27 steps 4 to 6 (./fence.ts, ./post.ts, ./lantern.ts) and walking away and back.
import { TUNING } from '../../config/tuning';
import { advanceYard, newYard, type YardEvent, type YardState } from './yard';
import { advanceFence, newFence, type FenceEvent, type FenceRules, type FenceState } from './fence';
import { advancePost, newPost, type PostEvent, type PostRules, type PostState } from './post';
import { advanceLantern, newLantern, type LanternEvent, type LanternState } from './lantern';
export type EveningStep = 'road' | 'door' | 'yard' | 'fence' | 'post' | 'lantern' | 'done';
export type EveningChoice = 'show' | 'skip';
export interface TutorialState {
  step: EveningStep;
  /** The opening line has been put on screen once. */
  opened: boolean;
  /** Controls the road-in prompts teach; a prompt is gone for good once its control has been used. */
  used: { move: boolean; look: boolean; sprint: boolean };
  /** Seconds walked on the road, for the sprint prompt's "after a few seconds of walking". */
  walked: number;
  choice: EveningChoice | null;
  /** Step 3, the yard. Added in save version 5. */
  yard: YardState;
  /** Steps 4, 5 and 6. Added in save version 6. */
  fence: FenceState;
  post: PostState;
  lantern: LanternState;
  /** The hero has walked out of her yard mid-lesson (she has called after him once); times he has come back. */
  away: boolean;
  backs: number;
}
export interface LessonRules { fence: FenceRules; post: PostRules }
export const LESSON_RULES: LessonRules = { fence: TUNING.tutorial.fence, post: TUNING.tutorial.post };
export type TutorialEvent =
  | { type: 'opened' }
  | { type: 'walked'; seconds: number }
  | { type: 'looked' }
  | { type: 'sprinted' }
  | { type: 'reachedDoor' }
  | { type: 'chose'; choice: EveningChoice }
  /** The hero left her yard, or came back into it (the yard's bounds are the caller's: src/village/yard.ts). */
  | { type: 'leftYard' }
  | { type: 'cameBack' }
  | YardEvent | FenceEvent | PostEvent | LanternEvent;

/** Design step numbers ("The first evening"); 7 is past the lesson. */
export const STEP_NUMBER: Record<EveningStep, number> = { road: 1, door: 2, yard: 3, fence: 4, post: 5, lantern: 6, done: 7 };
/** Destinations reached by the choice whose lessons are not built yet. None since item 27. */
export const PENDING: Partial<Record<EveningStep, string>> = {};
/** Steps taught in her yard: walking out of it mid-lesson is noticed, and the rest waits there. */
export const IN_YARD: readonly EveningStep[] = ['yard', 'fence', 'post', 'lantern'];
export const CHOICE_IDS: Record<EveningChoice, string> = { show: 'evening.choice.0', skip: 'evening.choice.1' };

export function newTutorial(): TutorialState {
  return { step: 'road', opened: false, used: { move: false, look: false, sprint: false }, walked: 0, choice: null, ...newLaterSteps() };
}
/** What save version 6 added, fresh. */
export function newLaterSteps(): Pick<TutorialState, 'yard' | 'fence' | 'post' | 'lantern' | 'away' | 'backs'> {
  return { yard: newYard(), fence: newFence(), post: newPost(), lantern: newLantern(), away: false, backs: 0 };
}

/** One event, under the tuning file's lesson rules. */
export function advance(s: TutorialState, e: TutorialEvent): TutorialState { return advanceWith(s, e, LESSON_RULES); }
export function advanceWith(s: TutorialState, e: TutorialEvent, r: LessonRules): TutorialState {
  const used = { ...s.used };
  switch (e.type) {
    case 'opened': return s.opened ? s : { ...s, opened: true };
    case 'walked':
      if (!(e.seconds > 0)) return s;
      used.move = true;
      return { ...s, used, walked: s.walked + e.seconds };
    case 'looked': return s.used.look ? s : { ...s, used: { ...used, look: true } };
    case 'sprinted': return s.used.sprint ? s : { ...s, used: { ...used, move: true, sprint: true } };
    case 'reachedDoor': return s.step === 'road' ? { ...s, step: 'door' } : s;
    case 'chose':
      // The choice is made once, at her door (it can only be offered there; the road leads to it).
      if (s.choice || (s.step !== 'door' && s.step !== 'road')) return s;
      return { ...s, step: e.choice === 'show' ? 'yard' : 'lantern', choice: e.choice };
    case 'leftYard': return IN_YARD.includes(s.step) && !s.away ? { ...s, away: true } : s;
    case 'cameBack': return s.away ? { ...s, away: false, backs: s.backs + 1 } : s;
    case 'fenceOpened': case 'fenceStep': {
      if (s.step !== 'fence' || s.away) return s;
      const fence = advanceFence(s.fence, e, r.fence);
      if (fence === s.fence) return s;
      return { ...s, fence, step: fence.phase === 'done' ? 'post' : 'fence' };
    }
    case 'postOpened': case 'bladeStrike': case 'turnipLanded': {
      if (s.step !== 'post' || s.away) return s;
      const post = advancePost(s.post, e, r.post);
      if (post === s.post) return s;
      return { ...s, post, step: post.phase === 'done' ? 'lantern' : 'post' };
    }
    case 'lanternAsked': case 'lanternLit': case 'mapShown': {
      if (s.step !== 'lantern') return s;
      const lantern = advanceLantern(s.lantern, e);
      if (lantern === s.lantern) return s;
      return { ...s, lantern, step: lantern.phase === 'done' ? 'done' : 'lantern' };
    }
    default: {
      // The yard's own events count only while the lesson is in the yard.
      if (s.step !== 'yard') return s;
      const yard = advanceYard(s.yard, e);
      if (yard === s.yard) return s;
      return { ...s, yard, step: yard.phase === 'done' ? 'fence' : 'yard' };
    }
  }
}

/** Her call when the hero walks out mid-lesson, and her welcome back (one of, in turn). */
export function awaySays(before: TutorialState, after: TutorialState, backLines: number): { group: string; index: number }[] {
  if (!before.away && after.away) return [{ group: 'evening.left', index: 0 }];
  if (before.away && !after.away) return [{ group: 'evening.back', index: (after.backs - 1) % Math.max(1, backLines) }];
  return [];
}

/** The line that says what she is asking for now, for a returning hero or a talk at her door; null when none. */
export function currentAsk(s: TutorialState): { group: string; index: number } | null {
  switch (s.step) {
    case 'yard': {
      const p = s.yard.phase;
      return p === 'targets' ? { group: 'evening.targets', index: 0 } : p === 'far' ? { group: 'evening.far', index: 0 }
        : p === 'arrows' ? { group: 'evening.arrows', index: 0 } : null;
    }
    case 'fence':
      return s.fence.phase === 'cross' ? { group: 'evening.fence', index: 0 } : s.fence.phase === 'mark' ? { group: 'evening.fence.mark', index: 0 } : null;
    case 'post': {
      const p = s.post.phase;
      return p === 'blade' ? { group: 'evening.post', index: 0 } : p === 'dodge' ? { group: 'evening.post.dodge', index: 0 }
        : p === 'lock' ? { group: 'evening.post.lock', index: 0 } : null;
    }
    case 'lantern': return s.lantern.phase === 'light' ? { group: 'evening.lantern', index: 0 } : null;
    default: return null;
  }
}

export function choiceFromAnswer(id: string | null): EveningChoice | null {
  return id === CHOICE_IDS.show ? 'show' : id === CHOICE_IDS.skip ? 'skip' : null;
}

/** Which road-in prompts show now. Each shows until its control is used, and only before the choice. */
export function roadPrompts(s: TutorialState, sprintAfter: number): ('move' | 'look' | 'sprint')[] {
  if (s.choice || !s.opened) return [];
  const out: ('move' | 'look' | 'sprint')[] = [];
  if (!s.used.move) out.push('move');
  if (!s.used.look) out.push('look');
  if (!s.used.sprint && s.walked >= sprintAfter) out.push('sprint');
  return out;
}

/** The choice is still open at her door. */
export const choiceOpen = (s: TutorialState): boolean => s.choice === null;

/**
 * Saves from before the tutorial existed (version < 4) belong to players already past the road: no opening line,
 * no road prompts, nothing they had is reset. Her door still offers the one choice they never had.
 */
export function migratedTutorial(): TutorialState {
  return { step: 'door', opened: true, used: { move: true, look: true, sprint: true }, walked: 0, choice: null, ...newLaterSteps() };
}
