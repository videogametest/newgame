import { describe, expect, it } from 'vitest';
import { TUNING } from '../config/tuning';
import { createBattle, getHero, step } from './battle';
import type { ArenaDef, BattleGround, BattleInput, BattleState, Projectile, Spawn } from './types';
import type { Footprint } from './world/solids';

const IDLE: BattleInput = {
  moveX: 0, moveZ: 0, camYaw: 0, aimPitch: 0, sprint: false, weapon: 'sword',
  attackPressed: false, attackHeld: false, attackReleased: false, dodgePressed: false,
};
const RUN_RIGHT: BattleInput = { ...IDLE, moveX: 1 };

function arenaWith(spawns: Spawn[]): ArenaDef {
  return { id: 'ground-test', name: 'Ground test', halfWidth: 200, halfDepth: 200, obstacles: [], spawns, waveGap: 2 };
}

const hero = (x: number, z: number): Spawn => ({ unitId: 'hero', kind: 'hero', team: 'player', x, z, yaw: 0 });
const enemySoldier = (x: number, z: number): Spawn => ({
  unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x, z, yaw: Math.PI,
});

function slope(): BattleGround {
  return { heightAt: (gx) => 2 + 0.25 * gx, simRadius: 1000 };
}

describe('flat battles keep their behaviour', () => {
  it('without a ground, fighters sit at height 0 and no ground is stored', () => {
    const state = createBattle(arenaWith([hero(0, 0), enemySoldier(6, 0)]));
    expect(state.ground).toBeUndefined();
    step(state, IDLE);
    for (const f of state.fighters) expect(f.y).toBe(0);
  });
});

describe('fighters stand on the ground', () => {
  it('each fighter height is the ground under it, including the hero who moves', () => {
    const state = createBattle(arenaWith([hero(0, 0), enemySoldier(6, 0)]), slope());
    for (let i = 0; i < 30; i++) step(state, RUN_RIGHT);
    const h = getHero(state);
    expect(h.x).toBeGreaterThan(0.5);
    expect(h.y).toBeCloseTo(2 + 0.25 * h.x, 9);
    for (const f of state.fighters) expect(f.y).toBeCloseTo(2 + 0.25 * f.x, 9);
  });

  it('a fighter spawned on raised ground starts at that height', () => {
    const state = createBattle(arenaWith([hero(0, 0), enemySoldier(8, 0)]), slope());
    expect(getHero(state).y).toBe(2);
    const enemy = state.fighters.find((f) => f.team === 'enemy')!;
    expect(enemy.y).toBeCloseTo(4, 9);
  });
});

describe('only fighters near the hero are simulated', () => {
  it('an enemy beyond simRadius stays frozen while a near one acts', () => {
    const ground: BattleGround = { heightAt: () => 0, simRadius: 30 };
    const state = createBattle(arenaWith([hero(0, 0), enemySoldier(60, 0), enemySoldier(20, 0)]), ground);
    const far = state.fighters.find((f) => f.team === 'enemy' && f.x === 60)!;
    const near = state.fighters.find((f) => f.team === 'enemy' && f.x === 20)!;
    for (let i = 0; i < 120; i++) step(state, IDLE);
    expect(far.x).toBe(60);
    expect(far.z).toBe(0);
    expect(far.vx).toBe(0);
    expect(near.x).not.toBe(20);
  });

  it('the same far enemy moves when there is no ground (flat arenas simulate everyone)', () => {
    const state = createBattle(arenaWith([hero(0, 0), enemySoldier(60, 0)]));
    const far = state.fighters.find((f) => f.team === 'enemy')!;
    for (let i = 0; i < 120; i++) step(state, IDLE);
    expect(far.x).not.toBe(60);
  });

  it('a frozen fighter starts acting once the hero comes within simRadius', () => {
    const ground: BattleGround = { heightAt: () => 0, simRadius: 30 };
    const state: BattleState = createBattle(arenaWith([hero(0, 0), enemySoldier(60, 0)]), ground);
    const far = state.fighters.find((f) => f.team === 'enemy')!;
    for (let i = 0; i < 30; i++) step(state, IDLE);
    expect(far.x).toBe(60);
    const h = getHero(state);
    h.x = 45;
    for (let i = 0; i < 60; i++) step(state, IDLE);
    expect(far.x).not.toBe(60);
  });
});

describe('arrows use world height', () => {
  it('an arrow lands on the ground under it, not at height zero', () => {
    const ground: BattleGround = { heightAt: () => 10, simRadius: 1000 };
    const state = createBattle(arenaWith([hero(0, 0), enemySoldier(40, 0)]), ground);
    const hero0 = getHero(state);
    const arrow: Projectile = {
      id: state.nextId++, team: 'player', ownerId: hero0.id, x: 20, y: 10.05, z: 0,
      vx: 0, vy: -50, vz: 0, damage: 5, knockback: 0, age: 0, alive: true,
    };
    state.projectiles.push(arrow);
    step(state, IDLE);
    expect(arrow.alive).toBe(false);
  });

  it('an arrow at the height of a fighter standing on a hill hits that fighter', () => {
    const ground: BattleGround = { heightAt: (x) => (x > 30 ? 10 : 0), simRadius: 1000 };
    const state = createBattle(arenaWith([hero(0, 0), enemySoldier(40, 0)]), ground);
    const enemy = state.fighters.find((f) => f.team === 'enemy')!;
    expect(enemy.y).toBe(10);
    const before = enemy.hp;
    state.projectiles.push({
      id: state.nextId++, team: 'player', ownerId: getHero(state).id, x: 40, y: 11, z: 0,
      vx: 0, vy: 0, vz: 0, damage: 5, knockback: 0, age: 0, alive: true,
    });
    step(state, IDLE);
    expect(enemy.hp).toBeLessThan(before);
  });
});

describe('arrows meet terrain and solids', () => {
  // A hero shot from (0, 0) flies along +x at 50 m/s and drops under gravity. Launched at this height it reaches
  // x = 40 at 1.2 m, inside a standing soldier's body. The enemy is beyond simRadius, so it stays where it is.
  const SHOT_SPEED = 50;
  const launchHeight = 1.2 + 0.5 * TUNING.gravity * (40 / SHOT_SPEED) ** 2;
  // An arrow is checked once per fixed step, so it stops on the first step that lands inside an obstacle: up to one
  // step (about 0.83 m) past the face of the rise or wall.
  const STEP = SHOT_SPEED * TUNING.fixedDt;
  const frozenGround = (extra: Partial<BattleGround> = {}): BattleGround => ({ heightAt: () => 0, simRadius: 30, ...extra });

  function shoot(ground: BattleGround): { arrow: Projectile; enemy: { hp: number }; before: number } {
    const state = createBattle(arenaWith([hero(0, 0), enemySoldier(40, 0)]), ground);
    const enemy = state.fighters.find((f) => f.team === 'enemy')!;
    const before = enemy.hp;
    const arrow: Projectile = {
      id: state.nextId++, team: 'player', ownerId: getHero(state).id, x: 0, y: launchHeight, z: 0,
      vx: SHOT_SPEED, vy: 0, vz: 0, damage: 5, knockback: 0, age: 0, alive: true,
    };
    state.projectiles.push(arrow);
    for (let i = 0; i < 120 && arrow.alive; i++) step(state, IDLE);
    return { arrow, enemy, before };
  }

  it('a shot over a rise passes the rise and hits the enemy beyond it', () => {
    const rise = (x: number) => (x > 18 && x < 26 ? 2.5 : 0);
    const { arrow, enemy, before } = shoot(frozenGround({ heightAt: rise }));
    expect(enemy.hp).toBeLessThan(before);
    expect(arrow.alive).toBe(false);
    expect(arrow.x).toBeGreaterThan(38);
  });

  it('a rise taller than the arrow stops it before the enemy', () => {
    const rise = (x: number) => (x > 18 && x < 26 ? 6 : 0);
    const { arrow, enemy, before } = shoot(frozenGround({ heightAt: rise }));
    expect(arrow.alive).toBe(false);
    expect(arrow.x).toBeLessThan(18 + STEP);
    expect(enemy.hp).toBe(before);
  });

  it('a shot into a wall stops at the wall and does not reach the enemy', () => {
    const wall: Footprint[] = [{ x: 20, z: 0, facing: 0, half: 2 }];
    const { arrow, enemy, before } = shoot(frozenGround({ solids: wall }));
    expect(arrow.alive).toBe(false);
    expect(arrow.x).toBeLessThan(18 + STEP);
    expect(arrow.x).toBeGreaterThan(10);
    expect(enemy.hp).toBe(before);
  });

  it('a shot through a doorway gap passes the wall and hits the enemy', () => {
    const wallWithGap: Footprint[] = [
      { x: 20, z: -6, facing: 0, half: 2 },
      { x: 20, z: 6, facing: 0, half: 2 },
    ];
    const state = createBattle(arenaWith([hero(0, 0), enemySoldier(40, 0)]), frozenGround({ solids: wallWithGap }));
    const enemy = state.fighters.find((f) => f.team === 'enemy')!;
    const before = enemy.hp;
    const arrow: Projectile = {
      id: state.nextId++, team: 'player', ownerId: getHero(state).id, x: 0, y: launchHeight, z: 0,
      vx: SHOT_SPEED, vy: 0, vz: 0, damage: 5, knockback: 0, age: 0, alive: true,
    };
    state.projectiles.push(arrow);
    for (let i = 0; i < 120 && arrow.alive; i++) step(state, IDLE);
    expect(enemy.hp).toBeLessThan(before);
    expect(arrow.x).toBeGreaterThan(38);
  });

  it('with no solids set, the same shot is unchanged from a flat ground', () => {
    const flat = shoot(frozenGround());
    const none = shoot(frozenGround({ solids: [] }));
    expect(none.enemy.hp).toBe(flat.enemy.hp);
    expect(none.arrow.x).toBeCloseTo(flat.arrow.x, 9);
  });
});

describe('a flat ground changes nothing', () => {
  // The same scripted fight, run twice: once with no ground, once with a ground at height 0 that simulates everyone.
  function scriptedFight(ground?: BattleGround) {
    const state = createBattle(arenaWith([hero(0, 0), enemySoldier(12, 0), enemySoldier(-14, 3), enemySoldier(30, -6)]), ground);
    const events: string[] = [];
    for (let t = 0; t < 1500 && state.status === 'fighting'; t++) {
      const phase = t % 50;
      const input: BattleInput = {
        ...IDLE,
        moveX: t % 300 < 200 ? 1 : -1,
        weapon: t > 700 ? 'bow' : 'sword',
        attackPressed: phase === 10,
        attackHeld: phase >= 10 && phase < 30,
        attackReleased: phase === 30,
      };
      for (const e of step(state, input)) events.push(JSON.stringify(e));
    }
    const fighters = state.fighters.map((f) => ({ x: f.x, y: f.y, z: f.z, hp: f.hp, alive: f.alive, team: f.team }));
    return { fighters, events, status: state.status, time: state.time, projectiles: state.projectiles.length };
  }

  it('a fight with no ground and with a flat ground at height 0 ends the same way', () => {
    const none = scriptedFight(undefined);
    const flat = scriptedFight({ heightAt: () => 0, simRadius: Infinity });
    expect(none.events.length).toBeGreaterThan(20);
    expect(flat).toEqual(none);
  });
});
