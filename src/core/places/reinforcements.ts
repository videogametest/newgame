// Task 004 item 13. Pure, serializable alarm episode. The caller supplies the outside roster,
// entrance positions, travel time and morale change; this module invents no defenders.
import type { PlaceState, Spawn } from '../types';
import { advanceBell, type BellInput, type BellState } from './alarm';

export interface ReinforcementPlan {
  travelSeconds: number;
  moraleGain: number;
  spawns: readonly Spawn[];
}
export interface AlarmState {
  bell: BellState;
  /** null before ringing or after arrival/cancellation; seconds are simulation time. */
  remaining: number | null;
  arrived: boolean;
}
export function newAlarm(): AlarmState {
  return { bell: { runnerId: null, rung: false }, remaining: null, arrived: false };
}
export function advanceAlarm(
  previous: AlarmState, place: PlaceState, input: BellInput,
  seconds: number, plan: ReinforcementPlan,
): { state: AlarmState; bellRang: boolean; spawns: Spawn[]; moraleDelta: number } {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Alarm seconds must be finite and nonnegative');
  if (!Number.isFinite(plan.travelSeconds) || plan.travelSeconds < 0
    || !Number.isFinite(plan.moraleGain) || plan.moraleGain < 0) throw new Error('Invalid reinforcement plan');
  const state: AlarmState = { ...previous, bell: { ...previous.bell } };
  const result = { state, bellRang: false, spawns: [] as Spawn[], moraleDelta: 0 };
  // Once a place is no longer held, its pending party is cancelled, not banked for a later retake.
  if (place.status !== 'held') {
    state.remaining = null;
    if (previous.bell.rung) state.arrived = true;
    else state.bell = { runnerId: null, rung: false };
    return result;
  }
  const bell = advanceBell(state.bell, place, input);
  state.bell = bell.state;
  result.bellRang = bell.callReinforcements;
  if (bell.callReinforcements) state.remaining = plan.travelSeconds;
  else if (state.remaining !== null) state.remaining = Math.max(0, state.remaining - seconds);
  if (state.remaining === 0 && !state.arrived) {
    state.remaining = null;
    state.arrived = true;
    result.spawns = plan.spawns.map(spawn => ({ ...spawn }));
    result.moraleDelta = result.spawns.length > 0 ? plan.moraleGain : 0;
  }
  return result;
}
