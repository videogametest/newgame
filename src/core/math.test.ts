import { describe, expect, it } from 'vitest';
import { clamp, facingOf, lerp } from './math';

describe('math helpers', () => {
  it('clamp keeps values in range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
  it('lerp interpolates', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });
  it('facingOf uses the fallback for zero', () => {
    expect(facingOf(4)).toBe(1);
    expect(facingOf(-4)).toBe(-1);
    expect(facingOf(0, -1)).toBe(-1);
  });
});
