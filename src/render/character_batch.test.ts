import { afterEach, describe, expect, it } from 'vitest';
import { Bone, Matrix, Mesh, MeshBuilder, NullEngine, Scene, Skeleton, StandardMaterial, TransformNode, Vector3, VertexBuffer } from '@babylonjs/core';
import { batchCharacterBody } from './character_batch';
const engines: NullEngine[] = [];
afterEach(() => { for (const e of engines.splice(0)) e.dispose(); });
function fixture() {
  const engine = new NullEngine(); engines.push(engine);
  const scene = new Scene(engine), root = new TransformNode('fighter', scene), model = new TransformNode('model', scene);
  model.parent = root; model.scaling.z = -1; root.position.set(100, 8, -30); root.rotation.y = 0.7;
  const skeleton = new Skeleton('rig', 'rig', scene), bone = new Bone('bone', skeleton, null, Matrix.Identity());
  const mat = new StandardMaterial('atlas', scene);
  const parts = [0, 1, 2].map(i => {
    const mesh = MeshBuilder.CreateBox(`part${i}`, {}, scene); mesh.parent = model;
    mesh.material = mat; mesh.skeleton = skeleton;
    mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, new Float32Array(mesh.getTotalVertices() * 4));
    mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, Array.from({ length: mesh.getTotalVertices() * 4 }, (_, j) => j % 4 === 0 ? 1 : 0));
    return mesh;
  });
  return { scene, root, model, skeleton, bone, parts };
}
describe('defender body batching', () => {
  it('retains every skinned vertex, rig, parent transform and animated pose', () => {
    const { root, model, skeleton, bone, parts } = fixture();
    bone.setPosition(new Vector3(0, 0.4, 0)); skeleton.prepare(true);
    const before = parts.flatMap(m => [...m.getPositionData(true)!]);
    const count = parts.reduce((n, m) => n + m.getTotalIndices(), 0);
    batchCharacterBody(root);
    const meshes = root.getChildMeshes(false) as Mesh[];
    expect(meshes).toHaveLength(1);
    const merged = meshes[0];
    expect(merged.skeleton).toBe(skeleton); expect(merged.parent).toBe(model);
    expect(merged.getTotalIndices()).toBe(count);
    expect([...merged.getPositionData(true)!]).toEqual(before);
    bone.setPosition(new Vector3(0, 1.2, 0)); skeleton.prepare(true);
    const after = [...merged.getPositionData(true)!];
    for (let i = 1; i < after.length; i += 3) expect(after[i] - before[i]).toBeCloseTo(0.8);
  });
  it('never joins hidden parts, other rigs, other materials or transformed mounts', () => {
    const { root, scene, parts } = fixture();
    parts[0].setEnabled(false); parts[1].position.x = 1;
    const other = MeshBuilder.CreateBox('other', {}, scene); other.parent = root; other.material = parts[2].material;
    other.skeleton = new Skeleton('other', 'other', scene);
    batchCharacterBody(root);
    expect(root.getChildMeshes(false)).toHaveLength(4);
    expect(parts[0].isEnabled()).toBe(false);
  });
});
