// Ground movement for the valley hero: the hero stands on heightAt, stays inside the valley,
// and cannot enter water. Pure: no Babylon imports.

export interface GroundPoint { x: number; z: number }

export interface WalkRules {
  /** Returns ground height at (x, z). */
  heightAt: (x: number, z: number) => number;
  /** True where the hero may not stand (lake, river). */
  blocked: (x: number, z: number) => boolean;
  /** True while (x, z) is inside the playable valley. */
  inside: (x: number, z: number) => boolean;
}

/**
 * Moves a point by (dirX, dirZ) * speed * dt on the ground. The direction is normalised here, so a
 * diagonal is no faster than a straight line. If the full move is blocked, each axis is tried alone so
 * the hero slides along a shore or a boundary instead of sticking.
 */
export function walkStep(
  from: GroundPoint,
  dirX: number,
  dirZ: number,
  speed: number,
  dt: number,
  rules: WalkRules,
): GroundPoint & { y: number } {
  if (![from.x, from.z, dirX, dirZ, speed, dt].every(Number.isFinite) || speed < 0 || dt < 0) {
    throw new RangeError('walkStep requires finite inputs and nonnegative speed and dt');
  }
  const len = Math.hypot(dirX, dirZ);
  const d = len > 1 ? { x: dirX / len, z: dirZ / len } : { x: dirX, z: dirZ };
  const dist = speed * dt;
  const ok = (x: number, z: number): boolean => rules.inside(x, z) && !rules.blocked(x, z);
  const full = { x: from.x + d.x * dist, z: from.z + d.z * dist };
  let to = from;
  if (ok(full.x, full.z)) to = full;
  else {
    const xOnly = { x: from.x + d.x * dist, z: from.z };
    const zOnly = { x: from.x, z: from.z + d.z * dist };
    if (ok(xOnly.x, xOnly.z)) to = xOnly;
    else if (ok(zOnly.x, zOnly.z)) to = zOnly;
  }
  return { x: to.x, z: to.z, y: rules.heightAt(to.x, to.z) };
}
