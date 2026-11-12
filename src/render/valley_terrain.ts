// Valley ground: square chunks built from the pure height function, streamed around the hero.
// Normals come from the same height function (finite difference), so neighbouring chunks meet without seams.

import { Color3, Mesh, Scene, StandardMaterial, VertexData } from '@babylonjs/core';
import { WATER_LEVEL, VALLEY_HALF_EXTENT, VALLEY_SEED, valleyHeightAt } from '../core/world/valley';
import { chunkBounds, chunkKey, chunksWithinRadius, diffChunks, type ChunkCoord } from '../core/world/chunks';
import { seededValue } from '../core/world/terrain';
import { clamp01, mix } from './lighting';

export const CHUNK_SIZE = 64;
const CELLS = 16;
const CELL = CHUNK_SIZE / CELLS;
/** Chunks whose centre is inside this radius (m) of the hero are kept loaded. */
const STREAM_RADIUS = 340;
/** At most this many chunks are built per frame, so a fast walk does not hitch. */
const BUILDS_PER_FRAME = 2;

const SAND = new Color3(0.78, 0.7, 0.5);
const MUD = new Color3(0.38, 0.32, 0.22);
const GRASS = new Color3(0.36, 0.5, 0.22);
const DRY_GRASS = new Color3(0.5, 0.5, 0.28);
const ROCK = new Color3(0.46, 0.44, 0.41);

export interface ChunkMeshData {
  positions: number[];
  normals: number[];
  colors: number[];
  indices: number[];
}

/** Ground colour for one vertex: sand and mud at the shore, rock on steep faces, grass elsewhere. */
export function groundColor(x: number, z: number, height: number, normalY: number): Color3 {
  const shore = clamp01((height - WATER_LEVEL) / 2.5);
  const lowland = mix(SAND, MUD, clamp01((height - WATER_LEVEL - 1.2) / 2));
  const grassy = mix(GRASS, DRY_GRASS, clamp01((height - 26) / 14));
  const flat = mix(lowland, grassy, shore);
  const steep = clamp01((normalY - 0.8) / 0.1);
  const variation = 0.9 + 0.2 * seededValue(VALLEY_SEED, Math.floor(x / 3), Math.floor(z / 3), 7);
  return mix(ROCK, flat, steep).scale(variation);
}

/** Pure mesh data for one chunk: a (CELLS+1)^2 grid of vertices, two triangles per cell. */
export function buildChunkMesh(chunk: ChunkCoord, heightAt: (x: number, z: number) => number = valleyHeightAt): ChunkMeshData {
  const b = chunkBounds(chunk, CHUNK_SIZE);
  const n = CELLS + 1;
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const e = 0.5;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = b.minX + i * CELL;
      const z = b.minZ + j * CELL;
      const h = heightAt(x, z);
      const gx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
      const gz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
      const len = Math.hypot(gx, 1, gz);
      const nx = -gx / len;
      const ny = 1 / len;
      const nz = -gz / len;
      positions.push(x, h, z);
      normals.push(nx, ny, nz);
      const c = groundColor(x, z, h, ny);
      colors.push(c.r, c.g, c.b, 1);
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < CELLS; j++) {
    for (let i = 0; i < CELLS; i++) {
      const a = j * n + i;
      const bIdx = a + 1;
      const c = a + n;
      const d = c + 1;
      indices.push(a, c, bIdx, bIdx, c, d);
    }
  }
  return { positions, normals, colors, indices };
}

/** A chunk is kept only if it overlaps the valley. Outside the valley is never walked, so never built. */
export function chunkInValley(chunk: ChunkCoord): boolean {
  const b = chunkBounds(chunk, CHUNK_SIZE);
  return b.minX < VALLEY_HALF_EXTENT && b.maxX > -VALLEY_HALF_EXTENT
    && b.minZ < VALLEY_HALF_EXTENT && b.maxZ > -VALLEY_HALF_EXTENT;
}

/** Streams chunk meshes around the hero. Builds at most a few per frame, nearest first. */
export class ValleyTerrain {
  private readonly loaded = new Map<string, Mesh>();
  private readonly material: StandardMaterial;
  private builtThisRun = 0;

  constructor(private readonly scene: Scene) {
    const mat = new StandardMaterial('valley_ground_mat', scene);
    mat.diffuseColor = Color3.White();
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    this.material = mat;
  }

  /** Call once per frame with the hero's ground position. */
  update(hero: { x: number; z: number }): void {
    const desired = chunksWithinRadius(hero, STREAM_RADIUS, CHUNK_SIZE).filter(chunkInValley);
    const wanted = new Map(desired.map((c) => [chunkKey(c), c] as const));
    const diff = diffChunks(new Set(this.loaded.keys()), desired);
    for (const key of diff.unload) {
      this.loaded.get(key)?.dispose();
      this.loaded.delete(key);
    }
    const nearest = diff.load
      .map((key) => wanted.get(key))
      .filter((c): c is ChunkCoord => c !== undefined)
      .sort((a, b) => dist2(a, hero) - dist2(b, hero));
    for (const chunk of nearest.slice(0, BUILDS_PER_FRAME)) this.build(chunk);
  }

  get chunkCount(): number {
    return this.loaded.size;
  }

  /** Chunks built since start. Used by the capture hooks to confirm streaming. */
  get buildCount(): number {
    return this.builtThisRun;
  }

  private build(chunk: ChunkCoord): void {
    const data = buildChunkMesh(chunk);
    const mesh = new Mesh(`valley_ground_${chunk.x}_${chunk.z}`, this.scene);
    const vd = new VertexData();
    vd.positions = data.positions;
    vd.normals = data.normals;
    vd.colors = data.colors;
    vd.indices = data.indices;
    vd.applyToMesh(mesh);
    mesh.useVertexColors = true;
    mesh.material = this.material;
    mesh.receiveShadows = true;
    mesh.isPickable = false;
    mesh.refreshBoundingInfo({ applySkeleton: false, applyMorph: false });
    this.loaded.set(chunkKey(chunk), mesh);
    this.builtThisRun++;
  }

  dispose(): void {
    for (const m of this.loaded.values()) m.dispose();
    this.loaded.clear();
    this.material.dispose();
  }
}

function dist2(c: ChunkCoord, hero: { x: number; z: number }): number {
  const cx = (c.x + 0.5) * CHUNK_SIZE - hero.x;
  const cz = (c.z + 0.5) * CHUNK_SIZE - hero.z;
  return cx * cx + cz * cz;
}

