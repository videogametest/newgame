import { describe, expect, it } from 'vitest';
import { activeFighters, createBattle, getFighter, getHero, step } from './battle';
import type { ArenaDef, BattleEvent, BattleInput, BattleState, BattleWorld, Spawn } from './types';

const IDLE: BattleInput = {
  moveX: 0, moveZ: 0, camYaw: 0, aimPitch: 0, sprint: false, weapon: 'sword',
  attackPressed: false, attackHeld: false, attackReleased: false, dodgePressed: false,
};

function arena(spawns: Spawn[], halfWidth = 14, halfDepth = 16): ArenaDef {
  return { id: 'ground-test', name: 'Ground test', halfWidth, halfDepth, obstacles: [], spawns, waveGap: 2 };
}

const hero = (x: number, z: number): Spawn => ({ unitId: 'hero', kind: 'hero', team: 'player', x, z, yaw: 0 });
const soldier = (team: 'player' | 'enemy', x: number, z: number): Spawn => ({
  unitId: team === 'player' ? 'ally_soldier' : 'enemy_soldier', kind: 'soldier', team, x, z, yaw: 0,
});

const slope: BattleWorld = { heightAt: (x, z) => 5 + 0.1 * x - 0.05 * z, activeRadius: Infinity };

function run(state: BattleState, steps: number): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (let i = 0; i < steps && state.status === 'fighting'; i++) events.push(...step(state, IDLE));
  return events;
}

describe('fighters on the ground', () => {
  it('every fighter stands on the height function at its own position, moving or not', () => {
    const state = createBattle(arena([hero(0, 0), soldier('enemy', 6, 2), soldier('player', -3, 4)], 30, 30), slope);
    for (const f of state.fighters) expect(f.y).toBeCloseTo(slope.heightAt(f.x, f.z), 9);

    run(state, 120);
    for (const f of state.fighters) {
      if (!f.alive) continue;
      expect(f.y).toBeCloseTo(slope.heightAt(f.x, f.z), 9);
    }
    // The enemy walked toward the hero, so it really did move up or down the slope.
    const enemy = state.fighters.find((f) => f.team === 'enemy')!;
    expect(Math.abs(enemy.y - slope.heightAt(6, 2))).toBeGreaterThan(0.01);
  });

  it('the arena default is flat ground at height zero, and every fighter acts', () => {
    const state = createBattle(arena([hero(0, 0), soldier('enemy', 6, 2)]));
    expect(state.world.activeRadius).toBe(Infinity);
    for (const f of state.fighters) expect(f.y).toBe(0);
    expect(activeFighters(state)).toHaveLength(state.fighters.length);
  });

  it('an arrow hits a fighter by its top above the ground, not by height above sea level', () => {
    const world: BattleWorld = { heightAt: () => 10, activeRadius: Infinity };
    const state = createBattle(arena([hero(0, 0)]), world);
    const h = getHero(state);
    expect(h.y).toBe(10);
    const shot = (y: number) => ({
      id: state.nextId++, team: 'enemy' as const, ownerId: 999, x: h.x + 0.1, y, z: h.z,
      vx: 0, vy: 0, vz: 0, damage: 5, knockback: 0, age: 0, alive: true,
    });
    // Inside the hero's height above his ground: a hit.
    state.projectiles.push(shot(10 + h.height - 0.2));
    const hit = run(state, 1).filter((e) => e.type === 'damage');
    expect(hit).toHaveLength(1);
    expect(hit[0]).toMatchObject({ fighterId: h.id, source: 'arrow' });
  });

  it('an arrow above the hero, measured from the ground under him, flies over', () => {
    const world: BattleWorld = { heightAt: () => 10, activeRadius: Infinity };
    const state = createBattle(arena([hero(0, 0)]), world);
    const h = getHero(state);
    state.projectiles.push({
      id: state.nextId++, team: 'enemy', ownerId: 999, x: h.x + 0.1, y: 10 + h.height + 0.5, z: h.z,
      vx: 0, vy: 0, vz: 0, damage: 5, knockback: 0, age: 0, alive: true,
    });
    const events = run(state, 1);
    expect(events.some((e) => e.type === 'damage')).toBe(false);
  });
});

describe('the active radius', () => {
  it('a fighter farther than the radius from the hero stays exactly where it is', () => {
    const world: BattleWorld = { heightAt: () => 0, activeRadius: 20 };
    const state = createBattle(arena([hero(0, 0), soldier('enemy', 40, 0)], 60, 60), world);
    const enemy = state.fighters.find((f) => f.team === 'enemy')!;
    const start = { x: enemy.x, z: enemy.z };
    expect(activeFighters(state).map((f) => f.id)).not.toContain(enemy.id);

    run(state, 300);
    expect(state.status).toBe('fighting');
    expect(enemy.x).toBe(start.x);
    expect(enemy.z).toBe(start.z);
    expect(enemy.action.phase).toBe('idle');
  });

  it('the same fighter wakes and comes for the hero once the hero comes within the radius', () => {
    const world: BattleWorld = { heightAt: () => 0, activeRadius: 20 };
    const state = createBattle(arena([hero(0, 0), soldier('enemy', 40, 0)], 60, 60), world);
    const enemy = state.fighters.find((f) => f.team === 'enemy')!;
    getHero(state).x = 25;
    expect(activeFighters(state).map((f) => f.id)).toContain(enemy.id);

    run(state, 60);
    expect(enemy.x).toBeLessThan(40);
  });

  it('a frozen fighter is a fixed wall to a moving one: the moving fighter is pushed out and the frozen one stays put', () => {
    const world: BattleWorld = { heightAt: () => 0, activeRadius: 20 };
    // Hero at the origin. The ally at 19.8 m is inside the radius and moves; the enemy at 20.5 m is frozen.
    const state = createBattle(arena([hero(0, 0), soldier('player', 19.8, 0), soldier('enemy', 20.5, 0)], 60, 60), world);
    const ally = state.fighters.find((f) => f.team === 'player' && f.kind === 'soldier')!;
    const enemy = state.fighters.find((f) => f.team === 'enemy')!;
    const minD = ally.radius + enemy.radius;
    expect(Math.hypot(ally.x - enemy.x, ally.z - enemy.z)).toBeLessThan(minD);

    step(state, IDLE);
    expect(enemy.x).toBe(20.5);
    expect(enemy.z).toBe(0);
    expect(Math.hypot(ally.x - enemy.x, ally.z - enemy.z)).toBeGreaterThanOrEqual(minD - 1e-9);
  });

  it('getFighter still finds frozen fighters, and the hero is always active', () => {
    const world: BattleWorld = { heightAt: () => 0, activeRadius: 1 };
    const state = createBattle(arena([hero(0, 0), soldier('enemy', 30, 0)], 60, 60), world);
    const enemy = state.fighters.find((f) => f.team === 'enemy')!;
    expect(getFighter(state, enemy.id)).toBe(enemy);
    expect(activeFighters(state).map((f) => f.id)).toEqual([getHero(state).id]);
  });
});
