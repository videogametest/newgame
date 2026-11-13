import { describe, expect, it } from 'vitest';
import {
  EDGE_RADIUS,
  GATE_LINE,
  VALLEY_HALF_EXTENT,
  VALLEY_PLACES,
  VALLEY_SEED,
  VALLEY_SOLIDS,
  VALLEY_STOPS,
  WATER_LEVEL,
  beyondGate,
  blocksHero,
  blocksWalking,
  gateFrameAt,
  insideValley,
  isCrossing,
  isGorge,
  isRimOpening,
  isWalkableGround,
  isWater,
  onGateWall,
  sightMargin,
  valleyHeightAt,
  walkSlopeAt,
  walkSurfaceAt,
} from './valley';
import { solidAt } from './solids';
import { VALLEY_CROSSINGS, VALLEY_RIVER_IN, VALLEY_RIVER_OUT, type LayoutCrossing } from './valley_layout';
import { walkStep, type WalkRules } from './walk';

/** Eye heights (m) used for the sight-line checks; the same values the prototype and the spec table use. */
const EYE = { person: 2, watchHouseYard: 3, signalHillTop: 4, mill: 9, watchHouse: 14, castleTop: 35 };

/** Clearance of the sight line between two named places, with the given eye heights (m above the ground). */
function sight(a: keyof typeof VALLEY_PLACES, eyeA: number, b: keyof typeof VALLEY_PLACES, eyeB: number): number {
  return sightMargin(VALLEY_PLACES[a], VALLEY_PLACES[b], eyeA, eyeB);
}

/** Segments of the wet river: the river in from its first bend past the falls, and the river out. */
function riverSegments(): { a: { x: number; z: number }; b: { x: number; z: number } }[] {
  const out: { a: { x: number; z: number }; b: { x: number; z: number } }[] = [];
  for (let i = 1; i + 1 < VALLEY_RIVER_IN.length; i++) out.push({ a: VALLEY_RIVER_IN[i], b: VALLEY_RIVER_IN[i + 1] });
  for (let i = 0; i + 1 < VALLEY_RIVER_OUT.length; i++) out.push({ a: VALLEY_RIVER_OUT[i], b: VALLEY_RIVER_OUT[i + 1] });
  return out;
}

/** Points about every 3 m along the wet river, each with its unit normal across the river. */
function riverSamples(): { x: number; z: number; px: number; pz: number }[] {
  const out: { x: number; z: number; px: number; pz: number }[] = [];
  for (const { a, b } of riverSegments()) {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const px = -(b.z - a.z) / len;
    const pz = (b.x - a.x) / len;
    const n = Math.max(1, Math.round(len / 3));
    for (let k = 0; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n, px, pz });
  }
  return out;
}

/** Distance (m) from (x, z) to the segment a-b. */
function segmentDistance(x: number, z: number, a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}

/** Inside a crossing's strip or its approach, where the bed is raised or the stones, bridge or forge bridge are. */
function nearCrossing(x: number, z: number): boolean {
  return VALLEY_CROSSINGS.some((c) => segmentDistance(x, z, c.from, c.to) < 15);
}

/** The named crossing. Fails the test if the layout has no such crossing. */
function crossing(name: string): LayoutCrossing {
  const c = VALLEY_CROSSINGS.find((k) => k.name === name);
  if (!c) throw new Error(`no crossing named ${name}`);
  return c;
}

/** Points every 0.5 m along a crossing's centre line, from its `from` end to its `to` end. */
function alongCrossing(c: LayoutCrossing): { x: number; z: number }[] {
  const len = Math.hypot(c.to.x - c.from.x, c.to.z - c.from.z);
  const n = Math.max(1, Math.round(len / 0.5));
  const out: { x: number; z: number }[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    out.push({ x: c.from.x + (c.to.x - c.from.x) * t, z: c.from.z + (c.to.z - c.from.z) * t });
  }
  return out;
}

/** Slope (rise over run) from ±1 m central differences, as the walking rule measures it. */
function slopeAt(x: number, z: number): number {
  return Math.hypot(valleyHeightAt(x + 1, z) - valleyHeightAt(x - 1, z), valleyHeightAt(x, z + 1) - valleyHeightAt(x, z - 1)) / 2;
}

/**
 * Cells of a 4 m grid reached on foot from the start. The patrol hut's hollow is shut here (its own rim closes it);
 * the gate corridor is open, and the gate wall and the rim are what keep it shut (isWalkableGround). A 4 m grid cannot
 * step over the gate wall: its 4 m thickness is more than one grid step's reach across the road.
 */
function reachableFromStart(): { x: number; z: number }[] {
  const CELL = 4;
  const n = Math.round((2 * VALLEY_HALF_EXTENT) / CELL) + 1;
  const at = (i: number) => -VALLEY_HALF_EXTENT + i * CELL;
  const shut = (x: number, z: number) => Math.hypot(x - VALLEY_PLACES.patrolHut.x, z - VALLEY_PLACES.patrolHut.z) < 60;
  const ok = (i: number, j: number) => !shut(at(i), at(j)) && isWalkableGround(at(i), at(j));
  const si = Math.round((VALLEY_PLACES.start.x + VALLEY_HALF_EXTENT) / CELL);
  const sj = Math.round((VALLEY_PLACES.start.z + VALLEY_HALF_EXTENT) / CELL);
  const seen = new Uint8Array(n * n);
  const queue: number[] = [sj * n + si];
  seen[sj * n + si] = 1;
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q] % n;
    const j = Math.floor(queue[q] / n);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di;
      const jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
      const k = jj * n + ii;
      if (seen[k] || !ok(ii, jj)) continue;
      seen[k] = 1;
      queue.push(k);
    }
  }
  return queue.map((k) => ({ x: at(k % n), z: at(Math.floor(k / n)) }));
}

describe('Tallowmere terrain (§4)', () => {
  it('is deterministic for the same seed and point', () => {
    expect(VALLEY_SEED).toBeTypeOf('number');
    for (const [x, z] of [[0, 0], [-70, 95], [240, -210], [-399, 12]]) {
      expect(valleyHeightAt(x, z)).toBe(valleyHeightAt(x, z));
      expect(Number.isFinite(valleyHeightAt(x, z))).toBe(true);
    }
  });

  it('keeps the lake as water and Wick dry', () => {
    expect(isWater(VALLEY_PLACES.lake.x, VALLEY_PLACES.lake.z)).toBe(true);
    expect(isWater(VALLEY_PLACES.wick.x, VALLEY_PLACES.wick.z)).toBe(false);
  });

  it('keeps every walkable place walkable: all places except the lake', () => {
    for (const [name, p] of Object.entries(VALLEY_PLACES)) {
      // The lake is water. The castle is beyond the north-west rim and never walked to (docs/tasks/003-layout.md, places table).
      if (name === 'lake' || name === 'castle') continue;
      // A place centre inside a solid footprint (a house, or the well) is walkable only as ground near it: the building
      // stands there (overnight item 6). Such a place must have walkable ground within 6 m.
      if (blocksHero(p.x, p.z) && solidAt(VALLEY_SOLIDS, p.x, p.z)) {
        let near = false;
        for (let dx = -6; dx <= 6 && !near; dx++) for (let dz = -6; dz <= 6 && !near; dz++) {
          if (Math.hypot(dx, dz) <= 6 && isWalkableGround(p.x + dx, p.z + dz)) near = true;
        }
        expect(near, `place ${name} at (${p.x}, ${p.z}) has walkable ground within 6 m`).toBe(true);
        continue;
      }
      expect(isWalkableGround(p.x, p.z), `place ${name} at (${p.x}, ${p.z})`).toBe(true);
    }
  });

  it('keeps the walkable crossings walkable along their whole strip, even where the river is water', () => {
    const walkable = VALLEY_CROSSINGS.filter((c) => c.walkable !== false);
    expect(walkable.map((c) => c.name).sort()).toEqual(['ford', 'mill_bridge', 'stepping_stones']);
    for (const c of walkable) {
      for (const p of alongCrossing(c)) {
        expect(isCrossing(p.x, p.z), `crossing ${c.name} at (${p.x}, ${p.z})`).toBe(true);
        expect(isWalkableGround(p.x, p.z), `crossing ${c.name} at (${p.x}, ${p.z})`).toBe(true);
      }
    }
  });

  it('keeps the forge bridge unwalkable: its water stays blocked until its project is built', () => {
    const forge = crossing('forge_bridge');
    expect(forge.walkable).toBe(false);
    let wet = 0;
    for (const p of alongCrossing(forge)) {
      expect(isCrossing(p.x, p.z)).toBe(false);
      if (!isWater(p.x, p.z)) continue;
      wet++;
      expect(blocksWalking(p.x, p.z)).toBe(true);
      expect(isWalkableGround(p.x, p.z)).toBe(false);
    }
    expect(wet).toBeGreaterThan(0);
  });

  it('blocks walking in water everywhere except at a crossing', () => {
    let checked = 0;
    for (let z = -VALLEY_HALF_EXTENT; z <= VALLEY_HALF_EXTENT; z += 10) {
      for (let x = -VALLEY_HALF_EXTENT; x <= VALLEY_HALF_EXTENT; x += 10) {
        if (!isWater(x, z) || isCrossing(x, z)) continue;
        checked++;
        expect(blocksWalking(x, z)).toBe(true);
        expect(isWalkableGround(x, z)).toBe(false);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('makes the rim a climb the hero cannot make: every bearing at r 331 to 337 is steeper than 0.7, outside the openings and water', () => {
    let checked = 0;
    for (const r of [331, 334, 337]) {
      for (let a = 0; a < 360; a += 2) {
        const rad = (a * Math.PI) / 180;
        const x = r * Math.cos(rad);
        const z = r * Math.sin(rad);
        if (isWater(x, z) || isRimOpening(x, z)) continue;
        checked++;
        expect(walkSlopeAt(x, z), `rim point (${x.toFixed(0)}, ${z.toFixed(0)})`).toBeGreaterThanOrEqual(0.7);
      }
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('caps the rim below the signal hill: no rim point (r 330 to 400, outside the openings and water) stands above the hill top', () => {
    const hillTop = valleyHeightAt(VALLEY_PLACES.signalHill.x, VALLEY_PLACES.signalHill.z);
    let checked = 0;
    let highest = -Infinity;
    for (let r = 330; r <= 400; r += 2) {
      for (let a = 0; a < 360; a += 1) {
        const rad = (a * Math.PI) / 180;
        const x = r * Math.cos(rad);
        const z = r * Math.sin(rad);
        if (!insideValley(x, z) || isWater(x, z) || isRimOpening(x, z)) continue;
        checked++;
        highest = Math.max(highest, valleyHeightAt(x, z));
      }
    }
    expect(checked).toBeGreaterThan(5000);
    expect(highest, 'highest rim point (m)').toBeLessThan(hillTop);
  });

  it('closes the gate: the soldiers\' road is walled at the gate line, the wall blocks the hero, and nothing beyond it is reachable', () => {
    expect(onGateWall(GATE_LINE.x, GATE_LINE.z)).toBe(true);
    expect(blocksHero(GATE_LINE.x, GATE_LINE.z)).toBe(true);
    expect(isWalkableGround(GATE_LINE.x, GATE_LINE.z)).toBe(false);
    // The wall spans the corridor across the road (5 m to either side is on it; 7 m is the rim's cliff), and is thin along it.
    expect(onGateWall(GATE_LINE.x - 5 * GATE_LINE.uz, GATE_LINE.z + 5 * GATE_LINE.ux)).toBe(true);
    expect(onGateWall(GATE_LINE.x - 7 * GATE_LINE.uz, GATE_LINE.z + 7 * GATE_LINE.ux)).toBe(false);
    expect(onGateWall(GATE_LINE.x + 4 * GATE_LINE.ux, GATE_LINE.z + 4 * GATE_LINE.uz)).toBe(false);
    const reached = reachableFromStart();
    const beyond = reached.filter((p) => beyondGate(p.x, p.z)).length;
    expect(beyond, 'walkable cells beyond the gate line').toBe(0);
    // The pass is usable from the valley side: some reached cell sits on the road 2 to 12 m before the gate.
    const approach = reached.filter((p) => {
      const f = gateFrameAt(p.x, p.z);
      return f.s <= -2 && f.s >= -12 && f.across <= 6;
    });
    expect(approach.length, 'reached cells on the road before the gate').toBeGreaterThan(0);
  }, 60000);

  it('levels the pass floor: from 10 m before the gate to the gate wall, each cross-section across the corridor is one height (review 025 item 1)', () => {
    const at = (s: number, across: number) => ({
      x: GATE_LINE.x + GATE_LINE.ux * s + GATE_LINE.uz * across,
      z: GATE_LINE.z + GATE_LINE.uz * s - GATE_LINE.ux * across,
    });
    let checked = 0;
    for (let across = -6; across <= 6; across += 1) {
      const floor = valleyHeightAt(at(-10, across).x, at(-10, across).z);
      for (let s = -10; s <= 1.5; s += 0.5) {
        const p = at(s, across);
        expect(valleyHeightAt(p.x, p.z), `floor at s=${s} across=${across}`).toBeCloseTo(floor, 6);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(300);
    // Continuous at the floor's start: 0.5 m further out the natural slope carries on from the same height.
    const before = at(-10.5, 0), start = at(-10, 0);
    expect(Math.abs(valleyHeightAt(before.x, before.z) - valleyHeightAt(start.x, start.z))).toBeLessThan(0.5);
  });

  it('makes the corridor sides cliffs: at 7 to 10 m across the road, from 0 to 5 m before the gate line, the slope is at least 0.7', () => {
    let checked = 0;
    for (let s = -5; s <= 0; s += 0.5) {
      for (let across = 7; across <= 10; across += 0.5) {
        for (const side of [-1, 1]) {
          // Move along the road by s, then across it (the across unit vector is the road's normal) by side * across.
          const x = GATE_LINE.x + s * GATE_LINE.ux - side * across * GATE_LINE.uz;
          const z = GATE_LINE.z + s * GATE_LINE.uz + side * across * GATE_LINE.ux;
          checked++;
          expect(walkSlopeAt(x, z), `side point s=${s} across=${side * across}`).toBeGreaterThanOrEqual(0.7);
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('makes the sight lines in the layout: seen where it should be, hidden where it should not', () => {
    // Positive clearance = the line clears the ground. Values from the spec table, docs/tasks/003-layout.md.
    expect(sight('start', EYE.person, 'hesper', EYE.person)).toBeGreaterThan(0);
    expect(sight('start', EYE.person, 'castle', EYE.castleTop)).toBeGreaterThan(0);
    expect(sight('wick', EYE.person, 'mill', EYE.mill)).toBeLessThan(0);
    expect(sight('wick', EYE.person, 'forge', EYE.person)).toBeLessThan(0);
    expect(sight('wick', EYE.person, 'watchHouse', EYE.watchHouse)).toBeLessThan(0);
    expect(sight('patrolHut', EYE.person, 'castle', EYE.castleTop)).toBeLessThan(0);
    expect(sight('patrolHut', EYE.person, 'signalHill', EYE.signalHillTop)).toBeLessThan(0);
    expect(sight('signalHill', EYE.signalHillTop, 'castle', EYE.castleTop)).toBeGreaterThan(0);
    expect(sight('signalHill', EYE.signalHillTop, 'watchHouse', EYE.watchHouseYard)).toBeGreaterThan(0);
    expect(sight('wick', EYE.person, 'signalHill', EYE.signalHillTop)).toBeGreaterThan(0);
  });

  it('makes the signal hill the highest ground the hero can stand on, close to its marked top (the rim is higher, and not walkable)', () => {
    // Highest cell reached on foot from the start (openings shut). The rim beyond it is higher but not reached.
    let max = -Infinity;
    let at2 = { x: 0, z: 0 };
    for (const p of reachableFromStart()) {
      const h = valleyHeightAt(p.x, p.z);
      if (h > max) { max = h; at2 = p; }
    }
    const hill = VALLEY_PLACES.signalHill;
    expect(Math.hypot(at2.x - hill.x, at2.z - hill.z)).toBeLessThan(40);
    expect(max).toBeGreaterThan(60);
    expect(max).toBeLessThan(70);
  });

  // Review 021: the 64.8 m ground is the signal hill's own summit (13.6 m from the marker), so nothing is reshaped.
  // The test compares against the marker's height and ignores the summit's own ground near the marker.
  it('keeps all ground more than 30 m from the signal hill marker lower than the marker', () => {
    const marker = VALLEY_PLACES.signalHill;
    const markerHeight = valleyHeightAt(marker.x, marker.z);
    let highest = -Infinity;
    for (let x = -400; x <= 400; x += 4) {
      for (let z = -400; z <= 400; z += 4) {
        if (!insideValley(x, z) || isWater(x, z)) continue;
        if (Math.hypot(x - marker.x, z - marker.z) <= 30) continue;
        highest = Math.max(highest, valleyHeightAt(x, z));
      }
    }
    expect(highest).toBeLessThan(markerHeight);
  });

  it('keeps the start and the castle inside the valley and the castle above the lake', () => {
    expect(insideValley(VALLEY_PLACES.start.x, VALLEY_PLACES.start.z)).toBe(true);
    expect(insideValley(VALLEY_PLACES.castle.x, VALLEY_PLACES.castle.z)).toBe(true);
    expect(isWater(VALLEY_PLACES.castle.x, VALLEY_PLACES.castle.z)).toBe(false);
  });

  it('has a river about 8 to 12 m wide at its wet cross-sections', () => {
    const widths: number[] = [];
    for (const line of [VALLEY_RIVER_IN, VALLEY_RIVER_OUT]) {
      for (let i = 0; i + 1 < line.length; i++) {
        const a = line[i];
        const b = line[i + 1];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        const px = -(b.z - a.z) / len;
        const pz = (b.x - a.x) / len;
        const n = Math.max(1, Math.round(len / 15));
        for (let k = 0; k <= n; k++) {
          const x = a.x + ((b.x - a.x) * k) / n;
          const z = a.z + ((b.z - a.z) * k) / n;
          if (Math.hypot(x, z) < 140 || isCrossing(x, z) || valleyHeightAt(x, z) >= WATER_LEVEL) continue;
          const span = (sign: number) => {
            let d = 0;
            while (d < 40 && valleyHeightAt(x + sign * px * d, z + sign * pz * d) < WATER_LEVEL) d += 0.2;
            return d;
          };
          widths.push(span(1) + span(-1));
        }
      }
    }
    widths.sort((p, q) => p - q);
    expect(widths.length).toBeGreaterThan(10);
    const median = widths[Math.floor(widths.length / 2)];
    const p10 = widths[Math.floor(widths.length * 0.1)];
    expect(median).toBeGreaterThanOrEqual(8);
    expect(median).toBeLessThanOrEqual(12);
    expect(p10).toBeGreaterThanOrEqual(6);
  });

  it('cuts each river as a channel 1.5 to 2.5 m deep in mid-stream', () => {
    const depths = riverSamples()
      .filter((p) => !nearCrossing(p.x, p.z) && Math.hypot(p.x, p.z) >= 140)
      .map((p) => WATER_LEVEL - valleyHeightAt(p.x, p.z));
    expect(depths.length).toBeGreaterThan(50);
    for (const d of depths) {
      expect(d).toBeGreaterThanOrEqual(1.5 - 1e-6);
      expect(d).toBeLessThanOrEqual(2.5);
    }
  });

  it('keeps the river under water on its centre line from the foot of the falls to the lake and out of the valley', () => {
    for (const p of riverSamples()) {
      if (nearCrossing(p.x, p.z)) continue;
      expect(isWater(p.x, p.z), `river centre (${p.x.toFixed(0)}, ${p.z.toFixed(0)})`).toBe(true);
    }
  });

  it('keeps every river at least 8 m wide under water from end to end, falls and crossings excepted', () => {
    const widths: number[] = [];
    for (const p of riverSamples()) {
      if (nearCrossing(p.x, p.z)) continue;
      const span = (sign: number) => {
        let d = 0;
        while (d < 40 && isWater(p.x + sign * p.px * d, p.z + sign * p.pz * d)) d += 0.2;
        return d;
      };
      widths.push(span(1) + span(-1));
    }
    expect(widths.length).toBeGreaterThan(100);
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(8);
  });

  it('lets the hero walk down each bank to the water, at a slope of 0.31 or less', () => {
    let banks = 0;
    for (const p of riverSamples()) {
      // The gorge has its own walls (checked below); the bank rule is for the river's own banks.
      if (isGorge(p.x, p.z) || nearCrossing(p.x, p.z) || Math.hypot(p.x, p.z) < 140 || Math.hypot(p.x, p.z) > EDGE_RADIUS - 5) continue;
      for (const side of [1, -1]) {
        let d = 0;
        while (d < 40 && valleyHeightAt(p.x + side * p.px * d, p.z + side * p.pz * d) < WATER_LEVEL) d += 0.1;
        const ex = p.x + side * p.px * d;
        const ez = p.z + side * p.pz * d;
        banks++;
        expect(slopeAt(ex, ez), `bank edge (${ex.toFixed(0)}, ${ez.toFixed(0)})`).toBeLessThanOrEqual(0.31);
        expect(isWalkableGround(ex + side * p.px * 0.5, ez + side * p.pz * 0.5)).toBe(true);
      }
    }
    expect(banks).toBeGreaterThan(50);
  });

  it('builds gorge walls along the last 100 m of the river out: 15 m high, a face steeper than 0.7, and no way down the bank', () => {
    // The river out past the cut at about (304, 71) is the gorge; the samples here are its far part, inside the map.
    const gorge = riverSamples().filter((p) => p.x >= 330 && Math.hypot(p.x, p.z) < 405);
    expect(gorge.length).toBeGreaterThan(20);
    for (const p of gorge) {
      expect(isWater(p.x, p.z), `gorge centre (${p.x.toFixed(0)}, ${p.z.toFixed(0)})`).toBe(true);
      for (const side of [1, -1]) {
        const at = (d: number) => ({ x: p.x + side * p.px * d, z: p.z + side * p.pz * d });
        const top = at(15);
        expect(valleyHeightAt(top.x, top.z)).toBeGreaterThanOrEqual(WATER_LEVEL + 15 - 1e-6);
        const face = at(8);
        expect(walkSlopeAt(face.x, face.z), `wall face (${face.x.toFixed(0)}, ${face.z.toFixed(0)})`).toBeGreaterThanOrEqual(0.7);
        const foot = at(5.5);
        expect(blocksHero(foot.x, foot.z), `wall foot (${foot.x.toFixed(0)}, ${foot.z.toFixed(0)})`).toBe(true);
      }
    }
  });

  it('lists every placed stop once, by name', () => {
    expect(VALLEY_STOPS.length).toBe(46);
    const names = VALLEY_STOPS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('crossing surfaces (§4, "The crossings")', () => {
  it('lays the stepping stones with their tops 0.3 m above the water', () => {
    for (const p of alongCrossing(crossing('stepping_stones'))) {
      expect(walkSurfaceAt(p.x, p.z)).toBeCloseTo(WATER_LEVEL + 0.3, 6);
    }
  });

  it('has the hero wade the ford: the bed is 0.4 m under the water at the centre', () => {
    const ford = crossing('ford');
    expect(walkSurfaceAt(ford.x, ford.z)).toBeCloseTo(WATER_LEVEL - 0.4, 6);
    expect(isWater(ford.x, ford.z)).toBe(true);
  });

  it('keeps every bridge deck at least 1.0 m above the water along its length', () => {
    const decks = VALLEY_CROSSINGS.filter((c) => c.surface === 'deck' && c.walkable !== false);
    expect(decks.map((c) => c.name)).toEqual(['mill_bridge']);
    for (const c of decks) {
      for (const p of alongCrossing(c)) {
        expect(walkSurfaceAt(p.x, p.z), `deck ${c.name} at (${p.x}, ${p.z})`).toBeGreaterThanOrEqual(WATER_LEVEL + 1 - 1e-9);
      }
    }
  });

  it('leaves the ground alone off the crossings', () => {
    for (let z = -VALLEY_HALF_EXTENT; z <= VALLEY_HALF_EXTENT; z += 20) {
      for (let x = -VALLEY_HALF_EXTENT; x <= VALLEY_HALF_EXTENT; x += 20) {
        if (isCrossing(x, z)) continue;
        expect(walkSurfaceAt(x, z)).toBe(valleyHeightAt(x, z));
      }
    }
  });

  it('walks across each walkable crossing from bank to bank, with no step above 0.5 m', () => {
    for (const c of VALLEY_CROSSINGS.filter((k) => k.walkable !== false && k.name !== 'stepping_stones')) {
      const { worstStep, reached } = walkBankToBank(c);
      expect(reached, `crossing ${c.name} not reached`).toBe(true);
      expect(worstStep, `crossing ${c.name} worst step`).toBeLessThanOrEqual(0.5);
    }
  });

  it('keeps the stepping stones level between the stones: no step above 0.5 m along the strip', () => {
    const c = crossing('stepping_stones');
    const len = Math.hypot(c.to.x - c.from.x, c.to.z - c.from.z);
    const dx = (c.to.x - c.from.x) / len;
    const dz = (c.to.z - c.from.z) / len;
    let worst = 0;
    let prev = walkSurfaceAt(c.from.x, c.from.z);
    for (let t = 0.25; t <= len; t += 0.25) {
      const y = walkSurfaceAt(c.from.x + dx * t, c.from.z + dz * t);
      worst = Math.max(worst, Math.abs(y - prev));
      prev = y;
    }
    expect(worst).toBeLessThanOrEqual(0.5);
  });

  // Review 021: a 6 m landing at each end of the stones ramps from the stone top up to the bank.
  it('walks the stepping stones bank to bank with no step above 0.5 m', () => {
    const { worstStep, reached } = walkBankToBank(crossing('stepping_stones'));
    expect(reached, 'stepping stones not reached').toBe(true);
    expect(worstStep, 'stepping stones worst step').toBeLessThanOrEqual(0.5);
  });

  function walkBankToBank(c: LayoutCrossing): { worstStep: number; reached: boolean } {
    const rules: WalkRules = { heightAt: walkSurfaceAt, blocked: blocksWalking, inside: insideValley };
    const len = Math.hypot(c.to.x - c.from.x, c.to.z - c.from.z);
    const dx = (c.to.x - c.from.x) / len;
    const dz = (c.to.z - c.from.z) / len;
    // Start 6 m before the near end and walk to 6 m past the far end, in 0.25 m steps.
    let p = { x: c.from.x - dx * 6, z: c.from.z - dz * 6, y: walkSurfaceAt(c.from.x - dx * 6, c.from.z - dz * 6) };
    const end = { x: c.to.x + dx * 6, z: c.to.z + dz * 6 };
    let worstStep = 0;
    let reached = false;
    for (let i = 0; i < 400 && !reached; i++) {
      const next = walkStep(p, dx, dz, 1, 0.25, rules);
      expect(next.x !== p.x || next.z !== p.z, `crossing ${c.name} blocked at (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`).toBe(true);
      worstStep = Math.max(worstStep, Math.abs(next.y - p.y));
      p = next;
      reached = Math.hypot(end.x - p.x, end.z - p.z) < 0.3;
    }
    return { worstStep, reached };
  }

});
