// Pure AI decisions for non-hero fighters. Each call returns an intent; battle.ts applies it.
// Soldiers close in, wind up a telegraphed strike, and strike. Archers hold a preferred
// distance and draw before firing.

import { TUNING } from '../config/tuning';
import { launchVelocity, unitDir } from './combat';
import type { BattleState, Fighter } from './types';

export interface AiIntent {
  /** Planned walking velocity (m/s) on the ground plane. */
  vx: number;
  vz: number;
  /** Facing to turn toward, or null to keep the current yaw. */
  yaw: number | null;
  /** Ask battle.ts to start this fighter's action (windup or draw) now. */
  startAction: boolean;
}

const STILL: AiIntent = { vx: 0, vz: 0, yaw: null, startAction: false };

/** Nearest living fighter on the opposing team, or undefined. */
export function nearestEnemy(state: BattleState, f: Fighter): Fighter | undefined {
  let best: Fighter | undefined;
  let bestD = Infinity;
  for (const o of state.fighters) {
    if (!o.alive || o.team === f.team) continue;
    const d = Math.hypot(o.x - f.x, o.z - f.z);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

export function decideAI(state: BattleState, f: Fighter): AiIntent {
  if (f.kind === 'soldier') return decideSoldier(state, f);
  if (f.kind === 'archer') return decideArcher(state, f);
  return STILL;
}

function decideSoldier(state: BattleState, f: Fighter): AiIntent {
  const target = nearestEnemy(state, f);
  if (!target) return STILL;
  const dir = unitDir(f.x, f.z, target.x, target.z);
  const yaw = Math.atan2(dir.x, dir.z);
  const dist = Math.hypot(target.x - f.x, target.z - f.z);
  const idle = f.action.phase === 'idle';

  if (!idle) return { vx: 0, vz: 0, yaw, startAction: false };
  if (dist <= TUNING.soldier.attackRange) {
    return { vx: 0, vz: 0, yaw, startAction: f.cooldown <= 0 };
  }
  const s = TUNING.soldier.moveSpeed;
  return { vx: dir.x * s, vz: dir.z * s, yaw, startAction: false };
}

function decideArcher(state: BattleState, f: Fighter): AiIntent {
  const target = nearestEnemy(state, f);
  if (!target) return STILL;
  const dir = unitDir(f.x, f.z, target.x, target.z);
  const yaw = Math.atan2(dir.x, dir.z);
  const dist = Math.hypot(target.x - f.x, target.z - f.z);
  const idle = f.action.phase === 'idle';
  const A = TUNING.archer;

  if (!idle) return { vx: 0, vz: 0, yaw, startAction: false };

  let vx = 0;
  let vz = 0;
  if (dist < A.preferredMin) {
    vx = -dir.x * A.retreatSpeed;
    vz = -dir.z * A.retreatSpeed;
  } else if (dist > A.preferredMax) {
    vx = dir.x * A.moveSpeed;
    vz = dir.z * A.moveSpeed;
  }

  const canShoot =
    f.cooldown <= 0 &&
    dist <= A.maxRange &&
    launchVelocity(f.x, TUNING.bow.muzzleHeight, f.z, target.x, A.aimHeight, target.z,
      A.arrowSpeed, TUNING.gravity) !== null;
  return { vx, vz, yaw, startAction: canShoot };
}
