import type { Vec2 } from '../types';
import { angleDelta, clamp, distance2, yawOf } from '../vec';
import { STEALTH_TUNING, type StealthTuning } from './tuning';

/** Exact names in GAME_DESIGN §5: "alert", not "alerted". */
export type Awareness = 'unaware' | 'suspicious' | 'alert';
export interface AwarenessState {
  awareness: Awareness;
  notice: number;
  lastKnownPosition?: Vec2;
  /** Seconds since the hero was last seen or heard. Drives searching and giving up. */
  unseenSeconds?: number;
  /** Things found are never forgotten: a body, a comrade down, a missing guard. This enemy stays at least suspicious. */
  foundSomething?: boolean;
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
  | { kind: 'noise'; position: Vec2; /** How far it carries, set by what made it. Walls do not block sound. */ radius?: number }
  | { kind: 'nearby_alert' | 'body_found' | 'comrade_found' | 'geese'; position: Vec2 };

/** Whether a stimulus reaches this observer. A noise carries only as far as its radius. */
export function reaches(stimulus: Stimulus, observer: Vec2): boolean {
  if (stimulus.kind !== 'noise' || stimulus.radius === undefined) return true;
  return distance2(observer.x, observer.z, stimulus.position.x, stimulus.position.z) <= stimulus.radius;
}

/**
 * Section 5, "Losing the hero". Seen: notice builds. Unseen: notice drains; an alert enemy searches the last place
 * the hero was seen, then drops to suspicious; a suspicious enemy who finds nothing returns to routine.
 * `searchFactor` shortens both waits (Grass Ghost at its third rank passes 0.5 for a hero lost in tall grass).
 */
export function advanceAwareness(
  state: AwarenessState, observation: Observation, seconds: number,
  stimuli: readonly Stimulus[] = [], t = STEALTH_TUNING, searchFactor = 1,
): AwarenessState {
  const dt = Math.max(0, seconds);
  const rate = noticingRate(observation, t);
  const heard = stimuli.filter(s => reaches(s, observation.observer));
  const sensed = (rate > 0 && dt > 0) || heard.length > 0;
  let notice = state.notice;
  let awareness = state.awareness;
  let lastKnownPosition = state.lastKnownPosition;
  let foundSomething = state.foundSomething ?? false;
  let unseenSeconds = sensed ? 0 : (state.unseenSeconds ?? 0) + dt;

  if (rate > 0 && dt > 0) {
    notice = clamp(notice + rate * dt, 0, t.alertAt);
    lastKnownPosition = { ...observation.target };
  } else if (heard.length === 0) {
    notice = clamp(notice - t.noticeDecayPerSecond * dt, 0, t.alertAt);
  }
  for (const stimulus of heard) {
    lastKnownPosition = { ...stimulus.position };
    if (stimulus.kind === 'noise') {
      notice = Math.max(notice, t.suspiciousAt);
      if (awareness === 'unaware') awareness = 'suspicious';
    } else {
      awareness = 'alert';
      notice = t.alertAt;
      if (stimulus.kind === 'body_found' || stimulus.kind === 'comrade_found') foundSomething = true;
    }
  }
  if (notice >= t.alertAt) awareness = 'alert';
  else if (notice >= t.suspiciousAt && awareness === 'unaware') awareness = 'suspicious';

  if (!sensed) {
    const factor = Math.max(0, searchFactor);
    if (awareness === 'alert' && unseenSeconds >= t.searchSeconds * factor) {
      awareness = 'suspicious';
      notice = Math.min(notice, t.suspiciousAt);
      unseenSeconds = 0;
    } else if (awareness === 'suspicious' && unseenSeconds >= t.suspiciousSeconds * factor && !foundSomething) {
      awareness = 'unaware';
      notice = 0;
      unseenSeconds = 0;
      lastKnownPosition = undefined;
    }
  }
  return {
    awareness, notice, unseenSeconds,
    ...(foundSomething ? { foundSomething } : {}),
    ...(lastKnownPosition ? { lastKnownPosition: { ...lastKnownPosition } } : {}),
  };
}

/** True while an alert enemy has lost the hero and is searching where the hero was last seen. */
export function isSearching(state: AwarenessState): boolean {
  return state.awareness === 'alert' && (state.unseenSeconds ?? 0) > 0 && state.lastKnownPosition !== undefined;
}

export function reaction(awareness: Awareness, beyondHomeLeash: boolean): 'routine' | 'investigate' | 'attack_and_alert_nearby' | 'return_home' {
  if (awareness === 'alert') return beyondHomeLeash ? 'return_home' : 'attack_and_alert_nearby';
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
