// The shelf Wick stands on, and the water that comes to it (docs/tasks/003-wick.md, rules 4 and 5). Claude's.
// Pure: wraps any height function. Under the village the ground is nearly level, 2.5 to 4 m above the lake;
// along the village's north-west side a short bank drops to the water at the landing.

export const SHELF_TUNING = {
  /** The village's extent, as a box. The shelf is full strength inside it and fades out over `fade` metres. */
  box: { x0: 34, x1: 166, z0: 44, z1: 128 },
  fade: 45,
  /** On the water side the cut reaches further, so the bay joins the lake and is never a pond. */
  waterFade: 110,
  /** The shore beside the village: water lies to the north-west of this line. */
  shore: [[20, 84], [40, 70], [56, 64], [66, 62], [72, 56], [74, 38], [70, 20]] as readonly (readonly [number, number])[],
  /** The bank: metres above the water at the top, and how far inland the top is. */
  bankTop: 2.5,
  bankRun: 7,
  /** Past the bank the shelf rises by this much per metre, to at most `shelfMax` above the water. */
  rise: 0.012,
  shelfMax: 4,
  /** How deep the bay is, a few metres out. */
  bayDepth: 1.6,
  bayRun: 6,
} as const;

const smooth = (t: number): number => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };

/** Signed distance (m) from the shore line: positive on the village's side, negative over the water. */
export function shoreDistance(x: number, z: number, shore = SHELF_TUNING.shore): number {
  let best = Infinity;
  let sign = 1;
  for (let i = 0; i + 1 < shore.length; i++) {
    const [ax, az] = shore[i];
    const [bx, bz] = shore[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d < best) { best = d; sign = dx * (z - az) - dz * (x - ax) >= 0 ? 1 : -1; }
  }
  return best * sign;
}

/** Metres above the water the shelf wants the ground to be at this point. */
export function shelfTarget(x: number, z: number, t = SHELF_TUNING): number {
  const s = shoreDistance(x, z, t.shore);
  if (s <= 0) return -t.bayDepth * smooth(-s / t.bayRun);
  if (s <= t.bankRun) return t.bankTop * smooth(s / t.bankRun);
  return Math.min(t.shelfMax, t.bankTop + (s - t.bankRun) * t.rise);
}

function outsideBox(x: number, z: number, b = SHELF_TUNING.box): number {
  const dx = Math.max(b.x0 - x, 0, x - b.x1);
  const dz = Math.max(b.z0 - z, 0, z - b.z1);
  return Math.hypot(dx, dz);
}

/** Wrap a height function so Wick stands on its shelf. `water` is the water's surface height. */
export function withWickShelf(heightAt: (x: number, z: number) => number, water: number, t = SHELF_TUNING): (x: number, z: number) => number {
  return (x, z) => {
    const h = heightAt(x, z);
    const out = outsideBox(x, z, t.box);
    if (out >= t.waterFade) return h;
    const target = water + shelfTarget(x, z, t);
    const overWater = shoreDistance(x, z, t.shore) < 0;
    // Land fades back to the valley's own ground quickly. Water keeps its cut for longer, and only ever lowers the ground.
    if (overWater) return Math.min(h, h + (target - h) * (1 - smooth(out / t.waterFade)));
    return h + (target - h) * (1 - smooth(out / t.fade));
  };
}
