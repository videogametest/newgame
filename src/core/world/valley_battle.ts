// The ground under a valley fight: the same walking surface and solids the hero uses.
// Pure: no Babylon imports.
import type { BattleGround } from '../types/battle';
import { walkSurfaceAt, valleySolids } from './valley';

/** Fighters farther than this from the hero stay frozen (the 25 m simRadius from the design). */
export const VALLEY_SIM_RADIUS = 25;

export function valleyBattleGround(): BattleGround {
  return { heightAt: walkSurfaceAt, simRadius: VALLEY_SIM_RADIUS, solids: valleySolids() };
}
