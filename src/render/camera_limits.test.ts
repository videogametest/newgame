import { describe, expect, it } from 'vitest';
import { clampCameraHeight, insideBounds } from './camera_limits';

const BOUNDS = { halfWidth: 14, halfDepth: 16 };

describe('clampCameraHeight', () => {
  it('lifts a camera that would sit below the floor', () => {
    expect(clampCameraHeight(-0.5, 0.4)).toBe(0.4);
  });

  it('leaves a camera above the floor where it is', () => {
    expect(clampCameraHeight(1.7, 0.4)).toBe(1.7);
  });

  it('keeps a camera exactly on the floor', () => {
    expect(clampCameraHeight(0.4, 0.4)).toBe(0.4);
  });
});

describe('insideBounds', () => {
  it('is true inside and on the edge, false past it', () => {
    expect(insideBounds(0, 15.9, BOUNDS)).toBe(true);
    expect(insideBounds(0, 16, BOUNDS)).toBe(true);
    expect(insideBounds(0, 16.01, BOUNDS)).toBe(false);
    expect(insideBounds(-14.5, 0, BOUNDS)).toBe(false);
  });
});
