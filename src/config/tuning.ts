// Every balance number lives here. Units are metres, seconds and radians.
// Logic reads these values; nothing in src/core or src/render hard-codes them.

const DEFAULTS = {
  /** Fixed simulation step in seconds. The render loop turns real time into steps of this size. */
  fixedDt: 1 / 60,
  /** Downward acceleration for arrows (m/s^2). */
  gravity: 9.8,

  camera: {
    fov: 0.9,
    zoomFov: 0.55,
    distance: 4.6,
    zoomDistance: 2.6,
    /** Sideways offset of the camera from the hero (over-the-shoulder). */
    shoulder: 0.9,
    /** Height of the look-at point above the hero's feet. */
    lookHeight: 1.5,
    pitchMin: -0.75,
    pitchMax: 0.45,
    mouseSensitivity: 0.0022,
    /** How fast the bow zoom eases in and out (per second, exponential). */
    zoomRate: 8,
  },

  combat: {
    /** Seconds a fighter flashes red after taking damage. */
    hitFlashTime: 0.14,
    /** Seconds a fighter plays its hit reaction. */
    hitReactTime: 0.45,
    /** Knockback velocity decays by exp(-friction * dt). */
    knockbackFriction: 9,
    damageNumberLife: 0.9,
  },

  hero: {
    maxHp: 140,
    radius: 0.45,
    height: 1.8,
    walkSpeed: 3.0,
    sprintSpeed: 5.4,
    /** Movement multiplier while the bow is drawn. */
    drawMoveFactor: 0.45,
    /** Movement multiplier during a sword swing. */
    swingMoveFactor: 0.3,
    dodgeSpeed: 8.5,
    /** Total dodge roll length in seconds. */
    dodgeTime: 0.5,
    /** The first part of a roll in which the hero cannot be hit. */
    dodgeIFrames: 0.3,
    dodgeCooldown: 1.0,
  },

  soldier: {
    maxHp: 70,
    radius: 0.45,
    height: 1.8,
    moveSpeed: 2.6,
    damage: 12,
    /** Distance at which a soldier starts its wind-up. */
    attackRange: 1.9,
    /** Visible wind-up before the strike lands. The strike zone is shown during it. */
    windupTime: 0.7,
    /** Centre of the strike zone, in front of the attacker. */
    strikeOffset: 1.0,
    strikeRadius: 0.9,
    swingTime: 0.4,
    cooldown: 1.3,
    knockback: 3.2,
  },

  archer: {
    maxHp: 50,
    radius: 0.4,
    height: 1.8,
    moveSpeed: 2.2,
    retreatSpeed: 2.6,
    arrowDamage: 10,
    arrowSpeed: 24,
    arrowKnockback: 1.2,
    /** Seconds the archer visibly draws before firing. */
    drawTime: 1.1,
    releaseTime: 0.35,
    cooldown: 2.2,
    preferredMin: 8,
    preferredMax: 13,
    maxRange: 24,
    /** Height the archer aims at on the target. */
    aimHeight: 1.1,
  },

  sword: {
    damage: 22,
    range: 2.3,
    /** Half-width of the swing arc in radians. */
    arcHalfAngle: 1.15,
    /** Seconds into the swing when the blade lands. */
    hitTime: 0.2,
    duration: 0.45,
    cooldown: 0.5,
    knockback: 4.0,
  },

  bow: {
    minDamage: 8,
    maxDamage: 34,
    minSpeed: 18,
    maxSpeed: 36,
    /** Seconds of drawing for a full-power shot. */
    fullDrawTime: 0.9,
    releaseTime: 0.3,
    cooldown: 0.35,
    knockback: 1.6,
    /** Where the arrow leaves the bow, relative to the hero. */
    muzzleHeight: 1.45,
    muzzleForward: 0.5,
  },

  arrow: {
    radius: 0.15,
    /** Arrows are removed after this many seconds of flight. */
    maxLife: 6,
  },
} as const;

/** A tuning object with every number widened to a plain, writable number. */
type Widen<T> = {
  -readonly [K in keyof T]: T[K] extends number ? number : T[K] extends object ? Widen<T[K]> : T[K];
};

export type Tuning = Widen<typeof DEFAULTS>;

/** The shipped values. Never mutated; resetTuning() copies from here. */
export const DEFAULT_TUNING: Tuning = DEFAULTS;

/** Live values read by the simulation and renderer. The debug panel writes into this object. */
export const TUNING: Tuning = structuredClone(DEFAULTS);

function assignInPlace(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const v = source[key];
    if (v !== null && typeof v === 'object') {
      assignInPlace(target[key] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      target[key] = v;
    }
  }
}

/** Restores every value to its shipped default. Mutates TUNING in place so readers see it. */
export function resetTuning(): void {
  assignInPlace(TUNING as unknown as Record<string, unknown>, structuredClone(DEFAULTS) as unknown as Record<string, unknown>);
}

/** Sets one number by dotted path, e.g. "hero.walkSpeed". Throws on an unknown path. */
export function setTuningValue(path: string, value: number): void {
  const keys = path.split('.');
  const last = keys.pop();
  let node: Record<string, unknown> = TUNING as unknown as Record<string, unknown>;
  for (const k of keys) {
    const next = node[k];
    if (next === null || typeof next !== 'object') throw new Error(`unknown tuning path ${path}`);
    node = next as Record<string, unknown>;
  }
  if (last === undefined || typeof node[last] !== 'number') throw new Error(`unknown tuning path ${path}`);
  node[last] = value;
}

/** The current values as pretty JSON, for the "Copy config" button. */
export function tuningJson(): string {
  return JSON.stringify(TUNING, null, 2);
}
