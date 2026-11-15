import { describe, expect, it } from 'vitest';
import { blocksHero, isWalkableGround, VALLEY_STOPS, walkSurfaceAt } from '../core/world/valley';
import { FLOCKS, FOX_SECRET, FOX_START, GEESE_PEN, MILL_CENTRE, GEESE_COUNT } from './wildlife';
import { VALLEY_PLACES } from '../core/world/valley_layout';

describe('wildlife placement', () => {
  it('the crows circle the Mill itself', () => {
    expect(MILL_CENTRE).toEqual({ x: VALLEY_PLACES.mill.x, z: VALLEY_PLACES.mill.z });
  });
  it('every flock sits on open walkable ground', () => {
    for (const f of FLOCKS) {
      expect(isWalkableGround(f.position.x, f.position.z), f.id).toBe(true);
      expect(blocksHero(f.position.x, f.position.z), f.id).toBe(false);
    }
  });
  it('the geese pen is inside the Mill site fence, on the water side of the Mill', () => {
    // The pen is 6 m by 6 m: the fence corners are at local r 15..21 and f 0..6 from the site frame origin.
    const originX = MILL_CENTRE.x, originZ = MILL_CENTRE.z + 10;
    expect(GEESE_PEN.x).toBeGreaterThanOrEqual(originX + 15);
    expect(GEESE_PEN.x).toBeLessThanOrEqual(originX + 21);
    expect(GEESE_PEN.z).toBeGreaterThanOrEqual(originZ - 6);
    expect(GEESE_PEN.z).toBeLessThanOrEqual(originZ);
    expect(GEESE_COUNT).toBeGreaterThan(0);
  });
  it('the fox belongs to the family_markers secret and starts within its appear radius on walkable ground', () => {
    const secret = VALLEY_STOPS.find(s => s.name === 'family_markers');
    expect(secret).toBeDefined();
    expect(FOX_SECRET).toEqual({ x: secret!.x, z: secret!.z });
    expect(Math.hypot(FOX_START.x - FOX_SECRET.x, FOX_START.z - FOX_SECRET.z)).toBeLessThan(18);
    expect(blocksHero(FOX_START.x, FOX_START.z)).toBe(false);
    expect(Number.isFinite(walkSurfaceAt(FOX_START.x, FOX_START.z))).toBe(true);
  });
});
