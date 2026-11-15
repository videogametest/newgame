// Item 16. Outside party and entry positions are authored placeholders, not named neighbours.
// The bell position is read from the actual landmark geometry, never a duplicate coordinate.
import { landmarkPieces } from '../landmarks/plan';
import type { Spawn } from '../core/types';
const bell = landmarkPieces().find(p => p.site === 'mill' && p.kind === 'drum' && p.stuff === 'iron' && p.lift === 2.3);
if (!bell) throw new Error('Mill bell missing from landmark plan');
export const MILL_BELL = { x: bell.x, z: bell.z };
/** Approach along the landward yard, inside the prepared Mill navigation grid. */
export const MILL_REINFORCEMENTS: readonly Spawn[] = [
  { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: -166, z: 82, yaw: Math.PI },
  { unitId: 'enemy_archer', kind: 'archer', team: 'enemy', x: -164, z: 82, yaw: Math.PI },
];
