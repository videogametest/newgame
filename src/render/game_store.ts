// The game save has its own key. Settings are never read, written, or cleared here.
import { decodeSave, encodeSave, type SaveRead } from '../core/saves/codec';
import type { GameState } from '../core/types';
export const GAME_SAVE_KEY = 'everylitwindow.save';
export interface GameStore { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function browserGameStore(): GameStore | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}
export function readGame(seed: number, store: GameStore | null = browserGameStore()): SaveRead {
  try {
    if (!store) return { ...decodeSave(null, seed), status: 'unavailable' };
    return decodeSave(store.getItem(GAME_SAVE_KEY), seed);
  } catch { return { ...decodeSave(null, seed), status: 'unavailable' }; }
}
export function writeGame(state: GameState, store: GameStore | null = browserGameStore()): boolean {
  try {
    if (!store) return false;
    store.setItem(GAME_SAVE_KEY, encodeSave(state));
    return true;
  } catch { return false; }
}
