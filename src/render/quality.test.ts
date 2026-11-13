import { describe, expect, it } from 'vitest';
import { isPowerOfTwo, QUALITY_PROFILES, qualityProfile } from './quality';

describe('quality profiles', () => {
  it('medium is the valley as it has always been: 2048 shadow map, 340 m stream radius', () => {
    expect(qualityProfile('medium')).toEqual({ shadowMapSize: 2048, streamRadius: 340 });
  });

  it('low is cheaper than medium and high is no cheaper than medium', () => {
    const low = qualityProfile('low');
    const medium = qualityProfile('medium');
    const high = qualityProfile('high');
    expect(low.shadowMapSize).toBeLessThan(medium.shadowMapSize);
    expect(low.streamRadius).toBeLessThan(medium.streamRadius);
    expect(high.shadowMapSize).toBeGreaterThanOrEqual(medium.shadowMapSize);
    expect(high.streamRadius).toBeGreaterThanOrEqual(medium.streamRadius);
  });

  it('every shadow map size is a power of two', () => {
    for (const p of Object.values(QUALITY_PROFILES)) expect(isPowerOfTwo(p.shadowMapSize)).toBe(true);
  });

  it('an unknown quality falls back to medium rather than throwing', () => {
    expect(qualityProfile('ultra' as never)).toEqual(QUALITY_PROFILES.medium);
  });
});

describe('isPowerOfTwo', () => {
  it('accepts powers of two and rejects others', () => {
    expect([1, 2, 1024, 2048].every(isPowerOfTwo)).toBe(true);
    expect([0, 3, 1000, -4].some(isPowerOfTwo)).toBe(false);
  });
});
