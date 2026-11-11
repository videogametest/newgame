import { describe, expect, it } from 'vitest';
import { clampCameraHeight } from './camera_limits';

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
