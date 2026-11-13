// The roads and paths of the valley, drawn as worn earth on the ground (Claude's; review 027). Before this, only
// Wick's lanes and the crossings had a surface: every road and path outside the village was plain grass, known
// to the rules (grading, walking, tree keep-out) and invisible to the eye.
//
// One mesh, one draw call. The strips sit on the ground as it is drawn (the 4 m terrain grid), not on the true
// height, so they never sink into a terrain triangle. Inside Wick the village's own lanes take over, and at the
// water the crossings do.
import { Color3, Mesh, Scene, StandardMaterial, VertexData } from '@babylonjs/core';
import { VALLEY_ROADS } from '../core/world/valley_layout';
import { WATER_LEVEL, insideWickBox, isRoadId, valleyHeightAt } from '../core/world/valley';
import { seededValue } from '../core/world/terrain';
import { VALLEY_SEED } from '../core/world/valley';
import { CHUNK_SIZE } from './valley_terrain';

export const ROADS = {
  /** Metres wide. Roads match the ford and the mill bridge (3.6); paths are one person wide. */
  roadWidth: 3.6,
  pathWidth: 1.5,
  /** Metres between cross-sections along the line. */
  step: 1,
  /** Height above the drawn ground. */
  lift: 0.1,
  /** Corners are rounded within this many metres of each bend. */
  cornerRadius: 7,
  /** The strip stops this far above the water: the crossing or the bank takes over. */
  bankClearance: 0.2,
  /** Edge width wanders by this share, so no road has a ruled edge. */
  wander: 0.22,
  /** The terrain grid the strips must sit on. */
  cell: CHUNK_SIZE / 16,
  road: new Color3(0.52, 0.43, 0.3),
  path: new Color3(0.47, 0.42, 0.28),
  /** The verge colour at the strip's edge: earth going over to grass. */
  verge: new Color3(0.4, 0.44, 0.24),
} as const;

type Height = (x: number, z: number) => number;

/** The ground as the terrain mesh draws it: flat triangles over a grid of `cell` metres, split on the b-c diagonal. */
export function drawnHeightAt(x: number, z: number, heightAt: Height = valleyHeightAt, cell: number = ROADS.cell): number {
  const i = Math.floor(x / cell), j = Math.floor(z / cell);
  const u = x / cell - i, v = z / cell - j;
  const x0 = i * cell, z0 = j * cell;
  const hb = heightAt(x0 + cell, z0), hc = heightAt(x0, z0 + cell);
  if (u + v <= 1) { const ha = heightAt(x0, z0); return ha + u * (hb - ha) + v * (hc - ha); }
  const hd = heightAt(x0 + cell, z0 + cell);
  return hd + (1 - u) * (hc - hd) + (1 - v) * (hb - hd);
}

/** Pure: a road's line with each bend rounded, sampled every `step` metres. */
export function roadLine(points: readonly { x: number; z: number }[], step: number = ROADS.step, radius: number = ROADS.cornerRadius): { x: number; z: number }[] {
  const fine: { x: number; z: number }[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const p = points[i], a = points[i - 1], b = points[i + 1];
    if (!b) { fine.push(p); break; }
    const la = Math.hypot(p.x - a.x, p.z - a.z), lb = Math.hypot(b.x - p.x, b.z - p.z);
    const r = Math.min(radius, la / 2, lb / 2);
    const s = { x: p.x + ((a.x - p.x) * r) / la, z: p.z + ((a.z - p.z) * r) / la };
    const e = { x: p.x + ((b.x - p.x) * r) / lb, z: p.z + ((b.z - p.z) * r) / lb };
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, m = 1 - t;
      fine.push({ x: m * m * s.x + 2 * m * t * p.x + t * t * e.x, z: m * m * s.z + 2 * m * t * p.z + t * t * e.z });
    }
  }
  const out: { x: number; z: number }[] = [fine[0]];
  for (let i = 1; i < fine.length; i++) {
    const a = fine[i - 1], b = fine[i], len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
  }
  return out;
}

/** Where a strip is not drawn: inside Wick (its lanes take over) and at the water (the crossings and banks do). */
export function roadHidden(x: number, z: number, heightAt: Height = valleyHeightAt): boolean {
  return insideWickBox(x, z) || heightAt(x, z) < WATER_LEVEL + ROADS.bankClearance;
}

/** Pure: every road and path as one mesh's vertex data. Four vertices across: verge, earth, earth, verge. */
export function roadsData(roads: Readonly<Record<string, readonly { x: number; z: number }[]>> = VALLEY_ROADS, heightAt: Height = valleyHeightAt) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [], normals: number[] = [];
  const strips: { id: string; width: number; from: number; to: number }[] = [];
  const across = [-0.5, -0.3, 0.3, 0.5];
  let roadIndex = 0;
  for (const [id, pts] of Object.entries(roads)) {
    const width = isRoadId(id) ? ROADS.roadWidth : ROADS.pathWidth;
    const earth = isRoadId(id) ? ROADS.road : ROADS.path;
    const line = roadLine(pts);
    const start = positions.length / 3;
    let prevDrawn = false;
    line.forEach((p, i) => {
      const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const nx = -(b.z - a.z) / len, nz = (b.x - a.x) / len;
      const drawn = !roadHidden(p.x, p.z, heightAt);
      const wob = 1 + (seededValue(VALLEY_SEED, roadIndex * 4099 + i, 0, 31) - 0.5) * 2 * ROADS.wander;
      const shade = 0.92 + 0.16 * seededValue(VALLEY_SEED, roadIndex * 4099 + i, 1, 31);
      const base = positions.length / 3;
      for (const t of across) {
        const x = p.x + nx * t * width * wob, z = p.z + nz * t * width * wob;
        positions.push(x, drawnHeightAt(x, z, heightAt) + ROADS.lift, z);
        const c = Math.abs(t) === 0.5 ? ROADS.verge : earth.scale(shade);
        colors.push(c.r, c.g, c.b, 1);
      }
      if (drawn && prevDrawn) for (let k = 0; k < 3; k++) {
        const q = base - 4 + k;
        indices.push(q, q + 4, q + 1, q + 1, q + 4, q + 5);
      }
      prevDrawn = drawn;
    });
    strips.push({ id, width, from: start, to: positions.length / 3 });
    roadIndex++;
  }
  VertexData.ComputeNormals(positions, indices, normals);
  // Lit as the ground is, whichever way a strip was wound.
  for (let i = 1; i < normals.length; i += 3) if (normals[i] < 0) { normals[i - 1] = -normals[i - 1]; normals[i] = -normals[i]; normals[i + 1] = -normals[i + 1]; }
  return { positions, colors, indices, normals, strips };
}

export function buildRoads(scene: Scene): Mesh {
  const d = roadsData();
  const mesh = new Mesh('valley_roads', scene);
  const vd = new VertexData();
  vd.positions = d.positions; vd.colors = d.colors; vd.indices = d.indices; vd.normals = d.normals;
  vd.applyToMesh(mesh);
  const mat = new StandardMaterial('valley_roads_mat', scene);
  mat.diffuseColor = Color3.White();
  mat.specularColor = Color3.Black();
  mat.backFaceCulling = false;
  mat.zOffset = -2; // wins against the ground it lies on, at any distance
  mesh.material = mat;
  mesh.useVertexColors = true;
  mesh.isPickable = false;
  mesh.receiveShadows = true;
  mesh.alwaysSelectAsActiveMesh = true;
  return mesh;
}
