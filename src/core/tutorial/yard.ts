// The first evening, step 3: the yard (task 010; queue item 26). Pure: no engine, DOM or storage.
// Three straw targets, then the far one, then the change of arrow. Hits are found by intersecting the arrow's
// actual flight with each target (arrowStrikes); nothing here counts shots that were not seen to land.
export type YardPhase = 'intro' | 'targets' | 'far' | 'arrows' | 'done';
export type LessonArrow = 'standard' | 'blunt';
export interface YardState {
  phase: YardPhase;
  /** Straw targets struck, by id. Kept across leaving and coming back. */
  struck: string[];
  /** Misses so far; picks the next of her miss lines in turn. */
  misses: number;
  /** The arrow on the string. */
  arrow: LessonArrow;
}
export type YardEvent =
  | { type: 'yardOpened' }
  | { type: 'arrowHit'; target: string }
  | { type: 'arrowMissed' }
  | { type: 'arrowChanged'; delta: 1 | -1 };

export const STRAW_IDS = ['straw.0', 'straw.1', 'straw.2'] as const;
export const FAR_ID = 'far';
export const LESSON_ARROWS: readonly LessonArrow[] = ['standard', 'blunt'];

export function newYard(): YardState { return { phase: 'intro', struck: [], misses: 0, arrow: 'standard' }; }

export function advanceYard(s: YardState, e: YardEvent): YardState {
  switch (e.type) {
    case 'yardOpened': return s.phase === 'intro' ? { ...s, phase: 'targets' } : s;
    case 'arrowHit':
      if (s.phase === 'targets') {
        if (!(STRAW_IDS as readonly string[]).includes(e.target) || s.struck.includes(e.target)) return s;
        const struck = [...s.struck, e.target];
        return { ...s, struck, phase: struck.length === STRAW_IDS.length ? 'far' : 'targets' };
      }
      if (s.phase === 'far') return e.target === FAR_ID ? { ...s, phase: 'arrows' } : { ...s, misses: s.misses + 1 };
      return s;
    case 'arrowMissed': return s.phase === 'targets' || s.phase === 'far' ? { ...s, misses: s.misses + 1 } : s;
    case 'arrowChanged': {
      // The second quiver is handed over with her line about it: before that there is only one kind to change to.
      if (s.phase !== 'arrows' && s.phase !== 'done') return s;
      const n = LESSON_ARROWS.length, i = LESSON_ARROWS.indexOf(s.arrow);
      const arrow = LESSON_ARROWS[((i + e.delta) % n + n) % n];
      return { ...s, arrow, phase: s.phase === 'arrows' && arrow === 'blunt' ? 'done' : s.phase };
    }
  }
}

/** What she says to an event, as a written group and an index into it; null for silence. Never on a repeated hit. */
export function yardSays(before: YardState, after: YardState, missLines: { targets: number; far: number }):
  { group: string; index: number }[] {
  if (before.phase === after.phase && before.misses === after.misses) return [];
  if (after.misses > before.misses) {
    const group = before.phase === 'far' ? 'evening.far.miss' : 'evening.targets.miss';
    const count = before.phase === 'far' ? missLines.far : missLines.targets;
    return [{ group, index: (after.misses - 1) % Math.max(1, count) }];
  }
  if (after.phase === 'far') return [{ group: 'evening.targets.done', index: 0 }, { group: 'evening.far', index: 0 }];
  if (after.phase === 'arrows') return [{ group: 'evening.far.done', index: 0 }, { group: 'evening.arrows', index: 0 }];
  if (after.phase === 'done') return [{ group: 'evening.arrows.done', index: 0 }];
  return [];
}

/** The line that tells a returning player what is being asked now (her yard intro is hesper.apprentice, then this). */
export const PHASE_LINE: Record<Exclude<YardPhase, 'intro' | 'done'>, string> =
  { targets: 'evening.targets', far: 'evening.far', arrows: 'evening.arrows' };

/** Which prompt the yard shows: get the bow out, draw and loose, or change arrow. */
export function yardPrompt(s: YardState, bowOut: boolean): 'bow' | 'draw' | 'arrow' | null {
  if (s.phase === 'targets' || s.phase === 'far') return bowOut ? 'draw' : 'bow';
  if (s.phase === 'arrows') return 'arrow';
  return null;
}

// ---------- flight against targets ----------
export interface YardTarget { id: string; x: number; z: number; radius: number; height: number; base: number }
export interface Flight { x: number; y: number; z: number; vx: number; vy: number; vz: number }

/** One step of an arrow's flight, by the same rule as the battle (src/core/battle.ts updateProjectiles). */
export function flightStep(p: Flight, dt: number, gravity: number): Flight {
  const vy = p.vy - gravity * dt;
  return { x: p.x + p.vx * dt, y: p.y + vy * dt, z: p.z + p.vz * dt, vx: p.vx, vy, vz: p.vz };
}

/**
 * The first target the segment from `a` to `b` passes through, or null. Each target is an upright cylinder from its
 * base to base + height, widened by the arrow's radius. Exact for a straight segment.
 */
export function arrowStrikes(a: Flight, b: Flight, targets: readonly YardTarget[], arrowRadius: number): string | null {
  let best: { id: string; t: number } | null = null;
  const dx = b.x - a.x, dz = b.z - a.z, dd = dx * dx + dz * dz;
  for (const g of targets) {
    const r = g.radius + arrowRadius;
    // Entry into the circle along the segment, solved in the ground plane.
    const fx = a.x - g.x, fz = a.z - g.z;
    const c = fx * fx + fz * fz - r * r;
    let t: number;
    if (c <= 0) t = 0;
    else {
      if (dd === 0) continue;
      const bq = fx * dx + fz * dz, disc = bq * bq - dd * c;
      if (disc < 0) continue;
      t = (-bq - Math.sqrt(disc)) / dd;
      if (t < 0 || t > 1) continue;
    }
    // The other edge, to check the height across the chord the arrow is inside the circle.
    const bq = fx * dx + fz * dz, disc = bq * bq - dd * c;
    const t2 = dd === 0 ? 1 : Math.min(1, (-bq + Math.sqrt(Math.max(0, disc))) / dd);
    const yIn = a.y + (b.y - a.y) * t, yOut = a.y + (b.y - a.y) * t2;
    const lo = g.base, hi = g.base + g.height;
    if (Math.max(yIn, yOut) < lo || Math.min(yIn, yOut) > hi) continue;
    if (!best || t < best.t) best = { id: g.id, t };
  }
  return best?.id ?? null;
}
