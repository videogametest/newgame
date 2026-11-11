// Decides what a non-hero fighter wants to do this step. Pure: returns a plan, changes nothing.
import { UNIT_DEFS } from '../data/units';
import { TUNING } from '../config/tuning';
import { bodyGap, solveLaunch } from './combat';
import { facingOf } from './math';
import type { BattleState, Fighter } from './types';

export type UnitPlan = {
  moveVx: number;
  facing: 1 | -1;
  /** Melee units: the foe to strike if in reach. */
  strike?: Fighter;
  /** Archers: the launch velocity for an arrow that lands on the foe. */
  shot?: { x: number; y: number; vx: number; vy: number; damage: number; knockback: number };
};

export function nearestFoe(f: Fighter, s: BattleState): Fighter | undefined {
  let best: Fighter | undefined;
  let bestDist = Infinity;
  for (const other of s.fighters) {
    if (!other.alive || other.team === f.team) continue;
    const dist = Math.abs(other.x - f.x);
    if (dist < bestDist) {
      best = other;
      bestDist = dist;
    }
  }
  return best;
}

export function planUnit(f: Fighter, s: BattleState): UnitPlan {
  const foe = nearestFoe(f, s);
  if (!foe) return { moveVx: 0, facing: f.facing };

  const def = UNIT_DEFS[f.unitId];
  const facing = facingOf(foe.x - f.x, f.facing);

  if (def.kind === 'melee') {
    if (bodyGap(f, foe) <= def.stats.attackRange) {
      return { moveVx: 0, facing, strike: foe };
    }
    return { moveVx: facing * def.stats.moveSpeed, facing };
  }

  if (def.kind === 'archer') {
    const st = def.stats;
    const dist = Math.abs(foe.x - f.x);
    let moveVx = 0;
    if (dist < st.preferredMin) moveVx = -facing * st.moveSpeed;
    else if (dist > st.preferredMax) moveVx = facing * st.moveSpeed;

    const plan: UnitPlan = { moveVx, facing };
    if (dist <= st.maxRange) {
      const sx = f.x + facing * (f.width / 2);
      const sy = f.y - f.height * 0.6;
      const tx = foe.x;
      const ty = foe.y - foe.height * 0.6;
      const v = solveLaunch(tx - sx, ty - sy, st.arrowSpeed, TUNING.physics.arrowGravity);
      if (v) {
        plan.shot = {
          x: sx,
          y: sy,
          vx: v.vx,
          vy: v.vy,
          damage: st.arrowDamage,
          knockback: st.arrowKnockback,
        };
      }
    }
    return plan;
  }

  // The hero is never planned by AI; the player drives it.
  return { moveVx: 0, facing: f.facing };
}
