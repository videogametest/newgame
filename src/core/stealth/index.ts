import type { Vec2 } from '../types';
import { angleDelta, clamp, distance2, yawOf } from '../vec';
import { STEALTH_TUNING, type StealthTuning } from './tuning';

/** Exact names in GAME_DESIGN §5: "alert", not "alerted". */
export type Awareness = 'unaware' | 'suspicious' | 'alert';
export interface AwarenessState {
  awareness: Awareness;
  notice: number;
  lastKnownPosition?: Vec2;
}
export interface Observation {
  observer: Vec2;
  yaw: number;
  target: Vec2;
  lineOfSight: boolean;
  movement: keyof StealthTuning['movement'];
  tallGrass: boolean;
  night: boolean;
  /** Fire/lantern/torch illumination removes the night advantage. */
  illuminated: boolean;
}

/** Sight only; hearing is an explicit stimulus, not a ray through scenery. */
export function noticingRate(o: Observation, t = STEALTH_TUNING): number {
  const d = distance2(o.observer.x, o.observer.z, o.target.x, o.target.z);
  if (!o.lineOfSight || d >= t.range) return 0;
  if (d > 0 && Math.abs(angleDelta(o.yaw, yawOf(o.target.x - o.observer.x, o.target.z - o.observer.z))) > t.halfFieldOfView) return 0;
  return t.noticePerSecond * (1 - d / t.range) * t.movement[o.movement]
    * (o.tallGrass ? t.grass : 1) * (o.night && !o.illuminated ? t.night : 1);
}

export type Stimulus =
  | { kind: 'noise'; position: Vec2 }
  | { kind: 'nearby-alert' | 'body-found' | 'comrade-found' | 'geese'; position: Vec2 };

/** §5. No automatic decay/reset: search completion rules are not specified.
 * Home leash is a reaction intent below, not an invented awareness reset. */
export function advanceAwareness(
  state: AwarenessState, observation: Observation, seconds: number,
  stimuli: readonly Stimulus[] = [], t = STEALTH_TUNING,
): AwarenessState {
  let notice = clamp(state.notice + noticingRate(observation, t) * Math.max(0, seconds), 0, t.alertAt);
  let awareness = state.awareness;
  let lastKnownPosition = state.lastKnownPosition;
  if (noticingRate(observation, t) > 0 && seconds > 0) lastKnownPosition = { ...observation.target };
  for (const stimulus of stimuli) {
    lastKnownPosition = { ...stimulus.position };
    if (stimulus.kind === 'noise') {
      notice = Math.max(notice, t.suspiciousAt);
      if (awareness === 'unaware') awareness = 'suspicious';
    } else {
      awareness = 'alert';
      notice = t.alertAt;
    }
  }
  if (notice >= t.alertAt) awareness = 'alert';
  else if (notice >= t.suspiciousAt && awareness === 'unaware') awareness = 'suspicious';
  return { awareness, notice, ...(lastKnownPosition ? { lastKnownPosition: { ...lastKnownPosition } } : {}) };
}

export function reaction(awareness: Awareness, beyondHomeLeash: boolean): 'routine' | 'investigate' | 'attack-and-alert-nearby' | 'return-home' {
  if (awareness === 'alert') return beyondHomeLeash ? 'return-home' : 'attack-and-alert-nearby';
  return awareness === 'suspicious' ? 'investigate' : 'routine';
}

export interface MarkState {
  focusId: string | null;
  heldSeconds: number;
  /** Remaining duration by enemy id; outlines do not need line of sight. */
  remaining: Record<string, number>;
}
/** Caller supplies a visible enemy id only while bow zoom is held on it.
 * XP is not awarded here; callers can consume newlyMarked exactly once. */
export function advanceMarks(
  state: MarkState, focusedEnemyId: string | null, seconds: number, t = STEALTH_TUNING,
): { state: MarkState; newlyMarked: string[] } {
  const dt = Math.max(0, seconds);
  const remaining: Record<string, number> = {};
  for (const [id, duration] of Object.entries(state.remaining)) {
    if (duration > dt) remaining[id] = duration - dt;
  }
  const heldSeconds = focusedEnemyId === null ? 0
    : (focusedEnemyId === state.focusId ? state.heldSeconds : 0) + dt;
  const newlyMarked: string[] = [];
  if (focusedEnemyId !== null && heldSeconds >= t.markHoldSeconds) {
    if (!(focusedEnemyId in state.remaining)) newlyMarked.push(focusedEnemyId);
    remaining[focusedEnemyId] = t.markDurationSeconds;
  }
  return { state: { focusId: focusedEnemyId, heldSeconds, remaining }, newlyMarked };
}
