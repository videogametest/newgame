// Draws the ford, the mill bridge and the stepping stones (review 025 item 2) from valley_crossings_parts.ts: one
// merged mesh per material, the village's wood and stone colours. Shadows fall from the decks and stones.
import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, ShadowGenerator } from '@babylonjs/core';
import { valleyHeightAt, walkSurfaceAt, WATER_LEVEL } from '../core/world/valley';
import { crossingParts, type CrossingMaterial, type CrossingPart } from './valley_crossings_parts';

const COLOURS: Record<CrossingMaterial, Color3> = {
  wood: new Color3(0.33, 0.24, 0.16),
  stone: new Color3(0.5, 0.48, 0.44),
  gravel: new Color3(0.5, 0.46, 0.4),
};

export interface CrossingsOptions {
  shadow?: ShadowGenerator;
}

/** Builds every crossing's parts and returns the merged meshes, one per material. */
export function buildCrossings(scene: Scene, o: CrossingsOptions = {}): Mesh[] {
  const parts = crossingParts(valleyHeightAt, walkSurfaceAt, WATER_LEVEL);
  const meshes: Mesh[] = [];
  for (const material of Object.keys(COLOURS) as CrossingMaterial[]) {
    const own = parts.filter((p) => p.material === material);
    if (own.length === 0) continue;
    meshes.push(mergeOf(scene, material, own, o));
  }
  return meshes;
}

function mergeOf(scene: Scene, material: CrossingMaterial, own: readonly CrossingPart[], o: CrossingsOptions): Mesh {
  const mat = new PBRMaterial(`crossing_${material}`, scene);
  mat.albedoColor = COLOURS[material];
  mat.roughness = material === 'wood' ? 0.95 : 0.9;
  mat.metallic = 0;
  const boxes = own.map((p) => {
    const b = MeshBuilder.CreateBox(p.name, { width: p.w, height: p.h, depth: p.d }, scene);
    b.position.set(p.x, p.y + p.h / 2, p.z);
    b.rotation.y = p.yaw;
    b.material = mat;
    return b;
  });
  const merged = Mesh.MergeMeshes(boxes, true, true) as Mesh;
  merged.name = `crossing_${material}s`;
  merged.receiveShadows = true;
  if (material !== 'gravel') o.shadow?.addShadowCaster(merged);
  return merged;
}
