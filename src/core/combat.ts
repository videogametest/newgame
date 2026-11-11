// Pure combat math. No Phaser, no state mutation. Screen coordinates: y points down.
import { clamp, facingOf, lerp } from './math';
import type { Fighter } from './types';

export interface BowTuning {
  minDamage: number;
  maxDamage: number;
  minSpeed: number;
  maxSpeed: number;
  fullDrawTime: number;
}

export function drawRatio(drawTime: number, fullDrawTime: number): number {
  return clamp(drawTime / fullDrawTime, 0, 1);
}

/** Damage and launch speed for a bow shot at a given draw ratio (0..1). */
export function bowShot(ratio: number, bow: BowTuning): { damage: number; speed: number } {
  const t = clamp(ratio, 0, 1);
  return {
    damage: Math.round(lerp(bow.minDamage, bow.maxDamage, t)),
    speed: lerp(bow.minSpeed, bow.maxSpeed, t),
  };
}

/** Velocity that points from (fromX, fromY) at (toX, toY) with the given speed. */
export function aimVelocity(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  speed: number,
): { vx: number; vy: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy) || 1;
  return { vx: (dx / len) * speed, vy: (dy / len) * speed };
}

/**
 * Low-arc launch velocity that lands on a target at (dx, dy) from the launch point,
 * for a fixed launch speed under gravity. dy is positive downward. Returns null when
 * the target is out of reach at that speed.
 */
export function solveLaunch(
  dx: number,
  dy: number,
  speed: number,
  gravity: number,
): { vx: number; vy: number } | null {
  const ax = Math.abs(dx);
  if (ax < 1e-6) return null;
  const h = -dy; // height above the launch point, up positive
  const v2 = speed * speed;
  const disc = v2 * v2 - gravity * (gravity * ax * ax + 2 * h * v2);
  if (disc < 0) return null;
  const theta = Math.atan((v2 - Math.sqrt(disc)) / (gravity * ax));
  const dir = facingOf(dx);
  return { vx: dir * speed * Math.cos(theta), vy: -speed * Math.sin(theta) };
}

/** Position of a projectile t seconds after launch. */
export function arcPoint(
  x0: number,
  y0: number,
  vx: number,
  vy: number,
  gravity: number,
  t: number,
): { x: number; y: number } {
  return { x: x0 + vx * t, y: y0 + vy * t + 0.5 * gravity * t * t };
}

/** Horizontal knockback velocity pushing `to` away from `from`. */
export function knockbackVx(fromX: number, toX: number, strength: number): number {
  return facingOf(toX - fromX) * strength;
}

/** Empty space between two fighters' bodies (negative when overlapping). */
export function bodyGap(a: Pick<Fighter, 'x' | 'width'>, b: Pick<Fighter, 'x' | 'width'>): number {
  return Math.abs(a.x - b.x) - (a.width + b.width) / 2;
}

/** True when `target` is in front of the attacker and within sword reach. */
export function inSwordArc(
  attacker: Pick<Fighter, 'x' | 'facing' | 'width'>,
  target: Pick<Fighter, 'x' | 'width'>,
  range: number,
): boolean {
  const ahead = (target.x - attacker.x) * attacker.facing;
  return ahead > -target.width / 2 && bodyGap(attacker, target) <= range;
}
