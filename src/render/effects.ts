// Arrows in flight and short-lived impact bursts. Both read simulation state; neither changes it.

import {
  AbstractMesh, AssetContainer, Color3, Mesh, MeshBuilder, Quaternion, Scene,
  ShadowGenerator, StandardMaterial, TransformNode, Vector3,
} from '@babylonjs/core';
import type { BattleState } from '../core/types';

/** Rotates the arrow model so its longest local axis runs along +z, the direction lookAt aims. */
function axisFixFor(meshes: AbstractMesh[]): Quaternion {
  const ext = new Vector3(0, 0, 0);
  for (const m of meshes) {
    if (m.getTotalVertices() === 0) continue;
    const e = m.getBoundingInfo().boundingBox.extendSize;
    ext.x = Math.max(ext.x, e.x);
    ext.y = Math.max(ext.y, e.y);
    ext.z = Math.max(ext.z, e.z);
  }
  if (ext.z >= ext.x && ext.z >= ext.y) return Quaternion.Identity();
  if (ext.y >= ext.x) return Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI / 2);
  return Quaternion.RotationAxis(new Vector3(0, 1, 0), -Math.PI / 2);
}

export class ArrowViews {
  private readonly views = new Map<number, TransformNode>();
  private readonly fix: Quaternion;

  constructor(
    private readonly scene: Scene,
    private readonly model: AssetContainer,
    private readonly shadow: ShadowGenerator,
  ) {
    const meshes = model.meshes.filter((m): m is AbstractMesh => m instanceof AbstractMesh);
    this.fix = axisFixFor(meshes);
  }

  sync(state: BattleState): void {
    const alive = new Set<number>();
    for (const p of state.projectiles) {
      alive.add(p.id);
      let node = this.views.get(p.id);
      if (!node) {
        node = this.spawn(p.id);
        this.views.set(p.id, node);
      }
      node.position.set(p.x, p.y, p.z);
      node.lookAt(new Vector3(p.x + p.vx, p.y + p.vy, p.z + p.vz));
    }
    for (const [id, node] of this.views) {
      if (!alive.has(id)) {
        node.dispose(false, true);
        this.views.delete(id);
      }
    }
  }

  private spawn(id: number): TransformNode {
    const entries = this.model.instantiateModelsToScene((n) => `arrow${id}_${n}`, true);
    const holder = new TransformNode(`arrow_${id}`, this.scene);
    const fixNode = new TransformNode(`arrow_${id}_fix`, this.scene);
    fixNode.rotationQuaternion = this.fix.clone();
    fixNode.parent = holder;
    for (const n of entries.rootNodes) n.parent = fixNode;
    for (const m of holder.getChildMeshes(false)) this.shadow.addShadowCaster(m);
    return holder;
  }

  dispose(): void {
    for (const node of this.views.values()) node.dispose(false, true);
    this.views.clear();
  }
}

interface Burst {
  mesh: Mesh;
  material: StandardMaterial;
  age: number;
}

const BURST_LIFE = 0.3;

export class ImpactBursts {
  private readonly bursts: Burst[] = [];

  constructor(private readonly scene: Scene) {}

  spawn(x: number, y: number, z: number): void {
    const mesh = MeshBuilder.CreateSphere(`burst_${this.bursts.length}`, { diameter: 0.4, segments: 8 }, this.scene);
    mesh.position.set(x, y, z);
    const material = new StandardMaterial('burst_mat', this.scene);
    material.disableLighting = true;
    material.emissiveColor = new Color3(1, 0.85, 0.4);
    material.diffuseColor = Color3.Black();
    material.alpha = 0.9;
    mesh.material = material;
    mesh.isPickable = false;
    this.bursts.push({ mesh, material, age: 0 });
  }

  update(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      const k = b.age / BURST_LIFE;
      b.mesh.scaling.setAll(0.6 + k * 1.6);
      b.material.alpha = Math.max(0, 0.9 * (1 - k));
      if (k >= 1) {
        b.mesh.dispose();
        b.material.dispose();
        this.bursts.splice(i, 1);
      }
    }
  }

  dispose(): void {
    for (const b of this.bursts) {
      b.mesh.dispose();
      b.material.dispose();
    }
    this.bursts.length = 0;
  }
}

