// Pure camera-limit rules. No Babylon imports, so they are tested headless.

/** Lifts a camera height so it never sits below the floor. */
export function clampCameraHeight(y: number, minHeight: number): number {
  return Math.max(y, minHeight);
}

/** Playable rectangle on the ground plane, centred on the origin. */
export interface ArenaBounds {
  halfWidth: number;
  halfDepth: number;
}

/** True when (x, z) is inside the bounds (edges count as inside). */
export function insideBounds(x: number, z: number, b: ArenaBounds): boolean {
  return Math.abs(x) <= b.halfWidth && Math.abs(z) <= b.halfDepth;
}
