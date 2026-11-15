// Where the wildlife sits in the valley (GAME_DESIGN.md section 4, "Wildlife"). Positions are ground-plane metres
// (x, z) like the rest of src/core. The rules that act on these live in src/core/wildlife; the drawing lives in
// src/render/valley_wildlife.ts. Placed by hand and checked by src/data/wildlife.test.ts against the walkable ground.
import type { Vec2 } from '../core/types';
import { VALLEY_PLACES } from '../core/world/valley_layout';

/** The Mill's place (VALLEY_PLACES.mill). Crows circle above it while it is held. */
export const MILL_CENTRE: Vec2 = { x: VALLEY_PLACES.mill.x, z: VALLEY_PLACES.mill.z };
export const CROW_PLACES = ['mill', 'forge', 'watch_house'] as const;
export const CROW_CENTRES = CROW_PLACES.map(id => ({ id, ...VALLEY_PLACES[id === 'watch_house' ? 'watchHouse' : id] }));

/** The goose pen inside the Mill's fence: the fence runs x -161..-155, z 54..60 (src/landmarks/plan.ts mill()). */
export const GEESE_PEN: Vec2 = { x: -158, z: 57 };
export const GEESE_COUNT = 4;

/** Songbird flocks on open meadow. Each lifts once when sprinted through. */
export const FLOCKS: readonly { id: string; position: Vec2 }[] = [
  { id: 'meadow_east', position: { x: 120, z: 60 } },
  { id: 'meadow_south', position: { x: 60, z: -40 } },
];

/** The Fairlow family's stones (the family_markers secret in VALLEY_STOPS). The fox belongs to it. */
export const FOX_SECRET: Vec2 = { x: 150, z: 158 };
/** Where the fox first shows itself, a few metres from the secret. */
export const FOX_START: Vec2 = { x: 140, z: 166 };
