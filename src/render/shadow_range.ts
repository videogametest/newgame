import type { AbstractMesh } from '@babylonjs/core';
export const SHADOW_RANGE = 60;
/** Distance to the footprint, not the node pivot (merged meshes can have their pivot at the origin). */
export function withinShadowRange(mesh: AbstractMesh, hero: { x: number; z: number }, radius = SHADOW_RANGE): boolean {
  const box = mesh.getBoundingInfo().boundingBox;
  const dx = Math.max(box.minimumWorld.x - hero.x, 0, hero.x - box.maximumWorld.x);
  const dz = Math.max(box.minimumWorld.z - hero.z, 0, hero.z - box.maximumWorld.z);
  return dx * dx + dz * dz <= radius * radius;
}
