// The fight at the patrol hut on the soldiers' road (task 004 item 8). Data only.
// The valley has no arena walls: the valley's walk rules bound the hero, so the rectangle here is only a
// generous clamp. Bram stays out of the fight (queue decision d), so he is not in the spawns.
import type { ArenaDef } from '../core/types/battle';
import { VALLEY_PLACES } from '../core/world/valley';

const HUT = VALLEY_PLACES.patrolHut;
// Every enemy starts inside the 25 m sim radius of the hero, so the fight starts when he arrives (queue decision b).

export const PATROL_HUT_HERO_SPAWN = { x: 300, z: -100 };

export const PATROL_HUT_FIGHT: ArenaDef = {
  id: 'patrol_hut_fight',
  name: 'The patrol hut',
  halfWidth: 1000,
  halfDepth: 1000,
  obstacles: [],
  waveGap: 0,
  spawns: [
    { unitId: 'hero', kind: 'hero', team: 'player', x: PATROL_HUT_HERO_SPAWN.x, z: PATROL_HUT_HERO_SPAWN.z, yaw: 0 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 311, z: -99, yaw: Math.PI / 2 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: 313, z: -95, yaw: Math.PI / 2 },
    { unitId: 'enemy_archer', kind: 'archer', team: 'enemy', x: 314, z: -108, yaw: Math.PI / 2 },
  ],
};

/** The hut's centre, for the test that no fighter starts on top of it. */
export const PATROL_HUT_CENTRE = { x: HUT.x, z: HUT.z };
