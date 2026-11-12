import type { Vec2 } from '../types';

export interface ChunkCoord { x: number; z: number }
export interface ChunkBounds { minX: number; minZ: number; maxX: number; maxZ: number }

function positiveSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) throw new RangeError('Chunk size must be positive and finite');
}

export function chunkAt(position: Vec2, size: number): ChunkCoord {
  positiveSize(size);
  return { x: Math.floor(position.x / size), z: Math.floor(position.z / size) };
}

export function chunkKey(chunk: ChunkCoord): string {
  return `${chunk.x},${chunk.z}`;
}

/** Half-open bounds: a point on maxX/maxZ belongs to the next chunk. */
export function chunkBounds(chunk: ChunkCoord, size: number): ChunkBounds {
  positiveSize(size);
  return { minX: chunk.x * size, minZ: chunk.z * size, maxX: (chunk.x + 1) * size, maxZ: (chunk.z + 1) * size };
}

/** Every chunk intersecting the closed world-space radius, not just centre samples. */
export function chunksWithinRadius(hero: Vec2, radius: number, size: number): ChunkCoord[] {
  positiveSize(size);
  if (!Number.isFinite(radius) || radius < 0) throw new RangeError('Radius must be finite and nonnegative');
  if (![hero.x, hero.z].every(Number.isFinite)) throw new RangeError('Hero position must be finite');
  if (radius === 0) return [chunkAt(hero, size)];
  const chunks: ChunkCoord[] = [];
  for (let z = Math.ceil((hero.z - radius) / size) - 1; z <= Math.floor((hero.z + radius) / size); z++) {
    for (let x = Math.ceil((hero.x - radius) / size) - 1; x <= Math.floor((hero.x + radius) / size); x++) {
      const bounds = chunkBounds({ x, z }, size);
      const dx = Math.max(bounds.minX - hero.x, 0, hero.x - bounds.maxX);
      const dz = Math.max(bounds.minZ - hero.z, 0, hero.z - bounds.maxZ);
      if (dx * dx + dz * dz <= radius * radius) chunks.push({ x, z });
    }
  }
  return chunks;
}

/** No mutation; caller owns loading, rendering and persistent object state. */
export function diffChunks(loaded: ReadonlySet<string>, desired: readonly ChunkCoord[]): {
  load: string[]; unload: string[];
} {
  const wanted = new Set(desired.map(chunkKey));
  return {
    load: [...wanted].filter(key => !loaded.has(key)).sort(),
    unload: [...loaded].filter(key => !wanted.has(key)).sort(),
  };
}
