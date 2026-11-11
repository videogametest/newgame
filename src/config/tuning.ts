// Every balance number lives here. Logic reads these values; nothing hard-codes them.
import type { ArcherStats, BodyStats, MeleeStats } from '../core/types';

export const TUNING = {
  display: { width: 1280, height: 720 },
  world: {
    width: 2560,
    /** Ground line: fighters' feet stand here. */
    groundY: 620,
    /** Knockback decay (px/s^2). */
    friction: 1600,
  },
  physics: {
    arrowGravity: 900,
  },
  feedback: {
    hitFlashTime: 0.12,
    swingTime: 0.2,
    damageNumberLife: 0.8,
    damageNumberRise: 50,
    arrowRadius: 4,
  },
  units: {
    hero: { maxHp: 120, moveSpeed: 230, width: 40, height: 90 } satisfies BodyStats,
    soldier: {
      maxHp: 70,
      moveSpeed: 150,
      width: 40,
      height: 90,
      damage: 12,
      attackRange: 70,
      attackCooldown: 0.9,
      knockback: 180,
    } satisfies MeleeStats,
    archer: {
      maxHp: 50,
      moveSpeed: 120,
      width: 40,
      height: 90,
      arrowDamage: 10,
      arrowSpeed: 760,
      arrowKnockback: 60,
      preferredMin: 320,
      preferredMax: 520,
      maxRange: 600,
      fireCooldown: 1.8,
    } satisfies ArcherStats,
  },
  weapons: {
    sword: { damage: 22, range: 95, cooldown: 0.5, knockback: 240 },
    bow: {
      minDamage: 8,
      maxDamage: 34,
      minSpeed: 420,
      maxSpeed: 1000,
      fullDrawTime: 0.9,
      cooldown: 0.4,
      arrowKnockback: 120,
    },
  },
};
