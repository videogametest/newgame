// Unit content. Stats come from TUNING; this file says what each unit is.
import { TUNING } from '../config/tuning';
import type { ArcherStats, BodyStats, MeleeStats, UnitKind } from '../core/types';

interface UnitDefBase {
  id: string;
  name: string;
  kind: UnitKind;
}

export type UnitDef =
  | (UnitDefBase & { kind: 'hero'; stats: BodyStats })
  | (UnitDefBase & { kind: 'melee'; stats: MeleeStats })
  | (UnitDefBase & { kind: 'archer'; stats: ArcherStats });

export const UNIT_DEFS: Record<string, UnitDef> = {
  hero: { id: 'hero', name: 'Hero', kind: 'hero', stats: TUNING.units.hero },
  soldier: { id: 'soldier', name: 'Melee Soldier', kind: 'melee', stats: TUNING.units.soldier },
  archer: { id: 'archer', name: 'Archer', kind: 'archer', stats: TUNING.units.archer },
};
