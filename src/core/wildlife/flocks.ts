import type { Vec2 } from '../types';
import type { Stimulus, Observation } from '../stealth';
import { distance2 } from '../vec';
import { WILDLIFE_TUNING as t, type WildlifeTuning } from './tuning';

export interface Flock {
  id: string;
  position: Vec2;
  startled: boolean;
}

/** Sprinting through a flock sends it into the air. Crouching or walking past does not (section 4). */
export function startleFlock(
  flock: Flock, hero: { position: Vec2; movement: Observation['movement'] }, tuning: WildlifeTuning = t,
): { flock: Flock; stimulus: Stimulus | null } {
  if (flock.startled) return { flock: { ...flock }, stimulus: null };
  const near = distance2(hero.position.x, hero.position.z, flock.position.x, flock.position.z) <= tuning.flockStartleRadius;
  if (!near || hero.movement !== 'sprinting') return { flock: { ...flock }, stimulus: null };
  return {
    flock: { ...flock, startled: true },
    // Nearby enemies hear the birds; reaches() decides who is close enough.
    stimulus: { kind: 'noise', position: { ...flock.position }, radius: tuning.flockNoiseRadius },
  };
}
