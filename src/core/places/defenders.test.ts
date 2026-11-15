import { describe, expect, it } from 'vitest';
import { garrisonOf } from '../../data/bandits';
import { MILL_SPOTS } from '../../data/mill_spots';
import { PLACE_DAYS, GUARD_CHANGES } from '../../data/place_days';
import { blocksHero, isWalkableGround } from '../world/valley';
import { MILL_GRID, PATROL_WALK_SECONDS, alongPath, defendersAt, legPath, patrolAt, spotPosition } from './defenders';

const at = (h: number, m = 0, s = 0) => h + m / 60 + s / 3600;
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

describe('Mill spots', () => {
  it('every spot stands on walkable, unblocked ground', () => {
    for (const [name, p] of Object.entries(MILL_SPOTS)) {
      expect(blocksHero(p.x, p.z), `${name} is blocked`).toBe(false);
      expect(isWalkableGround(p.x, p.z), `${name} is not walkable`).toBe(true);
    }
  });

  it('every spot named in the Mill day data exists in MILL_SPOTS', () => {
    for (const s of PLACE_DAYS.mill.spots) expect(MILL_SPOTS[s], s).toBeDefined();
  });

  it('spotPosition throws for an unknown spot', () => {
    expect(() => spotPosition('mill', 'nowhere')).toThrow();
  });
});

describe('patrol legs', () => {
  it('every leg of both Mill routes has a walking path', () => {
    for (const route of PLACE_DAYS.mill.routes) {
      const stops = route.stops.map(s => s.spot);
      for (let i = 0; i < stops.length; i++) {
        const from = spotPosition('mill', stops[(i - 1 + stops.length) % stops.length]);
        const to = spotPosition('mill', stops[i]);
        expect(() => legPath(from, to), `${route.id} leg into ${stops[i]}`).not.toThrow();
      }
    }
  });

  it('a legPath stays on unblocked ground and inside the grid', () => {
    const line = legPath(spotPosition('mill', 'yard'), spotPosition('mill', 'wheel'));
    expect(line[0]).toEqual(spotPosition('mill', 'yard'));
    expect(line[line.length - 1]).toEqual(spotPosition('mill', 'wheel'));
    const g = MILL_GRID;
    for (const p of line) {
      expect(p.x).toBeGreaterThanOrEqual(g.originX);
      expect(p.x).toBeLessThanOrEqual(g.originX + g.width);
      expect(p.z).toBeGreaterThanOrEqual(g.originZ);
      expect(p.z).toBeLessThanOrEqual(g.originZ + g.depth);
      // Path points sit on whole-metre cells, so they are checked for the cell they occupy.
      expect(blocksHero(Math.round(p.x), Math.round(p.z)), `(${p.x}, ${p.z}) blocked`).toBe(false);
    }
  });

  it('alongPath walks from the start to the end and reports the heading', () => {
    const line = [{ x: 0, z: 0 }, { x: 10, z: 0 }];
    expect(alongPath(line, 0)).toMatchObject({ x: 0, z: 0 });
    expect(alongPath(line, 0.5)).toMatchObject({ x: 5, z: 0 });
    expect(alongPath(line, 1)).toMatchObject({ x: 10, z: 0 });
    expect(alongPath(line, 0.5).yaw).toBeCloseTo(Math.PI / 2);
  });
});

describe('patrols', () => {
  it('a patrol stands at its stop once the walk-in window has passed', () => {
    const route = PLACE_DAYS.mill.routes[0];
    const second = route.stops[1];
    expect(second.seconds).toBeGreaterThan(PATROL_WALK_SECONDS);
    const t = route.stops[0].seconds + PATROL_WALK_SECONDS + 1;
    expect(patrolAt(route, 'mill', t, 0).moving).toBe(false);
  });

  it('walking patrols stay on walkable ground across the day', () => {
    for (const route of PLACE_DAYS.mill.routes) {
      for (let s = 0; s < 86400; s += 15) {
        const p = patrolAt(route, 'mill', s, 0);
        if (!p.moving) continue;
        expect(isWalkableGround(p.x, p.z), `${route.id} at ${s}s`).toBe(true);
      }
    }
  });

  it('a patrol is walking in during the first window of a stop', () => {
    const route = PLACE_DAYS.mill.routes[0];
    const r0 = route.stops[0].seconds;
    const p = patrolAt(route, 'mill', r0 + 1, 0);
    expect(p.moving).toBe(true);
    expect(PATROL_WALK_SECONDS).toBeGreaterThan(0);
  });
});

describe('defenders at the Mill', () => {
  const garrison = garrisonOf('mill', false);

  it('the first garrison has seven defenders at noon', () => {
    expect(defendersAt('mill', at(12)).length).toBe(garrison.length);
    expect(garrison.length).toBe(7);
  });

  it('nessa_roke is absent at the 18:00 guard change and present 8 s later', () => {
    expect(GUARD_CHANGES.gapSeconds).toBe(8);
    expect(GUARD_CHANGES.hours).toContain(18);
    const before = defendersAt('mill', at(18, 0, -1));
    expect(before.find(d => d.id === 'nessa_roke')?.present).toBe(true);
    const during = defendersAt('mill', at(18, 0, 4));
    expect(during.find(d => d.id === 'nessa_roke')?.present).toBe(false);
    const after = defendersAt('mill', at(18, 0, 9));
    expect(after.find(d => d.id === 'nessa_roke')?.present).toBe(true);
  });

  it('every standing defender is on walkable ground', () => {
    for (let h = 0; h < 24; h += 0.5) {
      for (const d of defendersAt('mill', h)) {
        if (!d.present || d.moving) continue;
        expect(isWalkableGround(d.x, d.z), `${d.id} at ${h}h`).toBe(true);
      }
    }
  });

  it('no two standing defenders share a point', () => {
    for (const h of [8, 13, 18, 0]) {
      const standing = defendersAt('mill', h).filter(d => d.present && !d.moving);
      for (let i = 0; i < standing.length; i++) {
        for (let j = i + 1; j < standing.length; j++) {
          expect(dist(standing[i], standing[j]), `${standing[i].id}/${standing[j].id} at ${h}h`).toBeGreaterThan(0.5);
        }
      }
    }
  });
});
