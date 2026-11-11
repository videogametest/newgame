// Serializable battle types. Nothing here may import Babylon or any render code.
// Ground plane is (x, z). y is height above the ground. Yaw 0 faces +z; yaw π/2 faces +x.

export type Team = 'player' | 'enemy';
export type FighterKind = 'hero' | 'soldier' | 'archer';
export type WeaponId = 'sword' | 'bow';
export type BattleStatus = 'fighting' | 'victory' | 'defeat';
export type ActionPhase = 'idle' | 'windup' | 'swing' | 'draw' | 'release';

export interface Action {
  phase: ActionPhase;
  /** Seconds spent in the current phase. */
  t: number;
  /** True once this action has dealt its damage. */
  struck: boolean;
  /** Telegraphed strike zone (soldiers): centre x and z, fixed at wind-up start. */
  zoneX: number;
  zoneZ: number;
}

export interface Fighter {
  id: number;
  /** Key into the unit data (src/data/units.ts). Only the render layer reads it. */
  unitId: string;
  kind: FighterKind;
  team: Team;
  x: number;
  z: number;
  yaw: number;
  radius: number;
  height: number;
  maxHp: number;
  hp: number;
  alive: boolean;
  /** Planned walking velocity for this step (m/s). */
  vx: number;
  vz: number;
  /** Knockback velocity, decays toward zero (m/s). */
  knockX: number;
  knockZ: number;
  /** Seconds until this fighter may attack again. */
  cooldown: number;
  /** Seconds left in the hit reaction. */
  hitTimer: number;
  /** Seconds left on the damage flash. */
  flashTimer: number;
  action: Action;
  /** Hero only: the equipped weapon. */
  weapon: WeaponId;
  /** Hero only: seconds the bow has been drawn. */
  drawTime: number;
  /** Hero only: seconds left in the current dodge roll (0 when not rolling). */
  dodgeTime: number;
  dodgeCooldown: number;
  dodgeX: number;
  dodgeZ: number;
}

export interface Projectile {
  id: number;
  team: Team;
  ownerId: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  knockback: number;
  age: number;
  alive: boolean;
}

/** A solid cylinder: fighters walk around it and arrows stop against it. */
export interface Obstacle {
  x: number;
  z: number;
  radius: number;
  height: number;
}

export interface Spawn {
  unitId: string;
  kind: FighterKind;
  team: Team;
  x: number;
  z: number;
  yaw: number;
}

export interface ArenaDef {
  id: string;
  name: string;
  /** The arena is the rectangle |x| <= halfWidth, |z| <= halfDepth. */
  halfWidth: number;
  halfDepth: number;
  obstacles: Obstacle[];
  spawns: Spawn[];
}

export interface BattleState {
  time: number;
  status: BattleStatus;
  arena: ArenaDef;
  nextId: number;
  heroId: number;
  fighters: Fighter[];
  projectiles: Projectile[];
}

/** One step of player intent. Edge flags (`*Pressed`, `*Released`, `dodgePressed`) are true for one step only. */
export interface BattleInput {
  /** -1 = A, +1 = D, relative to the camera. */
  moveX: -1 | 0 | 1;
  /** -1 = S, +1 = W, relative to the camera. */
  moveZ: -1 | 0 | 1;
  /** Camera yaw in radians. The hero faces this direction. */
  camYaw: number;
  /** Camera pitch in radians. Positive looks up. Used for bow aim. */
  aimPitch: number;
  sprint: boolean;
  weapon: WeaponId;
  attackPressed: boolean;
  attackHeld: boolean;
  attackReleased: boolean;
  dodgePressed: boolean;
}

export type BattleEvent =
  | { type: 'damage'; fighterId: number; amount: number; x: number; z: number }
  | { type: 'dodge'; fighterId: number; x: number; z: number }
  | { type: 'swing'; fighterId: number }
  | { type: 'strike'; fighterId: number }
  | { type: 'draw'; fighterId: number }
  | { type: 'fire'; fighterId: number; projectileId: number }
  | { type: 'impact'; x: number; y: number; z: number }
  | { type: 'death'; fighterId: number }
  | { type: 'outcome'; status: BattleStatus };
