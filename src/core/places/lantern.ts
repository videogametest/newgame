// The ritual's pure state transition. Clearing the garrison is a separate producer (queue 18).
import { TUNING } from '../../config/tuning';
import type { GameState } from '../types';
export type Point = { x: number; z: number };
export function canLightLantern(game: GameState, id: string, hero: Point, lantern: Point): boolean {
  return game.hero.hp > 0 && game.places.some(p => p.id === id && p.status === 'cleared')
    && Math.hypot(hero.x - lantern.x, hero.z - lantern.z) <= TUNING.mill.lanternReach;
}
/** Mutates the serializable game only on success. The caller saves immediately, then performs the cue. */
export function lightLantern(game: GameState, id: string, hero: Point, lantern: Point): boolean {
  if (!canLightLantern(game, id, hero, lantern)) return false;
  const place = game.places.find(p => p.id === id)!;
  place.status = 'freed'; place.timesFreed += 1; place.freedDay = game.day;
  return true;
}
/** Recovery stays visible even after the one story retaking. Ordinary windows follow the written clock. */
export function millWindowOn(game: Pick<GameState, 'places' | 'timeOfDay'>): boolean {
  return game.places.some(p => p.id === 'mill' && p.timesFreed > 0)
    && (game.timeOfDay >= 19 || game.timeOfDay < 1);
}
