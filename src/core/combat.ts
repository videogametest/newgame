// Pure combat rules: bow charge, arrow launch, sword arcs, damage and knockback.
// No Babylon imports. Every number comes from TUNING.

import { TUNING } from '../config/tuning';
import { angleDelta, clamp, distance2, forwardOf, lerp } from './vec';
import type { Fighter } from './types';

/** Bow charge from 0 (just drawn) to 1 (full draw). */
export function bowCharge(drawTime: number): number {
  return clamp(drawTime / TUNING.bow.fullDrawTime, 0, 1);
}

export function bowDamage(drawTime: number): number {
  return lerp(TUNING.bow.minDamage, TUNING.bow.maxDamage, bowCharge(drawTime));
}

export function bowSpeed(drawTime: number): number {
  return lerp(TUNING.bow.minSpeed, TUNING.bow.maxSpeed, bowCharge(drawTime));
}

/**
 * Velocity for an arrow fired along the camera aim: yaw sets the heading on
 * the ground, pitch (positive = up) sets the elevation.
 */
export function aimedVelocity(yaw: number, pitch: number, speed: number) {
  const f = forwardOf(yaw);
  const c = Math.cos(pitch);
  return { vx: speed * c * f.x, vy: speed * Math.sin(pitch), vz: speed * c * f.z };
}

/**
 * Low-arc launch velocity that hits (targetX, targetY, targetZ) from
 * (fromX, fromY, fromZ) at the given speed under gravity. Returns null when
 * the target is out of reach at that speed.
 */
export function launchVelocity(
  fromX: number, fromY: number, fromZ: number,
  toX: number, toY: number, toZ: number,
  speed: number, gravity: number,
): { vx: number; vy: number; vz: number } | null {
  const d = distance2(fromX, fromZ, toX, toZ);
  const h = toY - fromY;
  if (d < 1e-6) return null;
  const v2 = speed * speed;
  const disc = v2 * v2 - gravity * (gravity * d * d + 2 * h * v2);
  if (disc < 0) return null;
  const theta = Math.atan2(v2 - Math.sqrt(disc), gravity * d);
  const ux = (toX - fromX) / d;
  const uz = (toZ - fromZ) / d;
  const horiz = speed * Math.cos(theta);
  return { vx: horiz * ux, vy: speed * Math.sin(theta), vz: horiz * uz };
}

/** True when a swing from (ax, az) facing `yaw` reaches a target centre. */
export function inSwingArc(
  ax: number, az: number, yaw: number,
  tx: number, tz: number, targetRadius: number,
  range: number, arcHalfAngle: number,
): boolean {
  const d = distance2(ax, az, tx, tz);
  if (d > range + targetRadius) return false;
  if (d < 1e-6) return true;
  const toTarget = Math.atan2(tx - ax, tz - az);
  return Math.abs(angleDelta(yaw, toTarget)) <= arcHalfAngle;
}

/** Unit direction from (fx, fz) to (tx, tz); zero vector when they coincide. */
export function unitDir(fx: number, fz: number, tx: number, tz: number): { x: number; z: number } {
  const dx = tx - fx;
  const dz = tz - fz;
  const d = Math.hypot(dx, dz);
  if (d < 1e-9) return { x: 0, z: 0 };
  return { x: dx / d, z: dz / d };
}

/**
 * Apply damage and a knockback impulse to a fighter. Returns true if the hit
 * killed it. Does not check dodge invulnerability; callers do that first.
 */
export function applyHit(
  target: Fighter,
  amount: number,
  dirX: number,
  dirZ: number,
  knockback: number,
): boolean {
  target.hp = Math.max(0, target.hp - amount);
  target.flashTimer = TUNING.combat.hitFlashTime;
  target.hitTimer = TUNING.combat.hitReactTime;
  target.knockX = dirX * knockback;
  target.knockZ = dirZ * knockback;
  if (target.hp <= 0) {
    target.alive = false;
    return true;
  }
  return false;
}
