// Showcase mode: maps a named clip (?showcase=<name>) to a pose that is scrubbed to a normalized time t.
// Pure data and functions: no Babylon imports, so the mapping is unit tested.

import type { WeaponId } from '../core/types';
import type { UnitDef } from '../data/units';
import { scrub, type Pose } from './clips';

export interface ShowcaseClip {
  /** Key into the unit data. The showcase spawns this unit. */
  unitId: string;
  /** Weapon shown on the unit (the hero shows only the equipped one). */
  weapon: WeaponId;
  /** Clip for normalized time t in 0..1 (0 = start of the action, 1 = end). */
  pose: (clips: UnitDef['clips'], t: number) => Pose;
  /** 'front' faces the character; 'side' shows its profile (for motion along the facing axis, and for aim). */
  camera?: 'front' | 'side';
}

function need<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(`Showcase needs a ${what} clip on this unit`);
  return v;
}

export const SHOWCASE_CLIPS: Record<string, ShowcaseClip> = {
  sword_swing: { unitId: 'hero', weapon: 'sword', pose: (c, t) => scrub(c.attack, t) },
  bow_draw: { unitId: 'hero', weapon: 'bow', camera: 'side', pose: (c, t) => scrub(need(c.draw, 'draw'), t) },
  bow_release: { unitId: 'hero', weapon: 'bow', camera: 'side', pose: (c, t) => scrub(need(c.release, 'release'), t) },
  archer_draw: { unitId: 'enemy_archer', weapon: 'bow', camera: 'side', pose: (c, t) => scrub(need(c.draw, 'draw'), t) },
  archer_release: { unitId: 'enemy_archer', weapon: 'bow', camera: 'side', pose: (c, t) => scrub(need(c.release, 'release'), t) },
  soldier_windup: { unitId: 'enemy_soldier', weapon: 'sword', pose: (c, t) => scrub(need(c.windup, 'windup'), t, c.windupRange) },
  soldier_strike: { unitId: 'enemy_soldier', weapon: 'sword', pose: (c, t) => scrub(c.attack, t, c.attackRange) },
  hit: { unitId: 'hero', weapon: 'sword', pose: (c, t) => scrub(c.hit, t) },
  death: { unitId: 'hero', weapon: 'sword', pose: (c, t) => scrub(c.death, t) },
  dodge: { unitId: 'hero', weapon: 'sword', camera: 'side', pose: (c, t) => scrub(need(c.dodge, 'dodge').forward, t) },
};

export const SHOWCASE_NAMES = Object.keys(SHOWCASE_CLIPS);

/** Returns the clip name if it is known, otherwise throws with the list of valid names. */
export function resolveShowcaseClip(name: string | null): string {
  if (name && Object.prototype.hasOwnProperty.call(SHOWCASE_CLIPS, name)) return name;
  throw new Error(`Unknown showcase clip "${name ?? ''}". Use one of: ${SHOWCASE_NAMES.join(', ')}`);
}

/** Parses t from a query value. Missing or invalid values mean 0. Clamped to 0..1. */
export function parseShowcaseTime(raw: string | null): number {
  const v = raw === null ? 0 : Number(raw);
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}
