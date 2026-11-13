// Quality levels (task 009 step 2c). Pure: the numbers the renderer reads when it starts. Shadow map size and the
// terrain stream radius take effect on the next start, not live; the settings page says so.
// Medium is what the valley has always used, so the default look does not change.

import type { Quality } from '../core/settings/settings';

export interface QualityProfile {
  /** Shadow map edge in texels. */
  shadowMapSize: number;
  /** Terrain chunks whose centre is within this many metres of the hero stay loaded. */
  streamRadius: number;
}

export const QUALITY_PROFILES: Record<Quality, QualityProfile> = {
  low: { shadowMapSize: 1024, streamRadius: 220 },
  medium: { shadowMapSize: 2048, streamRadius: 340 },
  high: { shadowMapSize: 2048, streamRadius: 420 },
};

export function qualityProfile(quality: Quality): QualityProfile {
  return QUALITY_PROFILES[quality] ?? QUALITY_PROFILES.medium;
}

/** Shadow map sizes Babylon accepts here: a power of two. Used by tests to keep the table honest. */
export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}
