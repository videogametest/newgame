// A day at a held place (task 004 item 11, GAME_DESIGN.md section 5). Where each bandit is by day and by night,
// the patrol routes, and the guard-change times. Every number and spot name here is an AUTHORED PLACEHOLDER
// chosen by the builder, not from docs/writing/bandits.md (which has no schedule table). Change them as data.
// Spot names are read by the world; a spot must exist in its place's `spots` list.
import type { PlaceId } from './bandits';

export interface PatrolStop {
  spot: string;
  /** How long the patrol stays at this stop, in seconds. */
  seconds: number;
}
export interface PatrolRoute {
  id: string;
  stops: readonly PatrolStop[];
}
export interface PlaceDay {
  placeId: PlaceId;
  /** Every named spot a bandit can stand at in this place. */
  spots: readonly string[];
  /** Where workers eat (midday and dusk) and where habits gather. */
  fire: string;
  /** Where sleepers lie down. */
  bed: string;
  routes: readonly PatrolRoute[];
}

/** By day: work at a spot, stand a post, or walk a patrol route (starting `phase` seconds into the cycle). */
export type DayRole =
  | { kind: 'work'; spot: string }
  | { kind: 'post'; spot: string }
  | { kind: 'patrol'; route: string; phase: number };
/** By night: lie down, or keep watch with a torch. */
export type NightRole = { kind: 'sleep' } | { kind: 'watch'; spot: string };
export interface Assignment {
  day: DayRole;
  night: NightRole;
}

/** Fixed guard changes (§5). Posts and night watches leave their spot empty for `gapSeconds`. */
export const GUARD_CHANGES = {
  hours: [18, 0],
  gapSeconds: 8,
  /** A guard-change habit (Harl Gadd walks the yard) lasts this long after each change. */
  habitSeconds: 120,
} as const;

export const PLACE_DAYS: Readonly<Record<PlaceId, PlaceDay>> = {
  mill: {
    placeId: 'mill',
    spots: ['yard', 'mill_gate', 'wheel', 'mill_pond', 'geese', 'woodpile', 'fire', 'mill_door', 'loft_window', 'bed'],
    fire: 'fire',
    bed: 'bed',
    routes: [
      { id: 'yard_round', stops: [{ spot: 'yard', seconds: 600 }, { spot: 'mill_gate', seconds: 600 }, { spot: 'wheel', seconds: 600 }] },
      { id: 'pond_round', stops: [{ spot: 'mill_pond', seconds: 600 }, { spot: 'geese', seconds: 600 }, { spot: 'mill_gate', seconds: 600 }] },
    ],
  },
  forge: {
    placeId: 'forge',
    spots: ['forge_yard', 'circuit', 'store_door', 'anvil', 'forge_fire', 'roof', 'east_fence', 'rabbit_run', 'fire', 'bed'],
    fire: 'fire',
    bed: 'bed',
    routes: [
      { id: 'circuit', stops: [{ spot: 'forge_yard', seconds: 600 }, { spot: 'circuit', seconds: 900 }, { spot: 'store_door', seconds: 300 }] },
    ],
  },
  watch_house: {
    placeId: 'watch_house',
    spots: ['gate', 'wall_walk', 'back_gate', 'supper_table', 'beside_stane', 'stable', 'fire', 'bed'],
    fire: 'fire',
    bed: 'bed',
    // No patrol route: the Watch-house is held by posts and a night watch.
    routes: [],
  },
};

/** One entry per bandit in src/data/bandits.ts (Stane has no roster row, so none here). */
export const ASSIGNMENTS: Readonly<Record<string, Assignment>> = {
  // The Mill, first garrison
  harl_gadd: { day: { kind: 'patrol', route: 'yard_round', phase: 0 }, night: { kind: 'watch', spot: 'yard' } },
  dob_finch: { day: { kind: 'work', spot: 'geese' }, night: { kind: 'sleep' } },
  wyll_carrow: { day: { kind: 'patrol', route: 'pond_round', phase: 0 }, night: { kind: 'sleep' } },
  bran_oakes: { day: { kind: 'work', spot: 'wheel' }, night: { kind: 'watch', spot: 'woodpile' } },
  nessa_roke: { day: { kind: 'post', spot: 'mill_gate' }, night: { kind: 'watch', spot: 'mill_gate' } },
  pim: { day: { kind: 'work', spot: 'yard' }, night: { kind: 'sleep' } },
  odo_varn: { day: { kind: 'work', spot: 'wheel' }, night: { kind: 'sleep' } },
  // The Mill, retaken garrison
  maud_kerr: { day: { kind: 'work', spot: 'yard' }, night: { kind: 'sleep' } },
  brock_tull: { day: { kind: 'post', spot: 'mill_door' }, night: { kind: 'watch', spot: 'mill_door' } },
  annis_pell: { day: { kind: 'post', spot: 'loft_window' }, night: { kind: 'watch', spot: 'loft_window' } },
  col_ware: { day: { kind: 'work', spot: 'wheel' }, night: { kind: 'sleep' } },
  sim_hart: { day: { kind: 'work', spot: 'yard' }, night: { kind: 'sleep' } },
  jude_barrow: { day: { kind: 'work', spot: 'wheel' }, night: { kind: 'sleep' } },
  // The Forge
  rafe_dunmore: { day: { kind: 'work', spot: 'anvil' }, night: { kind: 'sleep' } },
  tobin_pike: { day: { kind: 'work', spot: 'forge_yard' }, night: { kind: 'sleep' } },
  peg_rudge: { day: { kind: 'work', spot: 'forge_fire' }, night: { kind: 'sleep' } },
  hob_tarn: { day: { kind: 'work', spot: 'store_door' }, night: { kind: 'sleep' } },
  sib_marlowe: { day: { kind: 'patrol', route: 'circuit', phase: 0 }, night: { kind: 'watch', spot: 'circuit' } },
  jory_flint: { day: { kind: 'work', spot: 'forge_yard' }, night: { kind: 'sleep' } },
  alda_grice: { day: { kind: 'post', spot: 'roof' }, night: { kind: 'watch', spot: 'roof' } },
  ketch: { day: { kind: 'work', spot: 'forge_yard' }, night: { kind: 'sleep' } },
  // The Watch-house
  corwin_vale: { day: { kind: 'post', spot: 'gate' }, night: { kind: 'watch', spot: 'gate' } },
  marek_stroud: { day: { kind: 'post', spot: 'beside_stane' }, night: { kind: 'sleep' } },
  ilsa_thorn: { day: { kind: 'post', spot: 'wall_walk' }, night: { kind: 'watch', spot: 'wall_walk' } },
  gant: { day: { kind: 'work', spot: 'stable' }, night: { kind: 'sleep' } },
  dunstan_lowe: { day: { kind: 'work', spot: 'supper_table' }, night: { kind: 'sleep' } },
  tom_sable: { day: { kind: 'work', spot: 'stable' }, night: { kind: 'watch', spot: 'back_gate' } },
  rikke: { day: { kind: 'work', spot: 'stable' }, night: { kind: 'sleep' } },
  hew_pollard: { day: { kind: 'work', spot: 'stable' }, night: { kind: 'sleep' } },
};
