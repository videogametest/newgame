// Parts on the same rig and identity local transform can share a draw. Never merge rigs or moving mounts.
import { Mesh, TransformNode } from '@babylonjs/core';
export function batchCharacterBody(root: TransformNode): void {
  const groups: Mesh[][] = [];
  for (const part of root.getChildMeshes(false)) {
    if (!(part instanceof Mesh) || !part.skeleton || !part.material || !part.isEnabled() || !part.getTotalVertices() || part.getChildren().length) continue;
    part.computeWorldMatrix(true);
    const q = part.rotationQuaternion;
    if (!part.position.equalsToFloats(0, 0, 0) || !part.scaling.equalsToFloats(1, 1, 1) || !part.rotation.equalsToFloats(0, 0, 0) || (q && (q.x !== 0 || q.y !== 0 || q.z !== 0 || q.w !== 1))) continue;
    const group = groups.find(g => g[0].parent === part.parent && g[0].skeleton === part.skeleton && g[0].material === part.material && g[0].sideOrientation === part.sideOrientation && g[0].numBoneInfluencers === part.numBoneInfluencers);
    if (group) group.push(part); else groups.push([part]);
  }
  for (const group of groups) {
    if (group.length < 2) continue;
    const first = group[0], parent = first.parent;
    // MergeMeshes bakes world matrices. Remove the common parent so bind-space vertices remain bind-space.
    for (const m of group) { m.parent = null; m.computeWorldMatrix(true); }
    const merged = Mesh.MergeMeshes(group, false, true);
    for (const m of group) m.parent = parent;
    if (!merged) continue;
    merged.name = `${root.name}_body`;
    merged.parent = parent;
    merged.skeleton = first.skeleton;
    merged.numBoneInfluencers = first.numBoneInfluencers;
    merged.sideOrientation = first.sideOrientation;
    for (const m of group) m.dispose(true, false);
  }
}
