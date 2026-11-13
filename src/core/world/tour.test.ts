import { describe, expect, it } from 'vitest';
import { TOUR_VIEWS, nextTourIndex, tourIndexOf, tourYaw } from './tour';
import { blocksHero, isWalkableGround } from './valley';
import { valleyCameraPose } from './valley_camera';

describe('tour views', () => {
  it('every hero point stands on walkable, unblocked ground', () => {
    for (const v of TOUR_VIEWS) {
      expect(isWalkableGround(v.hero.x, v.hero.z), `${v.name} hero point is not walkable`).toBe(true);
      expect(blocksHero(v.hero.x, v.hero.z), `${v.name} hero point is blocked`).toBe(false);
    }
  });

  it('names are unique and every view has a clock hour in the day', () => {
    const names = TOUR_VIEWS.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length);
    for (const v of TOUR_VIEWS) expect(v.tod).toBeGreaterThanOrEqual(0);
    for (const v of TOUR_VIEWS) expect(v.tod).toBeLessThan(24);
  });

  it('stepping wraps at both ends', () => {
    expect(nextTourIndex(0, -1, 5)).toBe(4);
    expect(nextTourIndex(4, 1, 5)).toBe(0);
    expect(nextTourIndex(2, 3, 5)).toBe(0);
    expect(nextTourIndex(0, 1, 5)).toBe(1);
  });

  it('every view turns the hero to face its look point', () => {
    for (const v of TOUR_VIEWS) {
      const yaw = tourYaw(v);
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const lx = v.look.x - v.hero.x;
      const lz = v.look.z - v.hero.z;
      const len = Math.hypot(lx, lz);
      expect(fx * (lx / len) + fz * (lz / len), `${v.name} hero does not face its look point`).toBeCloseTo(1, 6);
    }
  });

  it('the tour camera sits behind the hero, so the model faces away from it', () => {
    const rig = { distance: 4, shoulder: 0.6, lookHeight: 1.6, clearance: 0.5 };
    for (const v of TOUR_VIEWS) {
      const yaw = tourYaw(v);
      // Camera yaw as tourTo sets it (lookAt uses the same angle); pitch 0, flat ground under the camera.
      const pose = valleyCameraPose({ x: v.hero.x, y: 0, z: v.hero.z }, yaw, 0, rig, () => 0);
      const cx = pose.position.x - v.hero.x;
      const cz = pose.position.z - v.hero.z;
      // Dot of camera offset with the hero's forward direction: negative means the camera is behind.
      const behind = cx * Math.sin(yaw) + cz * Math.cos(yaw);
      expect(behind, `${v.name}: camera is not behind the hero`).toBeLessThan(0);
      expect(Math.abs(behind + rig.distance), `${v.name}: camera is not at the tour distance`).toBeLessThan(1e-6);
    }
  });

  it('finds views by name', () => {
    expect(tourIndexOf('arrival')).toBe(0);
    expect(tourIndexOf('nope')).toBe(-1);
  });
});
