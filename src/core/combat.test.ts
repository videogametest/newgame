import { describe, expect, it } from 'vitest';
import { TUNING } from '../config/tuning';
import { aimVelocity, arcPoint, bowShot, drawRatio, inSwordArc, knockbackVx, solveLaunch } from './combat';

const { arrowGravity } = TUNING.physics;
const bow = TUNING.weapons.bow;

describe('drawRatio', () => {
  it('scales draw time to 0..1 and clamps', () => {
    expect(drawRatio(0.45, 0.9)).toBeCloseTo(0.5);
    expect(drawRatio(2, 0.9)).toBe(1);
    expect(drawRatio(-1, 0.9)).toBe(0);
  });
});

describe('bowShot', () => {
  it('gives minimum damage and speed at no draw', () => {
    expect(bowShot(0, bow)).toEqual({ damage: bow.minDamage, speed: bow.minSpeed });
  });
  it('gives maximum damage and speed at full draw and clamps beyond it', () => {
    expect(bowShot(1, bow)).toEqual({ damage: bow.maxDamage, speed: bow.maxSpeed });
    expect(bowShot(5, bow)).toEqual({ damage: bow.maxDamage, speed: bow.maxSpeed });
  });
});

describe('aimVelocity', () => {
  it('points at the cursor with the given speed', () => {
    const v = aimVelocity(0, 0, 300, 400, 500);
    expect(v.vx).toBeCloseTo(300);
    expect(v.vy).toBeCloseTo(400);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(500);
  });
});

describe('solveLaunch', () => {
  const speed = TUNING.units.archer.arrowSpeed;

  it.each([
    [400, -100],
    [-400, -100],
    [300, 0],
    [500, 60],
  ])('lands an arc on target at dx=%d dy=%d', (dx, dy) => {
    const v = solveLaunch(dx, dy, speed, arrowGravity);
    expect(v).not.toBeNull();
    const t = dx / v!.vx;
    const p = arcPoint(0, 0, v!.vx, v!.vy, arrowGravity, t);
    expect(p.x).toBeCloseTo(dx, 6);
    expect(p.y).toBeCloseTo(dy, 1);
    expect(Math.hypot(v!.vx, v!.vy)).toBeCloseTo(speed, 6);
  });

  it('returns null when the target is out of reach at that speed', () => {
    expect(solveLaunch(2000, 0, speed, arrowGravity)).toBeNull();
  });

  it('returns null for a target directly above or below', () => {
    expect(solveLaunch(0, -100, speed, arrowGravity)).toBeNull();
  });
});

describe('arcPoint', () => {
  it('starts at the launch point and bends downward under gravity', () => {
    expect(arcPoint(10, 20, 100, -50, arrowGravity, 0)).toEqual({ x: 10, y: 20 });
    expect(arcPoint(0, 0, 100, 0, arrowGravity, 1).y).toBeGreaterThan(0);
  });
});

describe('knockbackVx', () => {
  it('pushes the target away from the source', () => {
    expect(knockbackVx(100, 150, 240)).toBe(240);
    expect(knockbackVx(150, 100, 240)).toBe(-240);
  });
});

describe('inSwordArc', () => {
  const attacker = { x: 100, facing: 1 as const, width: 40 };
  const sized = (x: number) => ({ x, width: 40 });

  it('hits a foe in front within range', () => {
    expect(inSwordArc(attacker, sized(150), 95)).toBe(true);
  });
  it('misses a foe behind the attacker', () => {
    expect(inSwordArc(attacker, sized(50), 95)).toBe(false);
  });
  it('misses a foe beyond range', () => {
    expect(inSwordArc(attacker, sized(400), 95)).toBe(false);
  });
});
