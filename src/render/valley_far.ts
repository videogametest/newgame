// The whole valley as one coarse mesh, always drawn (Claude's; review 023). The near land streams in as fine
// chunks around the hero; without this, everything past the stream radius is a hole, and Wick, the lake, and the
// far rim float over nothing in the arrival view. It sits a little below the true ground so the fine chunks
// always cover it where they exist.
import { Color3, Mesh, Scene, StandardMaterial, VertexData } from '@babylonjs/core';
import { VALLEY_HALF_EXTENT, valleyHeightAt } from '../core/world/valley';
import { groundColor } from './valley_terrain';

export const FAR_LAND = {
  /** Metres between samples. 8 m over 800 m is 100 by 100 cells: 20,000 triangles, one draw call. */
  cell: 8,
  /** How far below the true ground it sits. */
  drop: 0.5,
} as const;

/** Pure: the far land's vertex data. */
export function farLandData(heightAt: (x: number, z: number) => number = valleyHeightAt, half: number = VALLEY_HALF_EXTENT, cell: number = FAR_LAND.cell) {
  const n = Math.round((half * 2) / cell) + 1;
  const positions: number[] = [], colors: number[] = [], indices: number[] = [], normals: number[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -half + i * cell, z = -half + j * cell, h = heightAt(x, z);
    const ny = 1 / Math.hypot(1, (heightAt(x + 1, z) - heightAt(x - 1, z)) / 2, (heightAt(x, z + 1) - heightAt(x, z - 1)) / 2);
    positions.push(x, h - FAR_LAND.drop, z);
    const c = groundColor(x, z, h, ny);
    colors.push(c.r, c.g, c.b, 1);
  }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i;
    indices.push(a, a + 1, a + n, a + 1, a + n + 1, a + n);
  }
  VertexData.ComputeNormals(positions, indices, normals);
  return { positions, colors, indices, normals, side: n };
}

export function buildFarLand(scene: Scene): Mesh {
  const d = farLandData();
  const mesh = new Mesh('valley_far_land', scene);
  const vd = new VertexData();
  vd.positions = d.positions; vd.colors = d.colors; vd.indices = d.indices; vd.normals = d.normals;
  vd.applyToMesh(mesh);
  const mat = new StandardMaterial('valley_far_land_mat', scene);
  mat.diffuseColor = Color3.White();
  mat.specularColor = Color3.Black();
  mat.backFaceCulling = false;
  mesh.material = mat;
  mesh.useVertexColors = true;
  mesh.isPickable = false;
  mesh.receiveShadows = false;
  mesh.alwaysSelectAsActiveMesh = true;
  return mesh;
}
