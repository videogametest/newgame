import { describe, expect, it } from 'vitest';
import { aimAngles, valleyCameraPose, type ValleyCameraRig } from './valley_camera';

const RIG: ValleyCameraRig = { distance: 4.6, shoulder: 0.9, lookHeight: 1.5, clearance: 0.6 };
const flat = (): number => 0;

describe('valleyCameraPose', () => {
  it('sits behind and beside the hero on flat ground, looking along the aim', () => {
    const pose = valleyCameraPose({ x: 0, z: 0 }, 0, 0, RIG, flat);
    // yaw 0 looks along +z, so the camera is at z = -distance; right is +x, so shoulder pushes +x.
    expect(pose.position.x).toBeCloseTo(RIG.shoulder, 6);
    expect(pose.position.z).toBeCloseTo(-RIG.distance, 6);
    expect(pose.position.y).toBeCloseTo(RIG.lookHeight, 6);
    expect(pose.target.z - pose.position.z).toBeCloseTo(1, 6);
  });

  it('keeps the camera at least clearance above rising ground under it', () => {
    // A hill right behind the hero: the camera would be inside it without the clamp.
    const hill = (_x: number, z: number): number => (z < -3 ? 9 : 0);
    const pose = valleyCameraPose({ x: 0, z: 0 }, 0, 0, RIG, hill);
    expect(pose.position.y).toBeGreaterThanOrEqual(9 + RIG.clearance - 1e-9);
  });

  it('follows the hero height so a camera on a slope keeps its look point above the feet', () => {
    const low = valleyCameraPose({ x: 0, z: 0, y: 0 }, 0, 0, RIG, flat);
    const high = valleyCameraPose({ x: 0, z: 0, y: 20 }, 0, 0, RIG, () => 20);
    expect(high.position.y - low.position.y).toBeCloseTo(20, 6);
  });

  it('target stays on the crosshair ray from the clamped position', () => {
    const hill = (_x: number, z: number): number => (z < -3 ? 9 : 0);
    const pose = valleyCameraPose({ x: 0, z: 0 }, 0.4, 0.2, RIG, hill);
    const dx = pose.target.x - pose.position.x;
    const dy = pose.target.y - pose.position.y;
    const dz = pose.target.z - pose.position.z;
    expect(Math.hypot(dx, dy, dz)).toBeCloseTo(1, 6);
    expect(dy / Math.hypot(dx, dy, dz)).toBeCloseTo(Math.sin(0.2), 6);
  });
});

describe('aimAngles', () => {
  it('recovers the yaw and pitch that valleyCameraPose uses for a direction', () => {
    const dirs = [
      { x: 0.6, y: 0.5, z: -0.3 },
      { x: -0.2, y: 0.9, z: 0.4 },
      { x: 0.1, y: -0.4, z: 0.8 },
    ];
    for (const d of dirs) {
      const a = aimAngles(d);
      const len = Math.hypot(d.x, d.y, d.z);
      const cp = Math.cos(a.pitch);
      expect(Math.sin(a.yaw) * cp).toBeCloseTo(d.x / len, 6);
      expect(Math.sin(a.pitch)).toBeCloseTo(d.y / len, 6);
      expect(Math.cos(a.yaw) * cp).toBeCloseTo(d.z / len, 6);
    }
  });

  it('is finite for a zero vector', () => {
    const a = aimAngles({ x: 0, y: 0, z: 0 });
    expect(Number.isFinite(a.yaw) && Number.isFinite(a.pitch)).toBe(true);
  });
});
