// Draws the soldiers' road gate (overnight item 8) from its parts, merged into one mesh. The collision wall is
// core's onGateWall; the planks sit on its two faces, so the hero stops where the gate is drawn.
import { Mesh, MeshBuilder, PBRMaterial, Color3, Scene, ShadowGenerator } from '@babylonjs/core';
import { GATE_LINE } from '../core/world/valley';
import { gateParts } from './valley_gate_parts';

export interface GateOptions {
  heightAt: (x: number, z: number) => number;
  shadow?: ShadowGenerator;
}

export function buildGate(scene: Scene, o: GateOptions): Mesh {
  const mat = new PBRMaterial('soldiers_gate_wood', scene);
  mat.albedoColor = new Color3(0.33, 0.24, 0.16);
  mat.roughness = 0.9;
  mat.metallic = 0;
  const boxes = gateParts(GATE_LINE, o.heightAt).map((p) => {
    const b = MeshBuilder.CreateBox(p.name, { width: p.w, height: p.h, depth: p.d }, scene);
    b.position.set(p.x, p.y + p.h / 2, p.z);
    b.rotation.y = p.yaw;
    b.material = mat;
    return b;
  });
  const merged = Mesh.MergeMeshes(boxes, true, true) as Mesh;
  merged.name = 'soldiers_gate';
  merged.receiveShadows = true;
  o.shadow?.addShadowCaster(merged);
  return merged;
}
