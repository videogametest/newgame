import { describe, expect, it } from 'vitest';
import { angleDelta, clamp, forwardOf, rightOf, yawOf } from './vec';

describe('vec', () => {
  it('yaw 0 faces +z and its right is +x', () => {
    const f = forwardOf(0);
    const r = rightOf(0);
    expect(f.x).toBeCloseTo(0);
    expect(f.z).toBeCloseTo(1);
    expect(r.x).toBeCloseTo(1);
    expect(r.z).toBeCloseTo(0);
  });

  it('yawOf inverts forwardOf', () => {
    for (const y of [-2.5, -1, 0, 0.7, 2, 3]) {
      const f = forwardOf(y);
      expect(yawOf(f.x, f.z)).toBeCloseTo(y);
    }
  });

  it('angleDelta wraps to the shortest signed difference', () => {
    expect(angleDelta(0, 0.3)).toBeCloseTo(0.3);
    expect(angleDelta(0, 2 * Math.PI - 0.1)).toBeCloseTo(-0.1);
    expect(angleDelta(3.1, -3.1)).toBeCloseTo(2 * Math.PI - 6.2);
  });

  it('clamp bounds a value', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });
});
