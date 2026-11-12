// Pure mapping from simulation events to sound ids. No Babylon, no Web Audio: the render layer plays the ids.

import type { BattleEvent } from './types';

export type SoundId =
  | 'sword_swing'
  | 'sword_hit'
  | 'bow_draw'
  | 'bow_release'
  | 'arrow_impact'
  | 'footstep'
  | 'dodge'
  | 'hurt'
  | 'death'
  | 'victory'
  | 'defeat';

/** Sounds triggered by one simulation event. Empty when the event is silent. */
export function soundsForEvent(e: BattleEvent, heroId: number): SoundId[] {
  switch (e.type) {
    case 'swing':
      return ['sword_swing'];
    case 'draw':
      return ['bow_draw'];
    case 'fire':
      return ['bow_release'];
    case 'impact':
      return ['arrow_impact'];
    case 'dodge':
      return ['dodge'];
    case 'death':
      return ['death'];
    case 'damage':
      // The hero's pain is its own sound. An arrow landing on an enemy is already covered by its impact sound.
      if (e.fighterId === heroId) return ['hurt'];
      return e.source === 'arrow' ? [] : ['sword_hit'];
    case 'outcome':
      if (e.status === 'victory') return ['victory'];
      if (e.status === 'defeat') return ['defeat'];
      return [];
    case 'strike':
      // Landing hits are heard through their damage events; a strike that hits nothing stays silent.
      return [];
    default:
      return [];
  }
}

/**
 * Footstep timing: distance walked on the ground since the last step. Returns the new distance and whether a
 * footstep is due. Standing still resets the count so the first step after starting to walk lands on time.
 */
export function advanceFootsteps(
  distance: number,
  speed: number,
  dt: number,
  stride: number,
): { distance: number; due: boolean } {
  if (speed < 0.5) return { distance: 0, due: false };
  const d = distance + speed * dt;
  if (d >= stride) return { distance: d - stride, due: true };
  return { distance: d, due: false };
}
