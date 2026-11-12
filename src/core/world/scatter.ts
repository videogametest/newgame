import type { Vec2 } from '../types';
import { clamp, lerp } from '../vec';
import { chunkBounds, chunkKey, type ChunkCoord } from './chunks';
import { seededValue } from './terrain';

/** Roads use capsules; water/places may use circles or axis-aligned rectangles. */
export type ExclusionZone =
  | { kind: 'circle'; centre: Vec2; radius: number }
  | { kind: 'rectangle'; minX: number; minZ: number; maxX: number; maxZ: number }
  | { kind: 'road'; from: Vec2; to: Vec2; halfWidth: number };

export interface ScatterRule {
  id: string;
  kind: 'tree' | 'rock' | 'prop';
  /** Unique integer salt keeps each rule independent of rule ordering. */
  salt: number;
  attempts: number;
  biomes: readonly string[];
  scale: readonly [number, number];
  clearance: number;
}

export interface ScatterPlacement extends Vec2 {
  id: string;
  ruleId: string;
  kind: ScatterRule['kind'];
  y: number;
  yaw: number;
  scale: number;
}

export function isExcluded(point: Vec2, zones: readonly ExclusionZone[], clearance = 0): boolean {
  return zones.some(zone => {
    if (zone.kind === 'circle') return Math.hypot(point.x - zone.centre.x, point.z - zone.centre.z) <= zone.radius + clearance;
    if (zone.kind === 'rectangle') {
      const dx = Math.max(zone.minX - point.x, 0, point.x - zone.maxX);
      const dz = Math.max(zone.minZ - point.z, 0, point.z - zone.maxZ);
      return Math.hypot(dx, dz) <= clearance;
    }
    const dx = zone.to.x - zone.from.x;
    const dz = zone.to.z - zone.from.z;
    const lengthSq = dx * dx + dz * dz;
    const t = lengthSq === 0 ? 0 : clamp(((point.x - zone.from.x) * dx + (point.z - zone.from.z) * dz) / lengthSq, 0, 1);
    return Math.hypot(point.x - lerp(zone.from.x, zone.to.x, t), point.z - lerp(zone.from.z, zone.to.z, t)) <= zone.halfWidth + clearance;
  });
}

/** Candidates are a pure function of seed/chunk/rule/index. Load order has no influence.
 * This is rejection sampling, not a promise of exact density or non-overlapping scenery.
 */
export function scatterChunk(
  seed: number, chunk: ChunkCoord, size: number, rules: readonly ScatterRule[],
  zones: readonly ExclusionZone[], biomeAt: (x: number, z: number) => string,
  heightAt: (x: number, z: number) => number,
): ScatterPlacement[] {
  const bounds = chunkBounds(chunk, size);
  if (new Set(rules.map(r => r.id)).size !== rules.length || new Set(rules.map(r => r.salt)).size !== rules.length) {
    throw new RangeError('Scatter rule ids and salts must be unique');
  }
  const result: ScatterPlacement[] = [];
  for (const rule of [...rules].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    if (!Number.isSafeInteger(rule.attempts) || rule.attempts < 0 || !Number.isSafeInteger(rule.salt)
      || !Number.isFinite(rule.clearance) || rule.clearance < 0
      || !rule.scale.every(Number.isFinite) || rule.scale[0] <= 0 || rule.scale[1] < rule.scale[0]) {
      throw new RangeError('Invalid scatter rule');
    }
    for (let i = 0; i < rule.attempts; i++) {
      const random = (channel: number) => seededValue(
        seed ^ Math.imul(rule.salt, 2654435761), chunk.x, chunk.z, i * 4 + channel,
      );
      const x = lerp(bounds.minX, bounds.maxX, random(0));
      const z = lerp(bounds.minZ, bounds.maxZ, random(1));
      if (!rule.biomes.includes(biomeAt(x, z)) || isExcluded({ x, z }, zones, rule.clearance)) continue;
      result.push({
        id: `${chunkKey(chunk)}:${rule.id}:${i}`, ruleId: rule.id, kind: rule.kind,
        x, z, y: heightAt(x, z), yaw: random(2) * Math.PI * 2,
        scale: lerp(rule.scale[0], rule.scale[1], random(3)),
      });
    }
  }
  return result;
}
