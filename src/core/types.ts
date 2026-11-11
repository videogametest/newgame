// Serializable game types. Nothing here may reference Phaser objects.

export type Team = 'player' | 'enemy';
export type WeaponId = 'sword' | 'bow';
export type UnitKind = 'hero' | 'melee' | 'archer';
export type BattleStatus = 'fighting' | 'victory' | 'defeat';

export interface BodyStats {
  maxHp: number;
  moveSpeed: number;
  width: number;
  height: number;
}

export interface MeleeStats extends BodyStats {
  damage: number;
  attackRange: number;
  attackCooldown: number;
  knockback: number;
}

export interface ArcherStats extends BodyStats {
  arrowDamage: number;
  arrowSpeed: number;
  arrowKnockback: number;
  preferredMin: number;
  preferredMax: number;
  maxRange: number;
  fireCooldown: number;
}

export interface Fighter {
  id: number;
  unitId: string;
  kind: UnitKind;
  team: Team;
  x: number;
  /** Feet position. Fighters stand on the ground line. */
  y: number;
  facing: 1 | -1;
  width: number;
  height: number;
  maxHp: number;
  hp: number;
  alive: boolean;
  /** Walking velocity from player input or AI (px/s). */
  moveVx: number;
  /** Knockback velocity, decays toward 0 (px/s). */
  knockVx: number;
  /** Seconds until this fighter may attack or shoot again. */
  cooldown: number;
  /** Seconds left on the sword swing visual. */
  swingTimer: number;
  /** Seconds left on the hit flash. */
  flashTimer: number;
  /** Hero only: the selected weapon. */
  weapon: WeaponId;
  /** Hero only: seconds the bow has been drawn. 0 when not drawing. */
  drawTime: number;
}

export interface Projectile {
  id: number;
  team: Team;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  knockback: number;
  alive: boolean;
}

export interface DamageNumber {
  id: number;
  x: number;
  y: number;
  amount: number;
  /** True when the player's side took the damage. */
  onPlayer: boolean;
  life: number;
}

export interface BattleState {
  time: number;
  status: BattleStatus;
  worldWidth: number;
  groundY: number;
  nextId: number;
  heroId: number;
  fighters: Fighter[];
  projectiles: Projectile[];
  damageNumbers: DamageNumber[];
}

/** One simulation step of player intent. Edge flags are true for one step only. */
export interface BattleInput {
  moveDir: -1 | 0 | 1;
  weapon: WeaponId;
  attackPressed: boolean;
  attackHeld: boolean;
  attackReleased: boolean;
  aimX: number;
  aimY: number;
}
