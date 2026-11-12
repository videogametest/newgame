// Over-the-shoulder camera pose for the valley. Same geometry as the battle camera, but the camera
// stays above the ground under it, so it follows the hills instead of a flat floor. Pure: no Babylon imports.

export interface Point3 { x: number; y: number; z: number }

export interface ValleyCameraRig {
  /** Metres behind the hero (before any ground clamp). */
  distance: number;
  /** Metres to the right of the hero's line of sight. */
  shoulder: number;
  /** Height of the look-at point above the hero's feet. */
  lookHeight: number;
  /** Minimum height of the camera above the ground beneath it. */
  clearance: number;
}

export interface CameraPose { position: Point3; target: Point3 }

/**
 * View direction v = (sin yaw cos p, sin p, cos yaw cos p); right = (cos yaw, 0, -sin yaw).
 * The camera sits behind the hero along -v, offset right, and never lower than the ground beneath it
 * plus clearance. The target is then set along v from the clamped position, so the crosshair still
 * points where the camera looks even when the clamp moved the camera.
 */
export function valleyCameraPose(
  hero: { x: number; y?: number; z: number },
  yaw: number,
  pitch: number,
  rig: ValleyCameraRig,
  groundAt: (x: number, z: number) => number,
): CameraPose {
  const cp = Math.cos(pitch);
  const vx = Math.sin(yaw) * cp;
  const vy = Math.sin(pitch);
  const vz = Math.cos(yaw) * cp;
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);

  const px = hero.x - vx * rig.distance + rx * rig.shoulder;
  const pz = hero.z - vz * rig.distance + rz * rig.shoulder;
  // The look point sits above the hero's feet, which stand on the ground at hero.y.
  const wanted = (hero.y ?? 0) + rig.lookHeight - vy * rig.distance;
  const floor = groundAt(px, pz) + rig.clearance;
  const py = Math.max(wanted, floor);
  return {
    position: { x: px, y: py, z: pz },
    target: { x: px + vx, y: py + vy, z: pz + vz },
  };
}

/**
 * Yaw and pitch that make the camera look along a direction, using valleyCameraPose's convention:
 * v = (sin yaw cos p, sin p, cos yaw cos p). Used by the capture hook to frame the sun and the moon.
 */
export function aimAngles(dir: Point3): { yaw: number; pitch: number } {
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const yaw = Math.atan2(dir.x, dir.z);
  const pitch = Math.asin(Math.max(-1, Math.min(1, dir.y / len)));
  return { yaw, pitch };
}
