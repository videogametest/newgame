// Review 026 item 3: scenery keeps out of the Mill and the Forge (30 m) and the Watch-house yard (26 m).
import { describe, expect, it } from 'vitest';
import { VALLEY_PLACES } from './valley';
import { LANDMARK_CLEAR, sceneryPlacements } from './scenery';

describe('scenery keeps clear of the built-up places', () => {
  const spots = sceneryPlacements();
  for (const name of ['mill', 'forge', 'watchHouse'] as const) {
    it(`nothing is placed within ${LANDMARK_CLEAR[name]} m of ${name}`, () => {
      const p = VALLEY_PLACES[name];
      const r = LANDMARK_CLEAR[name];
      const close = spots.filter((s) => Math.hypot(s.x - p.x, s.z - p.z) < r);
      expect(close.map((s) => `${s.id ?? s.model} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`)).toEqual([]);
    });
  }
});
