// The first evening (task 010; queue item 25 builds steps 1 and 2 only). Pure: no engine, DOM or storage.
// Queue item 26 adds step 3 (the yard, src/core/tutorial/yard.ts). Steps 4 to 6 are named, pending destinations (item 27).
import { advanceYard, newYard, type YardEvent, type YardState } from './yard';
export type EveningStep = 'road' | 'door' | 'yard' | 'fence' | 'lantern';
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
}
export type TutorialEvent =
  | { type: 'opened' }
  | { type: 'walked'; seconds: number }
  | { type: 'looked' }
  | { type: 'sprinted' }
  | { type: 'reachedDoor' }
  | { type: 'chose'; choice: EveningChoice }
  | YardEvent;

/** Design step numbers ("The first evening": 1 road, 2 door, 3 yard, 6 lantern). */
export const STEP_NUMBER: Record<EveningStep, number> = { road: 1, door: 2, yard: 3, fence: 4, lantern: 6 };
/** Destinations reached by the choice whose lessons are not built yet. */
export const PENDING: Partial<Record<EveningStep, string>> = {
  fence: 'steps 4 and 5 (the fence, the post) are queue item 27; not built',
  lantern: 'step 6 (the lantern) is queue item 27; not built',
};
export const CHOICE_IDS: Record<EveningChoice, string> = { show: 'evening.choice.0', skip: 'evening.choice.1' };

export function newTutorial(): TutorialState {
  return { step: 'road', opened: false, used: { move: false, look: false, sprint: false }, walked: 0, choice: null, yard: newYard() };
}

export function advance(s: TutorialState, e: TutorialEvent): TutorialState {
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
    default: {
      // The yard's own events count only while the lesson is in the yard.
      if (s.step !== 'yard') return s;
      const yard = advanceYard(s.yard, e);
      if (yard === s.yard) return s;
      return { ...s, yard, step: yard.phase === 'done' ? 'fence' : 'yard' };
    }
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
  return { step: 'door', opened: true, used: { move: true, look: true, sprint: true }, walked: 0, choice: null, yard: newYard() };
}
