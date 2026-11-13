// Draws the ford, the mill bridge and the stepping stones (review 025 item 2) from valley_crossings_parts.ts: one
// merged mesh per box material (the village's wood and stone colours), and the ford as one ribbon of gravel and
// worn earth (review 027 item 2). Shadows fall from the decks and stones.
import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, ShadowGenerator, StandardMaterial, VertexData } from '@babylonjs/core';
import { valleyHeightAt, walkSurfaceAt, WATER_LEVEL } from '../core/world/valley';
import { crossingParts, fordRibbon, type CrossingMaterial, type CrossingPart } from './valley_crossings_parts';

const COLOURS: Record<CrossingMaterial, Color3> = {
  wood: new Color3(0.33, 0.24, 0.16),
  stone: new Color3(0.5, 0.48, 0.44),
};

export interface CrossingsOptions {
  shadow?: ShadowGenerator;
}

/** Builds every crossing's parts and returns the merged meshes, one per box material, then the ford's ribbon. */
export function buildCrossings(scene: Scene, o: CrossingsOptions = {}): Mesh[] {
  const parts = crossingParts(valleyHeightAt, walkSurfaceAt, WATER_LEVEL);
  const meshes: Mesh[] = [];
  for (const material of Object.keys(COLOURS) as CrossingMaterial[]) {
    const own = parts.filter((p) => p.material === material);
    if (own.length === 0) continue;
    meshes.push(mergeOf(scene, material, own, o));
  }
  meshes.push(buildFord(scene));
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
  o.shadow?.addShadowCaster(merged);
  return merged;
}

/** The ford: one vertex-coloured ribbon, drawn the way valley_roads.ts draws the road it continues. */
function buildFord(scene: Scene): Mesh {
  const r = fordRibbon(valleyHeightAt);
  const normals: number[] = [];
  VertexData.ComputeNormals(r.positions, r.indices, normals);
  // Lit as the ground is, whichever way the ribbon was wound.
  for (let i = 1; i < normals.length; i += 3) {
    if (normals[i] < 0) { normals[i - 1] = -normals[i - 1]; normals[i] = -normals[i]; normals[i + 1] = -normals[i + 1]; }
  }
  const mesh = new Mesh('crossing_ford', scene);
  const vd = new VertexData();
  vd.positions = r.positions; vd.colors = r.colors; vd.indices = r.indices; vd.normals = normals;
  vd.applyToMesh(mesh);
  const mat = new StandardMaterial('crossing_ford_mat', scene);
  mat.diffuseColor = Color3.White();
  mat.specularColor = Color3.Black();
  mat.backFaceCulling = false;
  mat.zOffset = -2; // wins against the ground under it, as the road strips do
  mesh.material = mat;
  mesh.useVertexColors = true;
  mesh.isPickable = false;
  mesh.receiveShadows = true;
  return mesh;
}
