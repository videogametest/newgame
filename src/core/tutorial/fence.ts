// The first evening, step 4: the fence (task 010; queue item 27). Pure: no engine, DOM or storage.
// The hero crosses the yard to the scarecrow while Hesper keeps watch with her back half turned. Being seen or heard
// is decided by the stealth core's own rules (advanceAwareness with her as the observer, a noise stimulus for steps
// that are not crouched); being seen earns one line and a new start. At the scarecrow she asks for a mark, which is
// the stealth core's marking rule (advanceMarks) with the scarecrow as the one thing that can be focused.
import { advanceAwareness, advanceMarks, type AwarenessState, type Observation, type Stimulus } from '../stealth';
import { STEALTH_TUNING } from '../stealth/tuning';
import type { Vec2 } from '../types';

export type FencePhase = 'intro' | 'cross' | 'mark' | 'done';
export interface FenceState {
  phase: FencePhase;
  /** Times she has seen or heard the hero; picks the next of her "seen" lines in turn. */
  seen: number;
  /** After being seen the crossing starts again: the hero must first get back to the starting distance. */
  restart: boolean;
  /** Her notice of the hero (the stealth core's number), and seconds she has kept watch, for her glances. */
  notice: number;
  clock: number;
  /** Seconds the aim has been held on the scarecrow (the marking rule's own count). */
  markHeld: number;
}
export interface FenceRules {
  /** The crossing is the last this-many metres to the scarecrow; a new start is from outside them. */
  startDistance: number;
  /** Close enough to the scarecrow to have crossed, metres. */
  reach: number;
  /** How far a step that is not crouched carries to her, metres. */
  hearing: number;
  /** She looks the other way for `away` seconds, then over her shoulder for `glance` seconds. */
  away: number;
  glance: number;
}
/** What the hero did this step, from the actual hero and input. */
export interface FenceFrame {
  dt: number;
  hero: Vec2;
  movement: Observation['movement'];
  /** Where she stands, the way she faces while looking away, and the way she glances. */
  hesper: Vec2;
  awayYaw: number;
  glanceYaw: number;
  scarecrow: Vec2;
  /** The bow is out, the look-closer (aim) input is held, and the aim is on the scarecrow. */
  aimOnScarecrow: boolean;
}
export type FenceEvent = { type: 'fenceOpened' } | { type: 'fenceStep'; frame: FenceFrame };

export const SCARECROW_ID = 'scarecrow';
export function newFence(): FenceState { return { phase: 'intro', seen: 0, restart: false, notice: 0, clock: 0, markHeld: 0 }; }

/** Is she glancing over her shoulder at this point of her watch? */
export function glancing(clock: number, r: FenceRules): boolean {
  const period = r.away + r.glance;
  return period > 0 && clock % period >= r.away;
}
export function watchYaw(s: FenceState, f: Pick<FenceFrame, 'awayYaw' | 'glanceYaw'>, r: FenceRules): number {
  return glancing(s.clock, r) ? f.glanceYaw : f.awayYaw;
}

export function advanceFence(s: FenceState, e: FenceEvent, r: FenceRules): FenceState {
  if (e.type === 'fenceOpened') return s.phase === 'intro' ? { ...s, phase: 'cross' } : s;
  const f = e.frame;
  if (!(f.dt > 0)) return s;
  const d = Math.hypot(f.hero.x - f.scarecrow.x, f.hero.z - f.scarecrow.z);
  if (s.phase === 'cross') {
    const clock = s.clock + f.dt;
    // The crossing is the last `startDistance` metres to the scarecrow: outside them she is not testing anyone.
    if (d >= r.startDistance) return s.restart || s.notice ? { ...s, clock, restart: false, notice: 0 } : { ...s, clock };
    // Seen: nothing counts until the hero has gone back out to the start, and she forgets what she noticed.
    if (s.restart) return { ...s, clock };
    const awareness: AwarenessState = { awareness: 'unaware', notice: s.notice };
    const observation: Observation = {
      observer: f.hesper, yaw: watchYaw(s, f, r), target: f.hero, lineOfSight: true, movement: f.movement,
      tallGrass: false, night: false, illuminated: true,
    };
    const loud = f.movement === 'walking' || f.movement === 'sprinting';
    const stimuli: Stimulus[] = loud ? [{ kind: 'noise', position: f.hero, radius: r.hearing }] : [];
    const next = advanceAwareness(awareness, observation, f.dt, stimuli);
    if (next.awareness !== 'unaware') return { ...s, clock, seen: s.seen + 1, restart: true, notice: 0 };
    if (d <= r.reach) return { ...s, clock, phase: 'mark', notice: 0 };
    return { ...s, clock, notice: next.notice };
  }
  if (s.phase === 'mark') {
    const marks = advanceMarks({ focusId: s.markHeld > 0 ? SCARECROW_ID : null, heldSeconds: s.markHeld, remaining: {} },
      f.aimOnScarecrow ? SCARECROW_ID : null, f.dt);
    if (marks.newlyMarked.includes(SCARECROW_ID)) return { ...s, phase: 'done', markHeld: 0 };
    const held = marks.state.heldSeconds;
    return held === s.markHeld ? s : { ...s, markHeld: held };
  }
  return s;
}

/** Her words for a change: the asks when the crossing starts and at the scarecrow, a seen line, the done line. */
export function fenceSays(before: FenceState, after: FenceState, seenLines: number): { group: string; index: number }[] {
  if (after.seen > before.seen) return [{ group: 'evening.fence.seen', index: (after.seen - 1) % Math.max(1, seenLines) }];
  if (before.phase === after.phase) return [];
  if (after.phase === 'cross') return [{ group: 'evening.fence', index: 0 }, { group: 'evening.fence', index: 1 }];
  if (after.phase === 'mark') return [{ group: 'evening.fence.mark', index: 0 }];
  if (after.phase === 'done') return [{ group: 'evening.fence.done', index: 0 }];
  return [];
}

/** Which prompt shows: crouch while crossing; at the scarecrow, the bow, then look closer and keep it there. */
export function fencePrompt(s: FenceState, bowOut: boolean, crouched: boolean): 'crouch' | 'bow' | 'mark' | null {
  if (s.phase === 'cross') return crouched ? null : 'crouch';
  if (s.phase === 'mark') return bowOut ? 'mark' : 'bow';
  return null;
}

/** The hold the marking rule needs, for a reader of the state. */
export const MARK_HOLD_SECONDS = STEALTH_TUNING.markHoldSeconds;
