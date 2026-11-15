import { describe, expect, it } from 'vitest';
import { PATROL_HUT_CENTRE, PATROL_HUT_FIGHT } from '../../data/patrol_hut_fight';
import { botInput, SKILLED_BOT, SWORD_ONLY_BOT } from '../bot';
import { createBattle, getHero, step } from '../battle';
import { solidAt } from './solids';
import { isWalkableGround, valleySolids } from './valley';
import { valleyBattleGround } from './valley_battle';

const ground = valleyBattleGround();
const solids = valleySolids();
const CLEAR_OF_HUT = 8;

describe('the patrol hut fight spawns', () => {
  it('puts every fighter on walkable ground, outside every solid, and clear of the hut', () => {
    for (const s of PATROL_HUT_FIGHT.spawns) {
      expect(isWalkableGround(s.x, s.z), `${s.unitId} at ${s.x},${s.z}`).toBe(true);
      expect(solidAt(solids, s.x, s.z), `${s.unitId} inside a solid`).toBe(false);
      const d = Math.hypot(s.x - PATROL_HUT_CENTRE.x, s.z - PATROL_HUT_CENTRE.z);
      expect(d, `${s.unitId} ${d.toFixed(1)} m from the hut`).toBeGreaterThan(CLEAR_OF_HUT);
    }
  });

  it('starts with the hero and the enemies all standing on the ground under them', () => {
    const state = createBattle(PATROL_HUT_FIGHT, ground);
    const hero = getHero(state);
    expect(hero.y).toBeCloseTo(ground.heightAt(hero.x, hero.z), 6);
    const enemies = state.fighters.filter((f) => f.team === 'enemy');
    expect(enemies).toHaveLength(3);
    for (const f of enemies) expect(f.y).toBeCloseTo(ground.heightAt(f.x, f.z), 6);
  });
});

/** Plays the fight with the given bot until it ends or the time limit passes. Returns the outcome and time. */
function play(options: typeof SKILLED_BOT, limit = 240) {
  const state = createBattle(PATROL_HUT_FIGHT, ground);
  while (state.status === 'fighting' && state.time < limit) {
    step(state, botInput(state, options));
  }
  const hero = getHero(state);
  return { status: state.status, time: state.time, heroHp: hero.hp / hero.maxHp };
}

describe('the patrol hut fight, headless', () => {
  it('the skilled bot wins the fight, with a time and hit points that show the fight is fair', () => {
    const r = play(SKILLED_BOT);
    expect(r.status).toBe('victory');
    expect(r.time).toBeGreaterThan(5);
    expect(r.heroHp).toBeGreaterThan(0);
  });

  it('the sword-only bot that never dodges also ends the fight (its result is reported, not balanced)', () => {
    const r = play(SWORD_ONLY_BOT);
    expect(r.status).not.toBe('fighting');
  });
});
