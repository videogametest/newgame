// The first evening, step 6: the gate lantern and the map (task 010; queue item 27). Pure: no engine, DOM or storage.
// The hero lights the small lantern at her gate (interact within reach); she says hesper.lantern.first, then opens
// the map and points to the nearest place still held. What the map may show is decided in src/core/tutorial/map.ts.
import type { Vec2 } from '../types';

export type LanternPhase = 'intro' | 'light' | 'lit' | 'done';
export interface LanternState { phase: LanternPhase }
export type LanternEvent =
  | { type: 'lanternAsked' }
  | { type: 'lanternLit'; hero: Vec2; lantern: Vec2; reach: number }
  /** Her last line (evening.map) has been said and the map shown. */
  | { type: 'mapShown' };

export function newLantern(): LanternState { return { phase: 'intro' }; }
export function advanceLantern(s: LanternState, e: LanternEvent): LanternState {
  switch (e.type) {
    case 'lanternAsked': return s.phase === 'intro' ? { phase: 'light' } : s;
    case 'lanternLit':
      if (s.phase !== 'light') return s;
      return Math.hypot(e.hero.x - e.lantern.x, e.hero.z - e.lantern.z) <= e.reach ? { phase: 'lit' } : s;
    case 'mapShown': return s.phase === 'lit' ? { phase: 'done' } : s;
  }
}
/** The gate lantern burns from the moment it is lit, for good. */
export const gateLanternLit = (s: LanternState): boolean => s.phase === 'lit' || s.phase === 'done';

/** Her words: the ask; once lit, hesper.lantern.first (all of it) then evening.map. */
export function lanternSays(before: LanternState, after: LanternState, firstLines: number): { group: string; index: number }[] {
  if (before.phase === after.phase) return [];
  if (after.phase === 'light') return [{ group: 'evening.lantern', index: 0 }];
  if (after.phase === 'lit') return [...Array.from({ length: firstLines }, (_, index) => ({ group: 'hesper.lantern.first', index })),
    { group: 'evening.map', index: 0 }];
  return [];
}
