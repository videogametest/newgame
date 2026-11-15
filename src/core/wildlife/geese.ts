import type { Vec2 } from '../types';
import type { Stimulus, Observation } from '../stealth';
import { distance2 } from '../vec';
import { WILDLIFE_TUNING as t, type WildlifeTuning } from './tuning';

/** Running near the Mill's geese sets them honking, which alerts the Mill. Creeping past does not (section 4). */
export function geeseHonk(
  geese: { position: Vec2 }, hero: { position: Vec2; movement: Observation['movement'] }, tuning: WildlifeTuning = t,
): Stimulus | null {
  if (hero.movement !== 'sprinting') return null;
  const near = distance2(hero.position.x, hero.position.z, geese.position.x, geese.position.z) <= tuning.geeseHonkRadius;
  return near ? { kind: 'geese', position: { ...geese.position } } : null;
}
