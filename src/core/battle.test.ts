import { describe, expect, it } from 'vitest';
import { TUNING } from '../config/tuning';
import { TRAINING_FIELD } from '../data/arena';
import { botInput } from './bot';
import {
  createBattle, getFighter, getHero, isDodgeInvulnerable, step,
} from './battle';
import type { ArenaDef, BattleEvent, BattleInput, BattleState, Fighter, Spawn } from './types';

const IDLE: BattleInput = {
  moveX: 0, moveZ: 0, camYaw: 0, aimPitch: 0, sprint: false, weapon: 'sword',
  attackPressed: false, attackHeld: false, attackReleased: false, dodgePressed: false,
};

function arenaWith(spawns: Spawn[]): ArenaDef {
  return { id: 'test', name: 'Test', halfWidth: 14, halfDepth: 16, obstacles: [], spawns };
}

const hero = (x: number, z: number): Spawn => ({ unitId: 'hero', kind: 'hero', team: 'player', x, z, yaw: 0 });
const soldier = (team: 'player' | 'enemy', x: number, z: number, yaw: number): Spawn => ({
  unitId: team === 'player' ? 'ally_soldier' : 'enemy_soldier', kind: 'soldier', team, x, z, yaw,
});

function run(state: BattleState, steps: number, input: BattleInput | ((s: BattleState) => BattleInput)) {
  const events: BattleEvent[] = [];
  for (let i = 0; i < steps && state.status === 'fighting'; i++) {
    const inp = typeof input === 'function' ? input(state) : input;
    events.push(...step(state, inp));
  }
  return events;
}

function dist(a: Fighter, b: Fighter) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

describe('team collisions', () => {
  it('an ally spawned behind a stationary hero walks through it and strikes an enemy', () => {
    // Hero stands still at the origin. Ally starts behind it, enemy waits in front.
    // The enemy is far enough that only the ally can reach it in time.
    const state = createBattle(arenaWith([
      hero(0, 0),
      soldier('player', 0, -2.5, 0),
      soldier('enemy', 0, 7, Math.PI),
    ]));
    const ally = state.fighters[1];
    const enemy = state.fighters[2];
    const enemyStartHp = enemy.hp;
    let allyPassedHero = false;
    let allyStruck = false;
    for (let i = 0; i < 60 * 12 && state.status === 'fighting' && !allyStruck; i++) {
      const events = step(state, IDLE);
      if (ally.z > getHero(state).z + 0.1) allyPassedHero = true;
      if (events.some((e) => e.type === 'strike' && e.fighterId === ally.id)) allyStruck = true;
    }
    expect(allyPassedHero).toBe(true);
    expect(allyStruck).toBe(true);
    expect(enemy.hp).toBeLessThan(enemyStartHp);
  });

  it('teammates may overlap', () => {
    const state = createBattle(arenaWith([
      hero(0, 0),
      soldier('player', 0.1, 0, 0),
      soldier('enemy', -8, -8, 0),
    ]));
    const hero0 = getHero(state);
    const ally = state.fighters[1];
    const minD = hero0.radius + ally.radius;
    let closest = Infinity;
    for (let i = 0; i < 30; i++) {
      step(state, IDLE);
      closest = Math.min(closest, dist(hero0, ally));
    }
    expect(closest).toBeLessThan(minD * 0.5);
  });

  it('opposing fighters push each other apart', () => {
    const state = createBattle(arenaWith([
      hero(0, 0),
      soldier('enemy', 0, 1.2, Math.PI),
    ]));
    const hero0 = getHero(state);
    const enemy = state.fighters[1];
    const minD = hero0.radius + enemy.radius;
    const forward: BattleInput = { ...IDLE, moveZ: 1 };
    for (let i = 0; i < 90 && state.status === 'fighting'; i++) {
      step(state, forward);
      expect(dist(hero0, enemy)).toBeGreaterThanOrEqual(minD - 1e-6);
    }
  });
});

describe('dodge', () => {
  it('the opening frames of a roll are invulnerable and then end', () => {
    const state = createBattle(arenaWith([hero(0, 0), soldier('enemy', 0, 6, Math.PI)]));
    const h = getHero(state);
    step(state, { ...IDLE, dodgePressed: true });
    expect(isDodgeInvulnerable(h)).toBe(true);
    const iframeSteps = Math.ceil(TUNING.hero.dodgeIFrames * 60) + 2;
    for (let i = 0; i < iframeSteps; i++) step(state, IDLE);
    expect(isDodgeInvulnerable(h)).toBe(false);
    expect(h.dodgeTime).toBeGreaterThan(0);
  });

  it('a strike landing during the roll does no damage; without the roll it does', () => {
    // Put an enemy one step from landing a strike on the hero.
    const setup = () => {
      const state = createBattle(arenaWith([hero(0, 0), soldier('enemy', 0, 1.5, Math.PI)]));
      const enemy = state.fighters[1];
      enemy.action = {
        phase: 'windup', t: TUNING.soldier.windupTime - TUNING.fixedDt / 2,
        struck: false, zoneX: 0, zoneZ: 0,
      };
      return state;
    };

    const dodged = setup();
    const dodgeEvents = step(dodged, { ...IDLE, dodgePressed: true });
    expect(dodgeEvents.some((e) => e.type === 'strike')).toBe(true);
    expect(getHero(dodged).hp).toBe(getHero(dodged).maxHp);
    expect(dodgeEvents.some((e) => e.type === 'damage')).toBe(false);

    const standing = setup();
    const standEvents = step(standing, IDLE);
    expect(standEvents.some((e) => e.type === 'damage')).toBe(true);
    expect(getHero(standing).hp).toBeLessThan(getHero(standing).maxHp);
  });
});

describe('determinism', () => {
  it('the same inputs produce the same battle', () => {
    const a = createBattle(TRAINING_FIELD);
    const b = createBattle(TRAINING_FIELD);
    run(a, 900, botInput);
    run(b, 900, botInput);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('training field with the bot', () => {
  it('the bot wins the training field and the battle reaches a victory outcome', () => {
    const state = createBattle(TRAINING_FIELD);
    const events = run(state, 60 * 180, botInput);
    expect(state.status).toBe('victory');
    expect(getHero(state).alive).toBe(true);
    expect(events.some((e) => e.type === 'outcome' && e.status === 'victory')).toBe(true);
  });

  it('the hero spawns with a sword equipped and both allies alive at the start', () => {
    const state = createBattle(TRAINING_FIELD);
    expect(getHero(state).weapon).toBe('sword');
    expect(state.fighters.filter((f) => f.team === 'player' && f.alive)).toHaveLength(3);
    expect(getFighter(state, state.heroId)).toBe(getHero(state));
  });
});
