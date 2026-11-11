// A headless bot that plays the hero from the battle state alone. Used by tests to prove the
// battle can be won and that the controls reach an outcome. Pure: no Babylon, no randomness.

import { TUNING } from '../config/tuning';
import { bowSpeed, launchVelocity, unitDir } from './combat';
import { nearestEnemy } from './ai';
import { getHero, isDodgeInvulnerable } from './battle';
import type { BattleInput, BattleState, Fighter } from './types';

const NEUTRAL: BattleInput = {
  moveX: 0,
  moveZ: 0,
  camYaw: 0,
  aimPitch: 0,
  sprint: false,
  weapon: 'sword',
  attackPressed: false,
  attackHeld: false,
  attackReleased: false,
  dodgePressed: false,
};

/** True when an enemy soldier is winding up a strike whose zone reaches the hero. */
function strikeIncoming(state: BattleState, hero: Fighter): boolean {
  for (const o of state.fighters) {
    if (!o.alive || o.team === hero.team || o.kind !== 'soldier') continue;
    if (o.action.phase !== 'windup') continue;
    const d = Math.hypot(hero.x - o.action.zoneX, hero.z - o.action.zoneZ);
    if (d < TUNING.soldier.strikeRadius + hero.radius + 0.2) return true;
  }
  return false;
}

/** Pitch that lands a bow shot on the target's chest, from the hero's muzzle. */
function bowPitch(hero: Fighter, target: Fighter, drawTime: number): number {
  const speed = bowSpeed(drawTime);
  const v = launchVelocity(
    hero.x, TUNING.bow.muzzleHeight, hero.z,
    target.x, TUNING.archer.aimHeight, target.z,
    speed, TUNING.gravity,
  );
  if (!v) return 0;
  return Math.atan2(v.vy, Math.hypot(v.vx, v.vz));
}

/** Chooses this step's input for the hero. Reads state only; never mutates it. */
export function botInput(state: BattleState): BattleInput {
  const hero = getHero(state);
  if (!hero.alive || state.status !== 'fighting') return { ...NEUTRAL };

  const target = nearestEnemy(state, hero);
  if (!target) return { ...NEUTRAL };

  const dir = unitDir(hero.x, hero.z, target.x, target.z);
  const camYaw = Math.atan2(dir.x, dir.z);
  const dist = Math.hypot(target.x - hero.x, target.z - hero.z);
  const input: BattleInput = { ...NEUTRAL, camYaw };

  // Dodge a telegraphed strike instead of trading hits.
  if (strikeIncoming(state, hero) && hero.dodgeTime <= 0 && hero.dodgeCooldown <= 0 && !isDodgeInvulnerable(hero)) {
    input.dodgePressed = true;
    return input;
  }

  const meleeReach = TUNING.sword.range + target.radius;
  const wantBow = target.kind === 'archer' || dist > meleeReach + 1.5;
  const desired = wantBow ? 'bow' : 'sword';
  input.weapon = desired;
  // Keep the same weapon in hand until it is free to change.
  if (hero.action.phase !== 'idle') input.weapon = hero.weapon;

  if (hero.weapon === 'sword') {
    const inReach = dist <= meleeReach;
    input.moveZ = inReach ? 0 : 1;
    if (inReach && hero.action.phase === 'idle' && hero.cooldown <= 0) input.attackPressed = true;
    return input;
  }

  // Bow: hold position, draw to full, release on the aimed target.
  if (hero.action.phase === 'idle') {
    input.moveZ = dist < TUNING.archer.preferredMin ? -1 : 0;
    if (hero.cooldown <= 0) input.attackPressed = true;
    input.aimPitch = bowPitch(hero, target, TUNING.bow.fullDrawTime);
    return input;
  }
  if (hero.action.phase === 'draw') {
    const full = hero.drawTime >= TUNING.bow.fullDrawTime;
    input.attackHeld = !full;
    input.attackReleased = full;
    input.aimPitch = bowPitch(hero, target, hero.drawTime);
    return input;
  }
  return input;
}
