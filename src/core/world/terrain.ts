import { lerp } from '../vec';

/** Data supplied by the region author; no guessed Tallowmere layout. */
export interface TerrainShape {
  baseHeight: number;
  layers: readonly { wavelength: number; amplitude: number }[];
  /** Smooth raised hills or depressions, e.g. a lake basin. */
  features: readonly { x: number; z: number; radius: number; height: number }[];
}

/** Integer-coordinate hash, not gameplay tuning. Stable for negative coordinates too. */
export function seededValue(seed: number, x: number, z: number, channel = 0): number {
  let h = (seed | 0) ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(channel, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function noise(seed: number, x: number, z: number, channel: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const tx = smooth(x - ix);
  const tz = smooth(z - iz);
  return lerp(
    lerp(seededValue(seed, ix, iz, channel), seededValue(seed, ix + 1, iz, channel), tx),
    lerp(seededValue(seed, ix, iz + 1, channel), seededValue(seed, ix + 1, iz + 1, channel), tx),
    tz,
  ) * 2 - 1;
}

/** Bind the save/config seed once; simulation and rendering can share heightAt(x,z). */
export function createHeightAt(seed: number, shape: TerrainShape): (x: number, z: number) => number {
  if (!Number.isFinite(seed) || !Number.isFinite(shape.baseHeight)
    || shape.layers.some(l => !Number.isFinite(l.wavelength) || l.wavelength <= 0 || !Number.isFinite(l.amplitude))
    || shape.features.some(f => ![f.x, f.z, f.radius, f.height].every(Number.isFinite) || f.radius <= 0)) {
    throw new RangeError('Terrain requires finite values and positive wavelengths/radii');
  }
  // Snapshot inputs so later edits to config cannot change this sampler.
  const layers = shape.layers.map(l => ({ ...l }));
  const features = shape.features.map(f => ({ ...f }));
  const base = shape.baseHeight;
  return (x, z) => {
    let height = base;
    layers.forEach((layer, i) => {
      height += noise(seed, x / layer.wavelength, z / layer.wavelength, i) * layer.amplitude;
    });
    for (const feature of features) {
      const distance = Math.hypot(x - feature.x, z - feature.z) / feature.radius;
      if (distance < 1) height += feature.height * (1 - smooth(distance));
    }
    return height;
  };
}
