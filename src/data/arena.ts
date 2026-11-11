// Arena definitions. Each map node loads one arena. The simulation reads the data; nothing here runs logic.

import type { ArenaDef } from '../core/types';

// Enemy waves: wave 0 starts on the field; each later wave arrives waveGap seconds after the previous one is cleared.
// Balance targets (checked by src/core/balance.test.ts): the skilled bot wins in 90-180 s with 30-70% HP left,
// and a sword-only bot that never dodges loses.
export const TRAINING_FIELD: ArenaDef = {
  id: 'training_field',
  name: 'Training Field',
  halfWidth: 14,
  halfDepth: 16,
  waveGap: 3,
  obstacles: [
    { x: -5, z: 2, radius: 1.1, height: 2.4 },
    { x: 5, z: -1, radius: 1.0, height: 2.4 },
    { x: 0, z: 5, radius: 0.8, height: 1.8 },
  ],
  spawns: [
    { unitId: 'hero', kind: 'hero', team: 'player', x: 0, z: -9, yaw: 0 },
    { unitId: 'ally_soldier', kind: 'soldier', team: 'player', x: -2.5, z: -8, yaw: 0 },
    { unitId: 'ally_soldier', kind: 'soldier', team: 'player', x: 2.5, z: -11, yaw: 0 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: -5, z: 9, yaw: Math.PI, wave: 0 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 5, z: 10, yaw: Math.PI, wave: 0 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: -5, z: 9, yaw: Math.PI, wave: 1 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 5, z: 10, yaw: Math.PI, wave: 1 },
    { unitId: 'enemy_archer', kind: 'archer', team: 'enemy', x: -4, z: 14, yaw: Math.PI, wave: 1 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: -5, z: 9, yaw: Math.PI, wave: 2 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 5, z: 10, yaw: Math.PI, wave: 2 },
    { unitId: 'enemy_archer', kind: 'archer', team: 'enemy', x: -4, z: 14, yaw: Math.PI, wave: 2 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: -5, z: 9, yaw: Math.PI, wave: 3 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 0, z: 10, yaw: Math.PI, wave: 3 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 5, z: 9, yaw: Math.PI, wave: 3 },
    { unitId: 'enemy_archer', kind: 'archer', team: 'enemy', x: -4, z: 14, yaw: Math.PI, wave: 3 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: -5, z: 9, yaw: Math.PI, wave: 4 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 5, z: 10, yaw: Math.PI, wave: 4 },
    { unitId: 'enemy_archer', kind: 'archer', team: 'enemy', x: -4, z: 14, yaw: Math.PI, wave: 4 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: -5, z: 9, yaw: Math.PI, wave: 5 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 0, z: 10, yaw: Math.PI, wave: 5 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 5, z: 9, yaw: Math.PI, wave: 5 },
    { unitId: 'enemy_archer', kind: 'archer', team: 'enemy', x: -4, z: 14, yaw: Math.PI, wave: 5 },
    { unitId: 'enemy_archer', kind: 'archer', team: 'enemy', x: 4, z: 14, yaw: Math.PI, wave: 5 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: -5, z: 9, yaw: Math.PI, wave: 6 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 0, z: 10, yaw: Math.PI, wave: 6 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 5, z: 9, yaw: Math.PI, wave: 6 },
    { unitId: 'enemy_archer', kind: 'archer', team: 'enemy', x: -4, z: 14, yaw: Math.PI, wave: 6 },
  ],
};
