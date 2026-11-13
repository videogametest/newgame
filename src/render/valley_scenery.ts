// Draws the valley's trees and rocks (overnight item 9) from core's placements, one thin-instanced mesh per model.
// One thin-instanced mesh per model, all of its placements; Scenery is draw-only and casts no shadow
// (each shadow caster or per-band mesh adds draw calls; the frame budget is 300, see docs/status.md).
import { AssetContainer, Matrix, Mesh, Quaternion, SceneLoader, Scene, Vector3 } from '@babylonjs/core';
import { sceneryPlacements, SCENERY_MODELS, type SceneryModel, type ScenerySpot } from '../core/world/scenery';
import { assetUrl } from './assets';

const NATURE = 'assets/kaykit_medieval_hexagon/nature/';

export interface SceneryStats {
  placements: number;
  meshes: number;
}

/** Loads the scenery models from the KayKit pack and returns counts for the capture and PR notes. */
export async function buildScenery(scene: Scene): Promise<SceneryStats> {
  const spots = sceneryPlacements();
  let meshes = 0;
  for (const model of SCENERY_MODELS) {
    const own = spots.filter(s => s.model === model);
    if (own.length === 0) continue;
    const base = await sourceMesh(scene, model);
    base.isVisible = false;
    base.isPickable = false;
    const lift = base.getBoundingInfo().boundingBox.minimum.y;
    // One mesh per model: a per-band split cost about 130 draw calls in the arrival view (frame budget 300).
    const mesh = base.clone(`scenery_${model}`, null, false) as Mesh;
    mesh.isVisible = true;
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    mesh.thinInstanceSetBuffer('matrix', matricesFor(own, lift), 16, true);
    mesh.thinInstanceRefreshBoundingInfo(false);
    meshes++;
  }
  return { placements: spots.length, meshes };
}

/** One merged, origin-based mesh per model, with the pack's own material. */
async function sourceMesh(scene: Scene, model: SceneryModel): Promise<Mesh> {
  const url = assetUrl(`${NATURE}${model}.gltf`);
  const cut = url.lastIndexOf('/');
  const c: AssetContainer = await SceneLoader.LoadAssetContainerAsync(url.slice(0, cut + 1), url.slice(cut + 1), scene);
  const entries = c.instantiateModelsToScene((n) => `${model}_src_${n}`, false);
  const parts = entries.rootNodes.flatMap(n => [n, ...n.getChildMeshes(false)])
    .filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0);
  const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, true);
  if (!merged) throw new Error(`Scenery model ${model} has no geometry`);
  merged.name = `scenery_${model}`;
  merged.position.setAll(0);
  merged.rotation.setAll(0);
  merged.scaling.setAll(1);
  return merged;
}

/** World matrices for each placement; y is lifted by the model's lowest point so roots sit on the ground. */
function matricesFor(list: readonly ScenerySpot[], lift: number): Float32Array {
  const out = new Float32Array(list.length * 16);
  list.forEach((s, i) => {
    const m = Matrix.Compose(
      new Vector3(s.scale, s.scale, s.scale),
      Quaternion.RotationAxis(Vector3.Up(), s.yaw),
      new Vector3(s.x, s.y - lift * s.scale, s.z),
    );
    out.set(m.m, i * 16);
  });
  return out;
}
