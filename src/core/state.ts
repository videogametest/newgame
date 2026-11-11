import { createBattle } from './battle';
import type { BattleState } from './types';

/** Bump when the saved shape changes; migrations read the old version. */
export const SAVE_VERSION = 1 as const;

/** Everything about a save. Scenes read from it and write to it; they own none of it. */
export interface GameState {
  version: typeof SAVE_VERSION;
  battle: BattleState;
}

export function createGameState(): GameState {
  return { version: SAVE_VERSION, battle: createBattle() };
}
