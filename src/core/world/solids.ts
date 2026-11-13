// Solid footprints on the ground: buildings and the well, which the hero walks around (overnight item 6).
// Pure: no Babylon imports. A footprint is a square on the ground, turned by a compass bearing.

export interface Footprint {
  /** Centre (m). */
  x: number;
  z: number;
  /** Compass bearing (degrees): 0 north (-z), 90 east (+x). The square is turned by this. */
  facing: number;
  /** Half the side length (m). A 9 m house has half = 4.5. */
  half: number;
}

/** True where (x, z) lies inside the footprint, edges included. */
export function insideFootprint(f: Footprint, x: number, z: number): boolean {
  const r = (f.facing * Math.PI) / 180;
  const dx = x - f.x;
  const dz = z - f.z;
  // Local axes: forward is the compass bearing's direction on the ground, right is 90 degrees clockwise from it.
  const along = dx * Math.sin(r) - dz * Math.cos(r);
  const across = dx * Math.cos(r) + dz * Math.sin(r);
  return Math.abs(along) <= f.half && Math.abs(across) <= f.half;
}

/** True where (x, z) lies inside any solid footprint. */
export function solidAt(footprints: readonly Footprint[], x: number, z: number): boolean {
  for (const f of footprints) if (insideFootprint(f, x, z)) return true;
  return false;
}
