import { describe, expect, it } from 'vitest';
import { createBattle, getHero, reviveHero, step } from './battle';
import type { ArenaDef, BattleEvent, BattleInput, Spawn } from './types';

// The valley's knock-down fight (task 004 item 8): no win, no loss, and a downed hero stands back up.

const IDLE: BattleInput = {
  moveX: 0, moveZ: 0, camYaw: 0, aimPitch: 0, sprint: false, weapon: 'sword',
  attackPressed: false, attackHeld: false, attackReleased: false, dodgePressed: false,
};

const hero = (x: number, z: number): Spawn => ({ unitId: 'hero', kind: 'hero', team: 'player', x, z, yaw: 0 });
const soldier = (x: number, z: number): Spawn => ({ unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x, z, yaw: 0 });

function arena(): ArenaDef {
  return { id: 'open', name: 'Open', halfWidth: 40, halfDepth: 40, obstacles: [], spawns: [hero(0, 0), soldier(4, 0)], waveGap: 0 };
}

/** A fight where the hero has just fallen and the only enemy is already down. */
function downedFight(openEnded: boolean) {
  const state = createBattle(arena());
  if (openEnded) state.openEnded = true;
  const h = getHero(state);
  h.x = 2.5;
  h.z = -1.5;
  h.alive = false;
  h.hp = 0;
  h.hitTimer = 0.2;
  h.flashTimer = 0.3;
  h.knockX = 1;
  h.drawTime = 0.5;
  h.dodgeTime = 0.1;
  h.action = { phase: 'swing', t: 0.1, struck: true, zoneX: 1, zoneZ: 1 };
  for (const f of state.fighters) if (f.team === 'enemy') f.alive = false;
  return state;
}

describe('reviveHero', () => {
  it('stands a downed hero up where he fell, at full health, with every action and timer cleared', () => {
    const state = downedFight(true);
    const h = getHero(state);
    const revived = reviveHero(state);
    expect(revived).toBe(true);
    expect(h.alive).toBe(true);
    expect(h.hp).toBe(h.maxHp);
    expect(h.x).toBe(2.5);
    expect(h.z).toBe(-1.5);
    expect(h.action.phase).toBe('idle');
    expect(h.hitTimer).toBe(0);
    expect(h.flashTimer).toBe(0);
    expect(h.knockX).toBe(0);
    expect(h.drawTime).toBe(0);
    expect(h.dodgeTime).toBe(0);
  });

  it('leaves a living hero unchanged and reports no revive', () => {
    const state = createBattle(arena());
    const h = getHero(state);
    h.hp = 10;
    expect(reviveHero(state)).toBe(false);
    expect(h.alive).toBe(true);
    expect(h.hp).toBe(10);
  });
});

describe('open-ended fight', () => {
  it('emits no outcome when the hero is down and every enemy is down', () => {
    const state = downedFight(true);
    const events: BattleEvent[] = step(state, IDLE);
    expect(events.some((e) => e.type === 'outcome')).toBe(false);
    expect(state.status).toBe('fighting');
  });

  it('keeps the arena rules when the flag is absent: the same downed hero is a defeat', () => {
    const state = downedFight(false);
    const events = step(state, IDLE);
    expect(events).toContainEqual({ type: 'outcome', status: 'defeat' });
    expect(state.status).toBe('defeat');
  });
});
