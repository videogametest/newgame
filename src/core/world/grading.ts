// Graded roads and paths (review 018 item 6; overnight item 7). Claude's. Pure.
//
// Each road has a profile: the ground's height along its line. Where that profile is steeper than the road's limit,
// the nearest profile that is not too steep is found, cutting the crests and filling the dips in equal measure,
// and the land either side is raised or lowered by the same amount, fading out over a wide shoulder. Nothing is
// flattened: the land keeps its own shape across the road, and a road that is already gentle is not touched at all.
// Where a road stands on a crossing, in water, or at either end, its height is pinned and the grading meets it.

export interface GradePoint { readonly x: number; readonly z: number }
export interface GradeRoad { readonly id: string; readonly points: readonly GradePoint[]; readonly limit: number }

export const GRADING = {
  /** Metres between samples of a road's profile. */
  step: 1,
  /** The limit aimed for, as a share of the limit allowed, to leave room for what lies between samples. */
  aim: 0.85,
  /** Full correction within this distance of the line. */
  core: 2.5,
  /** The shoulder: the correction fades to nothing this far out, plus `perMetre` for each metre of cut or fill. */
  shoulder: 12,
  perMetre: 5,
  maxShoulder: 42,
  /**
   * The bed: within `bedCore` of the line the ground is the road's own profile, so the metre-scale lumps in the
   * land are worn smooth where people walk. It fades back to the land by `bedEdge`.
   */
  bedCore: 1.2,
  bedEdge: 3.2,
  /**
   * Roads are graded in the order given, and an earlier road is never disturbed by a later one: a later road has no
   * effect within `yieldNear` of an earlier road's line, full effect beyond `yieldFar`, and is pinned in between.
   */
  /** Extra passes over every road, to settle the short steps left where roads meet. */
  settlePasses: 4,
  yieldNear: 1.2,
  yieldFar: 3.2,
} as const;

interface Profile {
  road: GradeRoad;
  /** Distance along the line of each segment's start, and the segments themselves. */
  segs: { ax: number; az: number; bx: number; bz: number; s0: number; len: number }[];
  length: number;
  /** Correction (m) at each sample, `step` apart. */
  correction: Float64Array;
  /** The true spacing of this road's samples: its length divided evenly, close to `step`. */
  step: number;
  /** The graded height at each sample. */
  profile: Float64Array;
  /** 1 where the sample may be changed, 0 where it is pinned. */
  free: Float64Array;
  /** The largest shoulder any sample of this road needs. */
  reach: number;
  box: { x0: number; x1: number; z0: number; z1: number };
  /** What could not be met: stretches whose pinned ends are too far apart in height for the limit. */
  infeasible: number;
}

const smooth = (t: number): number => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };

function pointAt(p: Profile, s: number): { x: number; z: number } {
  for (const g of p.segs) if (s <= g.s0 + g.len + 1e-9) { const t = Math.max(0, (s - g.s0) / g.len); return { x: g.ax + (g.bx - g.ax) * t, z: g.az + (g.bz - g.az) * t }; }
  const g = p.segs[p.segs.length - 1];
  return { x: g.bx, z: g.bz };
}

/**
 * The nearest profile to `h` that is nowhere steeper than `limit`, holding the pinned samples where they are.
 * Between each pair of pins it is the mean of the highest gentle profile under the ground and the lowest over it,
 * so cut and fill balance. Returns the profile and how many samples sit in a stretch that cannot be met.
 */
export function gentleProfile(h: ArrayLike<number>, pinned: ArrayLike<boolean>, step: number, limit: number): { g: Float64Array; infeasible: number } {
  const n = h.length;
  const g = Float64Array.from(h as ArrayLike<number>);
  let infeasible = 0;
  const L = limit * step;
  let a = 0;
  while (a < n - 1) {
    let b = a + 1;
    while (b < n - 1 && !pinned[b]) b++;
    if (b - a > 1) {
      // Clamp the ground between what the two pins allow, then make it gentle from above and from below.
      const t = new Float64Array(b - a + 1);
      let bad = false;
      for (let i = a; i <= b; i++) {
        const up = Math.min(h[a] + L * (i - a), h[b] + L * (b - i));
        const lo = Math.max(h[a] - L * (i - a), h[b] - L * (b - i));
        if (lo > up + 1e-9) bad = true;
        t[i - a] = bad ? (h[a] + ((h[b] - h[a]) * (i - a)) / (b - a)) : Math.min(up, Math.max(lo, h[i]));
      }
      if (bad) {
        infeasible += b - a - 1;
        for (let i = a; i <= b; i++) g[i] = h[a] + ((h[b] - h[a]) * (i - a)) / (b - a);
      } else {
        const m = t.length;
        const under = Float64Array.from(t), over = Float64Array.from(t);
        for (let i = 1; i < m; i++) { under[i] = Math.min(under[i], under[i - 1] + L); over[i] = Math.max(over[i], over[i - 1] - L); }
        for (let i = m - 2; i >= 0; i--) { under[i] = Math.min(under[i], under[i + 1] + L); over[i] = Math.max(over[i], over[i + 1] - L); }
        for (let i = a; i <= b; i++) g[i] = (under[i - a] + over[i - a]) / 2;
      }
    }
    a = b;
  }
  return { g, infeasible };
}

export interface GradingOptions {
  /** True where the road's height is fixed: on a crossing, in water, past the gate. The two ends are always pinned. */
  pinned: (x: number, z: number, roadId: string) => boolean;
}

export interface Graded {
  heightAt: (x: number, z: number) => number;
  /** For reports and tests: each road's largest cut, largest fill, and unmet samples. */
  report: () => { id: string; cut: number; fill: number; infeasible: number }[];
}

function distanceToLine(points: readonly GradePoint[], x: number, z: number): { d: number; s: number } {
  let d = Infinity, sAt = 0, s0 = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
    const u = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / (len * len)));
    const dd = Math.hypot(x - (a.x + dx * u), z - (a.z + dz * u));
    if (dd < d) { d = dd; sAt = s0 + u * len; }
    s0 += len;
  }
  return { d, s: sAt };
}

/**
 * Wrap a height function so every road in `roads` keeps to its limit along its line. Roads are graded one after
 * another, each on the land as the ones before it left it, so where two meet they agree.
 */
export function withGradedRoads(base: (x: number, z: number) => number, roads: readonly GradeRoad[], o: GradingOptions, t = GRADING): Graded {
  let built: { heightAt: (x: number, z: number) => number; profiles: Profile[] } | null = null;

  const layer = (under: (x: number, z: number) => number, road: GradeRoad, earlier: readonly GradeRoad[]): { heightAt: (x: number, z: number) => number; profile: Profile } => {
    const segs: Profile['segs'] = [];
    let s = 0;
    for (let i = 0; i + 1 < road.points.length; i++) {
      const a = road.points[i], b = road.points[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z);
      segs.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, s0: s, len });
      s += len;
    }
    const p: Profile = { road, segs, length: s, step: t.step, correction: new Float64Array(0), profile: new Float64Array(0), free: new Float64Array(0), reach: 0, box: { x0: 0, x1: 0, z0: 0, z1: 0 }, infeasible: 0 };
    const yieldTo = (x: number, z: number): number => {
      let d = Infinity;
      for (const e of earlier) d = Math.min(d, distanceToLine(e.points, x, z).d);
      return d;
    };
    const n = Math.ceil(s / t.step) + 1;
    p.step = s / (n - 1);
    const h = new Float64Array(n);
    const pin: boolean[] = [];
    for (let i = 0; i < n; i++) {
      const at = pointAt(p, i * p.step);
      h[i] = under(at.x, at.z);
      pin.push(i === 0 || i === n - 1 || yieldTo(at.x, at.z) < t.yieldNear || o.pinned(at.x, at.z, road.id));
    }
    const { g, infeasible } = gentleProfile(h, pin, p.step, road.limit * t.aim);
    p.correction = g.map((v, i) => v - h[i]);
    p.profile = g;
    p.free = Float64Array.from(pin, (b) => (b ? 0 : 1));
    p.infeasible = infeasible;
    let most = 0;
    for (const c of p.correction) most = Math.max(most, Math.abs(c));
    p.reach = Math.max(t.bedEdge, Math.min(t.maxShoulder, t.shoulder + t.perMetre * most));
    const xs = road.points.map((q) => q.x), zs = road.points.map((q) => q.z);
    p.box = { x0: Math.min(...xs) - p.reach, x1: Math.max(...xs) + p.reach, z0: Math.min(...zs) - p.reach, z1: Math.max(...zs) + p.reach };

    const heightAt = (x: number, z: number): number => {
      const hu = under(x, z);
      if (x < p.box.x0 || x > p.box.x1 || z < p.box.z0 || z > p.box.z1) return hu;
      const { d, s: sAt } = distanceToLine(road.points, x, z);
      if (d >= p.reach) return hu;
      const keep = earlier.length ? smooth((yieldTo(x, z) - t.yieldNear) / (t.yieldFar - t.yieldNear)) : 1;
      if (keep <= 0) return hu;
      const last = p.correction.length - 1;
      const f = Math.min(last, sAt / p.step), i = Math.floor(f), j = Math.min(last, i + 1), k = f - i;
      const c = p.correction[i] * (1 - k) + p.correction[j] * k;
      const reach = Math.min(t.maxShoulder, t.shoulder + t.perMetre * Math.abs(c));
      const w = d <= t.core ? 1 : 1 - smooth((d - t.core) / Math.max(1e-6, reach - t.core));
      const shouldered = hu + c * Math.max(0, w) * keep;
      const bed = keep * (p.free[i] * (1 - k) + p.free[j] * k) * (1 - smooth((d - t.bedCore) / (t.bedEdge - t.bedCore)));
      return bed > 0 ? shouldered + (p.profile[i] * (1 - k) + p.profile[j] * k - shouldered) * bed : shouldered;
    };
    return { heightAt, profile: p };
  };

  const build = () => {
    let heightAt = base;
    const profiles: Profile[] = [];
    roads.forEach((road, k) => {
      const l = layer(heightAt, road, roads.slice(0, k));
      heightAt = l.heightAt;
      profiles.push(l.profile);
    });
    // Where a later road leaves an earlier one it crosses the edge of that road's bed, which can leave a short
    // step. Further passes, each road now yielding to every other, wear those down.
    for (let pass = 0; pass < t.settlePasses; pass++) {
      for (const road of roads) {
        const l = layer(heightAt, road, roads.filter((r) => r !== road));
        heightAt = l.heightAt;
        const first = profiles.find((p) => p.road === road)!;
        first.infeasible = Math.min(first.infeasible, l.profile.infeasible);
      }
    }
    return { heightAt, profiles };
  };

  return {
    heightAt: (x, z) => (built ??= build()).heightAt(x, z),
    report: () => (built ??= build()).profiles.map((p) => {
      let cut = 0, fill = 0;
      for (const c of p.correction) { cut = Math.min(cut, c); fill = Math.max(fill, c); }
      return { id: p.road.id, cut, fill, infeasible: p.infeasible };
    }),
  };
}
