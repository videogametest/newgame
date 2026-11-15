import { AbstractMesh, Material, Scene } from '@babylonjs/core';
const cache = new WeakMap<Scene, Map<string, Material>>();
/** Neutral materials are shared per unit/slot; a flash or occlusion fade uses that fighter's private clone. */
export class CharacterMaterials {
  private readonly slots: { mesh: AbstractMesh; local: Material; shared: Material }[] = [];
  constructor(scene: Scene, unit: string, meshes: readonly AbstractMesh[]) {
    let pool = cache.get(scene);
    if (!pool) { pool = new Map(); cache.set(scene, pool); }
    const local = [...new Set(meshes.map(m => m.material).filter((m): m is Material => !!m))];
    for (const mesh of meshes) {
      if (!mesh.material) continue;
      const key = `${unit}:${local.indexOf(mesh.material)}`;
      let shared = pool.get(key);
      if (!shared) {
        shared = mesh.material.clone(`shared_${key}`) ?? undefined;
        if (!shared) throw new Error(`Cannot share character material ${key}`);
        pool.set(key, shared);
      }
      this.slots.push({ mesh, local: mesh.material, shared });
    }
  }
  usePrivate(on: boolean): void {
    for (const s of this.slots) { const next = on ? s.local : s.shared; if (s.mesh.material !== next) s.mesh.material = next; }
  }
  /** Rebind private materials before recursive view disposal, which must not dispose another defender's atlas. */
  detach(): void { this.usePrivate(true); }
}
