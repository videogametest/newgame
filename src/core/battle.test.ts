import { describe, expect, it } from 'vitest';
import { TUNING } from '../config/tuning';
import { createGameState } from './state';
import { createBattle, FIXED_DT, hero, stepBattle } from './battle';
import type { BattleInput, BattleState, Fighter } from './types';

const idle: BattleInput = {
  moveDir: 0,
  weapon: 'sword',
  attackPressed: false,
  attackHeld: false,
  attackReleased: false,
  aimX: 0,
  aimY: 0,
};

const input = (over: Partial<BattleInput>): BattleInput => ({ ...idle, ...over });

function run(s: BattleState, steps: number, inp: BattleInput = idle): void {
  for (let i = 0; i < steps; i++) stepBattle(s, i === 0 ? inp : { ...inp, attackPressed: false, attackReleased: false }, FIXED_DT);
}

/** A battle with only the hero, the given allies, and the given enemies. */
function withFighters(keep: (f: Fighter) => boolean): BattleState {
  const s = createBattle();
  s.fighters = s.fighters.filter(keep);
  return s;
}

function enemiesOf(s: BattleState): Fighter[] {
  return s.fighters.filter((f) => f.team === 'enemy');
}

describe('createBattle', () => {
  it('starts with the hero, two allies, and two enemies, all alive', () => {
    const s = createBattle();
    expect(s.status).toBe('fighting');
    expect(s.fighters.filter((f) => f.team === 'player')).toHaveLength(3);
    expect(enemiesOf(s)).toHaveLength(2);
    expect(s.fighters.every((f) => f.alive)).toBe(true);
    expect(hero(s).kind).toBe('hero');
  });
});

describe('hero sword', () => {
  it('kills a weakened enemy in reach and wins the battle when none remain', () => {
    const s = withFighters((f) => f.team === 'player' || f.unitId === 'soldier');
    const h = hero(s);
    const foe = enemiesOf(s)[0];
    foe.x = h.x + 100;
    foe.hp = TUNING.weapons.sword.damage;
    // Stop the foe from walking or striking during the swing.
    foe.cooldown = 99;
    run(s, 1, input({ attackPressed: true, aimX: h.x + 200, aimY: h.y }));
    expect(foe.alive).toBe(false);
    expect(s.status).toBe('victory');
  });

  it('does not hit a foe out of reach', () => {
    const s = withFighters((f) => f.team === 'player' || f.unitId === 'soldier');
    const h = hero(s);
    const foe = enemiesOf(s)[0];
    foe.x = h.x + 400;
    foe.cooldown = 99;
    run(s, 1, input({ attackPressed: true, aimX: h.x + 200, aimY: h.y }));
    expect(foe.hp).toBe(foe.maxHp);
    expect(s.status).toBe('fighting');
  });
});

describe('outcomes', () => {
  it('is victory once every enemy is dead', () => {
    const s = createBattle();
    for (const e of enemiesOf(s)) {
      e.alive = false;
      e.hp = 0;
    }
    run(s, 1);
    expect(s.status).toBe('victory');
  });

  it('is defeat when the hero dies', () => {
    const s = createBattle();
    const h = hero(s);
    h.hp = 5;
    s.projectiles.push({
      id: 999,
      team: 'enemy',
      x: h.x,
      y: h.y - 40,
      vx: 0,
      vy: 0,
      damage: 10,
      knockback: 0,
      alive: true,
    });
    run(s, 1);
    expect(h.alive).toBe(false);
    expect(s.status).toBe('defeat');
  });
});

describe('projectiles', () => {
  it('an allied arrow damages an enemy it strikes', () => {
    const s = withFighters((f) => f.team === 'player' || f.unitId === 'soldier');
    const foe = enemiesOf(s)[0];
    foe.cooldown = 99;
    const hpBefore = foe.hp;
    s.projectiles.push({
      id: 999,
      team: 'player',
      x: foe.x - 10,
      y: foe.y - 40,
      vx: 0,
      vy: 0,
      damage: 9,
      knockback: 0,
      alive: true,
    });
    run(s, 1);
    expect(foe.hp).toBe(hpBefore - 9);
    expect(s.projectiles).toHaveLength(0);
  });

  it('a full-draw bow shot fires the maximum-damage arrow', () => {
    const s = withFighters((f) => f.team === 'player' || f.unitId === 'soldier');
    const h = hero(s);
    const foe = enemiesOf(s)[0];
    foe.cooldown = 99;
    foe.x = h.x + 350;
    run(s, 60, input({ weapon: 'bow', attackHeld: true, aimX: foe.x, aimY: foe.y - 50 }));
    stepBattle(s, input({ weapon: 'bow', attackReleased: true, aimX: foe.x, aimY: foe.y - 50 }), FIXED_DT);
    const arrow = s.projectiles.find((p) => p.team === 'player');
    expect(arrow?.damage).toBe(TUNING.weapons.bow.maxDamage);
  });
});

describe('archer', () => {
  it('fires at the hero when within its range', () => {
    const s = withFighters((f) => f.team === 'player' || f.unitId === 'archer');
    const archer = enemiesOf(s)[0];
    archer.x = hero(s).x + 400;
    run(s, 1);
    expect(s.projectiles.some((p) => p.team === 'enemy')).toBe(true);
  });
});

describe('save state', () => {
  it('round-trips through JSON with its version intact', () => {
    const g = createGameState();
    const copy = JSON.parse(JSON.stringify(g));
    expect(copy.version).toBe(1);
    expect(copy.battle.heroId).toBe(g.battle.heroId);
    expect(copy.battle.fighters).toHaveLength(g.battle.fighters.length);
  });
});

describe('headless run', () => {
  it('a simple hero bot finishes a battle with a terminal outcome', () => {
    const s = createBattle();
    const maxSteps = 60 * 180;
    let steps = 0;
    while (s.status === 'fighting' && steps < maxSteps) {
      const h = hero(s);
      const foes = enemiesOf(s).filter((f) => f.alive);
      const foe = foes.reduce<Fighter | undefined>(
        (best, f) => (!best || Math.abs(f.x - h.x) < Math.abs(best.x - h.x) ? f : best),
        undefined,
      );
      const dir = foe ? (foe.x > h.x + 20 ? 1 : foe.x < h.x - 20 ? -1 : 0) : 0;
      const inReach = foe !== undefined && Math.abs(foe.x - h.x) < 110;
      stepBattle(
        s,
        {
          moveDir: dir,
          weapon: 'sword',
          attackPressed: inReach && h.cooldown <= 0,
          attackHeld: false,
          attackReleased: false,
          aimX: foe ? foe.x : h.x,
          aimY: h.y,
        },
        FIXED_DT,
      );
      steps++;
    }
    expect(s.status).not.toBe('fighting');
  });
});

describe('body collisions', () => {
  it('an ally behind a stationary hero walks past it and attacks an enemy', () => {
    const s = createBattle();
    const h = hero(s);
    const ally = s.fighters.find((f) => f.team === 'player' && f.unitId === 'soldier');
    const foe = enemiesOf(s).find((f) => f.unitId === 'soldier');
    expect(ally).toBeDefined();
    expect(foe).toBeDefined();
    s.fighters = [h, ally!, foe!];
    h.x = 500;
    ally!.x = 400; // spawned behind the hero
    foe!.x = 900;
    foe!.cooldown = 99; // the foe cannot strike back, so any damage is the ally's
    let passed = false;
    let steps = 0;
    while (foe!.hp === foe!.maxHp && steps < 60 * 20) {
      stepBattle(s, idle, FIXED_DT);
      if (ally!.x > h.x) passed = true;
      steps++;
    }
    expect(passed).toBe(true);
    expect(foe!.hp).toBeLessThan(foe!.maxHp);
  });

  it('opposing fighters still push each other apart', () => {
    const s = createBattle();
    const h = hero(s);
    const foe = enemiesOf(s).find((f) => f.unitId === 'soldier')!;
    s.fighters = [h, foe];
    h.x = 500;
    foe.x = 510;
    foe.cooldown = 99;
    run(s, 1);
    expect(Math.abs(foe.x - h.x)).toBeGreaterThanOrEqual((h.width + foe.width) / 2 - 1e-6);
  });
});
