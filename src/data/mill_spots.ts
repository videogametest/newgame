// The Mill's named spots in world metres (task 015, GAME_DESIGN.md section 5). Authored placeholders chosen by the builder:
// each is checked by src/core/places/defenders.test.ts to stand on walkable, unblocked ground.
// They sit in the Mill site (src/landmarks/plan.ts, origin at the mill marker + 10 m south, bearing 0),
// clear of the watermill, the grain store, the tents, the campfire and the goose pen.
import type { Vec2 } from '../core/types';

export const MILL_SPOTS: Readonly<Record<string, Vec2>> = {
  yard: { x: -178, z: 74 },
  mill_gate: { x: -168, z: 70 },
  wheel: { x: -186, z: 47 },
  mill_pond: { x: -190, z: 40 },
  geese: { x: -164, z: 62 },
  woodpile: { x: -183, z: 67 },
  fire: { x: -152, z: 64 },
  mill_door: { x: -180, z: 60 },
  loft_window: { x: -182, z: 62 },
  bed: { x: -148, z: 76 },
};
