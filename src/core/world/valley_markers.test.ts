import { describe, expect, it } from 'vitest';
import { createBattle, getHero, step } from '../battle';
import { PATROL_HUT_FIGHT } from '../../data/patrol_hut_fight';
import type { BattleInput } from '../types';
const idle: BattleInput = { moveX: 0, moveZ: 0, camYaw: 0, aimPitch: 0, sprint: false,
  weapon: 'sword', attackPressed: false, attackHeld: false, attackReleased: false, dodgePressed: false };
describe('world combat awareness for valley markers', () => {
  it('has real initial awareness and becomes alert only when the world AI acts', () => {
    const b = createBattle(PATROL_HUT_FIGHT, { heightAt: () => 9, simRadius: 25 });
    expect(getHero(b).awareness).toBeUndefined();
    const enemies = b.fighters.filter(f => f.team === 'enemy');
    expect(enemies.every(f => f.awareness === 'unaware')).toBe(true);
    getHero(b).x = 0;
    getHero(b).z = 0;
    step(b, idle);
    expect(enemies.every(f => f.awareness === 'unaware')).toBe(true);
    getHero(b).x = 306;
    getHero(b).z = -103;
    step(b, idle);
    expect(enemies.every(f => f.awareness === 'alert')).toBe(true);
    getHero(b).x = 0;
    getHero(b).z = 0;
    step(b, idle);
    expect(enemies.every(f => f.awareness === 'alert')).toBe(true);
  });
  it('does not add awareness to flat prototype fights', () => {
    const b = createBattle(PATROL_HUT_FIGHT);
    step(b, idle);
    expect(b.fighters.every(f => f.awareness === undefined)).toBe(true);
  });
});
