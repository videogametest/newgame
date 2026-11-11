// Balance tests: the headless bots must reach the targets in GAME_DESIGN.md section 7 and the
// milestone 1 balance brief. These fail if a tuning or arena change moves the fight out of range.

import { beforeEach, describe, expect, it } from 'vitest';
import { botInput, SKILLED_BOT, SWORD_ONLY_BOT, type BotOptions } from './bot';
import { createBattle, getHero, step } from './battle';
import { resetTuning } from '../config/tuning';
import { TRAINING_FIELD } from '../data/arena';
import type { BattleState } from './types';

const MAX_SECONDS = 900;

function runBattle(options: BotOptions): BattleState {
  const state = createBattle(TRAINING_FIELD);
  for (let i = 0; i < 60 * MAX_SECONDS && state.status === 'fighting'; i++) {
    step(state, botInput(state, options));
  }
  return state;
}

describe('balance targets', () => {
  beforeEach(() => resetTuning());

  it('the skilled bot wins in 90 to 180 seconds with 30 to 70% HP left', () => {
    const state = runBattle(SKILLED_BOT);
    const hero = getHero(state);
    const hpLeft = hero.hp / hero.maxHp;
    expect(state.status).toBe('victory');
    expect(state.time).toBeGreaterThanOrEqual(90);
    expect(state.time).toBeLessThanOrEqual(180);
    expect(hpLeft).toBeGreaterThanOrEqual(0.3);
    expect(hpLeft).toBeLessThanOrEqual(0.7);
  });

  it('a sword-only bot that never dodges loses', () => {
    const state = runBattle(SWORD_ONLY_BOT);
    expect(state.status).toBe('defeat');
  });
});
