// Caller supplies the browser boundary. Scheduling runs only on active simulation seconds, never paused wall time.
import { TUNING } from '../../config/tuning';
import type { GameState } from '../types';
export type SaveReason = 'capture' | 'rest' | 'town' | 'interval' | 'leave';
export class Autosave {
  private elapsed = 0;
  private signature: string;
  private wasInTown = false;
  constructor(state: GameState, private readonly write: () => boolean, private readonly result: (ok: boolean, reason: SaveReason) => void) {
    this.signature = this.captured(state);
  }
  private captured(state: GameState): string {
    return JSON.stringify(state.places.map(p => [p.id, p.status, p.timesFreed]));
  }
  /** Explicit actions call this after their state changes. Failed writes are retried on the next trigger. */
  save(reason: SaveReason): boolean {
    const ok = this.write();
    if (ok) this.elapsed = 0;
    this.result(ok, reason);
    return ok;
  }
  /** Rest UI is not built yet. Its completed action calls save('rest'); no pretend rest happens here. */
  advance(state: GameState, dt: number, inTown = false): void {
    const signature = this.captured(state);
    const previous = signature === this.signature ? null : new Map<string, string>(
      (JSON.parse(this.signature) as [string, string, number][]).map(([id, status, times]) => [id, `${status}:${times}`]));
    const capture = previous !== null && state.places.some(p => p.status === 'freed' && previous.get(p.id) !== `freed:${p.timesFreed}`);
    const town = inTown && !this.wasInTown;
    this.wasInTown = inTown;
    if (Number.isFinite(dt) && dt > 0) this.elapsed += dt;
    if (capture || town || this.elapsed >= TUNING.saves.intervalSeconds) {
      if (this.save(capture ? 'capture' : town ? 'town' : 'interval')) this.signature = signature;
    } else this.signature = signature;
  }
}
