import { describe, expect, it } from 'vitest';
import { TUNING } from '../config/tuning';
import {
  applyHit, aimedVelocity, bowCharge, bowDamage, bowSpeed, inSwingArc, launchVelocity, unitDir,
} from './combat';
import type { Fighter } from './types';

function fighter(overrides: Partial<Fighter> = {}): Fighter {
  return {
    id: 1, unitId: 'test', kind: 'soldier', team: 'enemy', x: 0, z: 0, yaw: 0,
    radius: 0.45, height: 1.8, maxHp: 50, hp: 50, alive: true,
    vx: 0, vz: 0, knockX: 0, knockZ: 0, cooldown: 0, hitTimer: 0, flashTimer: 0,
    action: { phase: 'idle', t: 0, struck: false, zoneX: 0, zoneZ: 0 },
    weapon: 'sword', drawTime: 0, dodgeTime: 0, dodgeCooldown: 0, dodgeX: 0, dodgeZ: 0,
    ...overrides,
  };
}

describe('bow', () => {
  it('charge, damage and speed grow with draw time and clamp at full draw', () => {
    expect(bowCharge(0)).toBe(0);
    expect(bowCharge(TUNING.bow.fullDrawTime)).toBe(1);
    expect(bowCharge(10)).toBe(1);
    expect(bowDamage(0)).toBe(TUNING.bow.minDamage);
    expect(bowDamage(10)).toBe(TUNING.bow.maxDamage);
    expect(bowSpeed(0)).toBe(TUNING.bow.minSpeed);
    expect(bowSpeed(10)).toBe(TUNING.bow.maxSpeed);
  });

  it('aimedVelocity heads along the yaw with the given pitch and speed', () => {
    const v = aimedVelocity(0, 0, 20);
    expect(v.vx).toBeCloseTo(0);
    expect(v.vy).toBeCloseTo(0);
    expect(v.vz).toBeCloseTo(20);
    const up = aimedVelocity(0, Math.PI / 6, 20);
    expect(Math.hypot(up.vx, up.vy, up.vz)).toBeCloseTo(20);
    expect(up.vy).toBeCloseTo(10);
  });
});

describe('launchVelocity', () => {
  it('a low-arc shot passes through the target point', () => {
    const g = TUNING.gravity;
    const speed = 24;
    const from = { x: 0, y: 1.45, z: 0 };
    const to = { x: 0, y: 1.1, z: 10 };
    const v = launchVelocity(from.x, from.y, from.z, to.x, to.y, to.z, speed, g);
    expect(v).not.toBeNull();
    if (!v) return;
    // Integrate the same way the battle does and find the height when z reaches the target.
    let x = from.x;
    let y = from.y;
    let z = from.z;
    let vx = v.vx;
    let vy = v.vy;
    let vz = v.vz;
    const dt = TUNING.fixedDt;
    let prev = { y, z };
    for (let i = 0; i < 6000 && z < to.z; i++) {
      prev = { y, z };
      vy -= g * dt;
      x += vx * dt;
      y += vy * dt;
      z += vz * dt;
    }
    expect(z).toBeGreaterThanOrEqual(to.z);
    expect(x).toBeCloseTo(0, 5);
    // Height where the path crosses the target's z, interpolated between the two steps around it.
    const t = (to.z - prev.z) / (z - prev.z);
    const yAtTarget = prev.y + (y - prev.y) * t;
    expect(yAtTarget).toBeCloseTo(to.y, 1);
  });

  it('returns null when the target is out of reach at that speed', () => {
    expect(launchVelocity(0, 1.4, 0, 0, 1.1, 60, 10, TUNING.gravity)).toBeNull();
  });
});

describe('inSwingArc', () => {
  const W = TUNING.sword;
  it('hits a target in front within range', () => {
    expect(inSwingArc(0, 0, 0, 0, 1.5, 0.45, W.range, W.arcHalfAngle)).toBe(true);
  });
  it('misses a target behind the swing', () => {
    expect(inSwingArc(0, 0, 0, 0, -1.5, 0.45, W.range, W.arcHalfAngle)).toBe(false);
  });
  it('misses a target beyond range', () => {
    expect(inSwingArc(0, 0, 0, 0, W.range + 2, 0.45, W.range, W.arcHalfAngle)).toBe(false);
  });
});

describe('applyHit and unitDir', () => {
  it('reduces hp, sets flash, hit reaction and knockback, and kills at zero', () => {
    const f = fighter({ hp: 30 });
    const died = applyHit(f, 10, 1, 0, 4);
    expect(died).toBe(false);
    expect(f.hp).toBe(20);
    expect(f.flashTimer).toBeCloseTo(TUNING.combat.hitFlashTime);
    expect(f.hitTimer).toBeCloseTo(TUNING.combat.hitReactTime);
    expect(f.knockX).toBeCloseTo(4);
    expect(f.knockZ).toBeCloseTo(0);
    expect(applyHit(f, 100, 0, 1, 1)).toBe(true);
    expect(f.hp).toBe(0);
    expect(f.alive).toBe(false);
  });

  it('unitDir returns a unit vector, or zero when the points coincide', () => {
    const d = unitDir(0, 0, 3, 4);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1);
    expect(unitDir(1, 1, 1, 1)).toEqual({ x: 0, z: 0 });
  });
});
