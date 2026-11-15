import type { Vec2 } from '../types';
import type { Observation } from '../stealth';
import { distance2 } from '../vec';
import { WILDLIFE_TUNING as t, type WildlifeTuning } from './tuning';

/** idle: shown near a secret, waiting. leading: walking toward the secret while followed quietly.
 * gone: the hero ran at it. Gone is final until the hero leaves the secret's area (section 4). */
export type FoxMode = 'idle' | 'leading' | 'gone';
export interface FoxState {
  mode: FoxMode;
  position: Vec2;
}

export interface FoxInput {
  hero: { position: Vec2; movement: Observation['movement'] };
  /** The nearest secret the fox belongs to. */
  secret: Vec2;
}

/** Pure step of the fox. `seconds` is the frame time; the fox never moves faster than foxLeadSpeed. */
export function advanceFox(state: FoxState, input: FoxInput, seconds: number, tuning: WildlifeTuning = t): FoxState {
  const dt = Math.max(0, seconds);
  const { hero, secret } = input;
  const heroToSecret = distance2(hero.position.x, hero.position.z, secret.x, secret.z);
  const heroToFox = distance2(hero.position.x, hero.position.z, state.position.x, state.position.z);
  const sprinting = hero.movement === 'sprinting';

  if (state.mode === 'gone') {
    // Final for this visit: it returns only after the hero has left the area entirely.
    return heroToSecret > tuning.foxAppearRadius * 2 ? { mode: 'idle', position: { ...state.position } } : { ...state };
  }
  if (sprinting && heroToFox <= tuning.foxSenseRadius) return { mode: 'gone', position: { ...state.position } };
  if (state.mode === 'leading' && !sprinting && heroToFox <= tuning.foxFollowRadius) {
    return { mode: 'leading', position: stepToward(state.position, secret, tuning.foxLeadSpeed * dt) };
  }
  if (state.mode === 'leading') {
    // The hero stopped following closely enough: the fox waits where it is.
    return { mode: 'idle', position: { ...state.position } };
  }
  // Idle: a quiet hero within reach of the fox starts it leading.
  if (!sprinting && heroToFox <= tuning.foxFollowRadius && heroToSecret <= tuning.foxAppearRadius) {
    return { mode: 'leading', position: stepToward(state.position, secret, tuning.foxLeadSpeed * dt) };
  }
  return { ...state, position: { ...state.position } };
}

function stepToward(from: Vec2, to: Vec2, maxStep: number): Vec2 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const d = Math.hypot(dx, dz);
  if (d <= maxStep || d === 0) return { x: to.x, z: to.z };
  return { x: from.x + (dx / d) * maxStep, z: from.z + (dz / d) * maxStep };
}
