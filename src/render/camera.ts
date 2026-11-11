// Third-person, over-the-shoulder camera. Yaw and pitch come from the player's aim; the camera only reads them.

import { FreeCamera, Scene, Vector3 } from '@babylonjs/core';
import { TUNING } from '../config/tuning';
import type { Fighter } from '../core/types';
import { lerp } from '../core/vec';

export class BattleCamera {
  readonly camera: FreeCamera;
  private zoom = 0;

  constructor(scene: Scene) {
    this.camera = new FreeCamera('battle_cam', new Vector3(0, 3, -14), scene);
    this.camera.minZ = 0.05;
    this.camera.maxZ = 120;
    scene.activeCamera = this.camera;
  }

  /**
   * Places the camera behind and to the right of the hero, looking along the aim direction.
   * View direction v = (sin yaw cos p, sin p, cos yaw cos p); right = (cos yaw, 0, -sin yaw).
   */
  update(hero: Fighter, yaw: number, pitch: number, zooming: boolean, dt: number): void {
    const C = TUNING.camera;
    const k = 1 - Math.exp(-C.zoomRate * dt);
    this.zoom += ((zooming ? 1 : 0) - this.zoom) * k;

    const d = lerp(C.distance, C.zoomDistance, this.zoom);
    this.camera.fov = lerp(C.fov, C.zoomFov, this.zoom);

    const cp = Math.cos(pitch);
    const vx = Math.sin(yaw) * cp;
    const vy = Math.sin(pitch);
    const vz = Math.cos(yaw) * cp;
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);

    const fx = hero.x;
    const fy = C.lookHeight;
    const fz = hero.z;
    const px = fx - vx * d + rx * C.shoulder;
    const py = fy - vy * d;
    const pz = fz - vz * d + rz * C.shoulder;
    this.camera.position.set(px, py, pz);
    this.camera.setTarget(new Vector3(px + vx, py + vy, pz + vz));
  }

  get zoomAmount(): number {
    return this.zoom;
  }
}
