// Decides which fighters should fade because they block the view: they stand between the camera and the hero,
// or sit too close to the camera. Pure geometry, no Babylon imports, so it is tested headless.

import { TUNING } from '../config/tuning';

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface Body {
  x: number;
  z: number;
  radius: number;
  height: number;
}

/**
 * True when a fighter should fade. Two tests:
 * - near: the body's centre is within occludeNearDistance of the camera (3D);
 * - between: on the ground plane, the body lies on the camera-to-hero line, strictly between the two ends,
 *   within its radius plus occludeMargin.
 * The hero itself is never passed here; the caller skips it.
 */
export function blocksView(cam: Point3, hero: { x: number; z: number }, body: Body): boolean {
  const C = TUNING.camera;

  const ex = body.x - cam.x;
  const ey = body.height / 2 - cam.y;
  const ez = body.z - cam.z;
  if (Math.hypot(ex, ey, ez) < C.occludeNearDistance) return true;

  const sx = hero.x - cam.x;
  const sz = hero.z - cam.z;
  const len2 = sx * sx + sz * sz;
  if (len2 < 1e-9) return false;
  const t = (ex * sx + ez * sz) / len2;
  if (t <= 0 || t >= 1) return false;
  const px = cam.x + sx * t;
  const pz = cam.z + sz * t;
  return Math.hypot(body.x - px, body.z - pz) < body.radius + C.occludeMargin;
}
