// Road grading (review 018 item 6): the ground under each road and path is shaped so the walk along its line never
// climbs faster than a limit. Pure: no Babylon imports, no calls back into the height pipeline's shelf or village.
//
// Method. Each road is resampled at 1 m of arc length. For a sample k, the highest grade the road can take is
// U_k = min_j (h_j + L|s_k - s_j|) and the lowest is Lo_k = max_j (h_j - L|s_k - s_j|), over the usable samples j of
// that road. Both are L-Lipschitz, and their midpoint g is too: the graded line stays within the land it started
// from, moves no further than the land requires, and never climbs faster than L (L is GRADE_TARGET, under the limit).
// Off the line, each road's target is blended into the ground by how close the point is to that road's strip: full
// weight within the half-width, fading to nothing GRADE_FADE metres out. Weights are raised to GRADE_SHARPNESS so a
// neighbouring road's target barely pulls on a line that is not its own.

export interface GradePoint {
  readonly x: number;
  readonly z: number;
}

export interface GradeRoad {
  readonly name: string;
  readonly kind: 'road' | 'path';
  readonly points: readonly GradePoint[];
}

/** Largest grade (rise over run, along the line) the graded profile aims for, per kind. Limits are 0.2 and 0.45 (review 018). */
export const GRADE_TARGET = { road: 0.16, path: 0.35 } as const;
/** Half the width of the graded strip, per kind (roads are 3.6 m wide, paths 1.2 m). */
export const GRADE_HALF_WIDTH = { road: 1.8, path: 0.6 } as const;
/** Metres over which the offset fades from full strength to nothing beside the line. */
export const GRADE_FADE = 15;
/** Power applied to each road's fade weight, so a road's own line is not pulled toward a neighbouring road's target. */
export const GRADE_SHARPNESS = 9;
/** Spacing (m) of the profile samples along each line. */
const STEP = 1;
/** Cell size (m) of the spatial index. Any point within GRADE_REACH of a segment shares a cell with it. */
const CELL = 20;
const GRADE_REACH = Math.max(...Object.values(GRADE_HALF_WIDTH)) + GRADE_FADE;

/** The ground the grading works on: `base` is the ungraded height, `sampleUsable` says which samples shape the profile, `gradable` says where the grade may change the ground. */
export interface GradeInputs {
  readonly base: (x: number, z: number) => number;
  /** A sample shapes the profile only if this is true: dry ground off the crossings, inside the grade zone. */
  readonly sampleUsable: (x: number, z: number) => boolean;
  /** Grading changes the ground only where this is true (never on the rim, nor beyond the gate). */
  readonly gradable: (x: number, z: number) => boolean;
}

interface Segment {
  /** Index of the road this segment belongs to, so each road is blended once. */
  road: number;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  /** Target height (m) at each end. */
  ga: number;
  gb: number;
  half: number;
}

export interface GradeSample {
  x: number;
  z: number;
  s: number;
  base: number;
  graded: number;
  usable: boolean;
}

export interface GradeField {
  /**
   * Height (m) of the graded ground at (x, z), given its ungraded height `base`. On a road's line it is the road's target
   * exactly; beside it, the targets of nearby roads are blended in by weight and fade back to `base` GRADE_FADE metres
   * out. Unchanged far from every road.
   */
  heightAt(x: number, z: number, base: number): number;
  /** The profile of a road, sample by sample: for tests and probes. */
  profile(name: string): readonly GradeSample[];
}

const smooth = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Resample a polyline at STEP metres of arc length. Returns the points with their arc length from the start. */
function resample(points: readonly GradePoint[]): { x: number; z: number; s: number }[] {
  const out: { x: number; z: number; s: number }[] = [];
  let s = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.round(len / STEP));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, s: s + len * t });
    }
    s += len;
  }
  const last = points[points.length - 1];
  out.push({ x: last.x, z: last.z, s });
  return out;
}

/**
 * The target g over one road: the midpoint of its two Lipschitz envelopes over the usable samples. Each envelope is
 * L-Lipschitz, so g is too, and g stays between the lowest and highest ground the road could take at that point.
 */
function targetProfile(h: readonly number[], s: readonly number[], usable: readonly boolean[], limit: number): number[] {
  const idx = usable.flatMap((u, i) => (u ? [i] : []));
  const g = new Array<number>(h.length).fill(NaN);
  if (idx.length === 0) return h.slice();
  for (let k = 0; k < h.length; k++) {
    if (!usable[k]) continue;
    let up = Infinity;
    let lo = -Infinity;
    for (const j of idx) {
      const d = limit * Math.abs(s[k] - s[j]);
      up = Math.min(up, h[j] + d);
      lo = Math.max(lo, h[j] - d);
    }
    g[k] = (up + lo) / 2;
  }
  return fillSkipped(g, usable);
}

/** Fill skipped samples linearly between the nearest usable neighbours, flat past the ends. */
function fillSkipped(v: number[], usable: readonly boolean[]): number[] {
  let prev = -1;
  for (let k = 0; k < v.length; k++) {
    if (!usable[k]) continue;
    if (prev < 0) {
      for (let m = 0; m < k; m++) v[m] = v[k];
    } else {
      for (let m = prev + 1; m < k; m++) v[m] = v[prev] + (v[k] - v[prev]) * ((m - prev) / (k - prev));
    }
    prev = k;
  }
  if (prev >= 0) for (let m = prev + 1; m < v.length; m++) v[m] = v[prev];
  return v;
}

/**
 * Build the grading for a set of roads. The profiles and the spatial index are built once here; heightAt is then a
 * lookup over the segments near the point.
 */
export function buildRoadGrade(roads: readonly GradeRoad[], inputs: GradeInputs): GradeField {
  const cells = new Map<string, Segment[]>();
  const profiles = new Map<string, GradeSample[]>();

  roads.forEach((road, roadIndex) => {
    const pts = resample(road.points);
    const h = pts.map((p) => inputs.base(p.x, p.z));
    const s = pts.map((p) => p.s);
    const usable = pts.map((p) => inputs.sampleUsable(p.x, p.z));
    const g = targetProfile(h, s, usable, GRADE_TARGET[road.kind]);
    profiles.set(road.name, pts.map((p, i) => ({ x: p.x, z: p.z, s: p.s, base: h[i], graded: g[i], usable: usable[i] })));
    const half = GRADE_HALF_WIDTH[road.kind];
    for (let i = 0; i + 1 < pts.length; i++) {
      const seg: Segment = {
        road: roadIndex, ax: pts[i].x, az: pts[i].z, bx: pts[i + 1].x, bz: pts[i + 1].z, ga: g[i], gb: g[i + 1], half,
      };
      const minX = Math.min(seg.ax, seg.bx) - GRADE_REACH;
      const maxX = Math.max(seg.ax, seg.bx) + GRADE_REACH;
      const minZ = Math.min(seg.az, seg.bz) - GRADE_REACH;
      const maxZ = Math.max(seg.az, seg.bz) + GRADE_REACH;
      for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++) {
        for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) {
          const key = `${cx},${cz}`;
          const list = cells.get(key);
          if (list) list.push(seg);
          else cells.set(key, [seg]);
        }
      }
    }
  });

  return {
    heightAt(x, z, base) {
      if (!inputs.gradable(x, z)) return base;
      const near = cells.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
      if (!near) return base;
      // Each road gives its own target from its nearest segment (exact on its line), weighted by how close the point is
      // to that road's strip. Where two roads meet the weights blend, so the ground never steps between them.
      const nearest = new Map<number, { seg: Segment; dist: number; t: number }>();
      for (const seg of near) {
        const dx = seg.bx - seg.ax;
        const dz = seg.bz - seg.az;
        const len2 = dx * dx + dz * dz;
        const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((x - seg.ax) * dx + (z - seg.az) * dz) / len2));
        const dist = Math.hypot(x - (seg.ax + dx * t), z - (seg.az + dz * t));
        const cur = nearest.get(seg.road);
        if (!cur || dist < cur.dist) nearest.set(seg.road, { seg, dist, t });
      }
      let wSum = 0;
      let blended = 0;
      for (const { seg, dist, t } of nearest.values()) {
        // Raised to a power so another road's target barely leaks onto this road's own line (the fade is steep near it).
        const w = (1 - smooth((dist - seg.half) / GRADE_FADE)) ** GRADE_SHARPNESS;
        if (w <= 0) continue;
        const target = seg.ga + (seg.gb - seg.ga) * t;
        wSum += w;
        blended += w * (target - base);
      }
      return base + blended / Math.max(1, wSum);
    },
    profile(name) {
      return profiles.get(name) ?? [];
    },
  };
}
