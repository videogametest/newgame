// Small pure helpers for the ground plane (x, z) and yaw angles.

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Yaw of a direction on the ground plane. Yaw 0 is +z. */
export function yawOf(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}

/** Unit forward vector on the ground plane for a yaw. */
export function forwardOf(yaw: number): { x: number; z: number } {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

/** Unit right vector on the ground plane for a yaw (right of the camera). */
export function rightOf(yaw: number): { x: number; z: number } {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}

export function distance2(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

/** Smallest signed difference between two angles, in (-π, π]. */
export function angleDelta(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}
