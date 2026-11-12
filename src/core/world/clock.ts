import type { GameState } from '../types';

export type WorldClock = Pick<GameState, 'day' | 'timeOfDay'>;
/** Design §4: approximately twenty real minutes. Dawn/dusk remain caller-supplied. */
export const CLOCK_DAY_TUNING = { realSecondsPerDay: 20 * 60 } as const;
export interface ClockTuning {
  realSecondsPerDay: number;
  /** Region-authored cutoffs. No design-approved default hours exist yet. */
  dawn: number;
  dusk: number;
}

function validate(tuning: ClockTuning): void {
  if (!Number.isFinite(tuning.realSecondsPerDay) || tuning.realSecondsPerDay <= 0
    || ![tuning.dawn, tuning.dusk].every(Number.isFinite)
    || tuning.dawn < 0 || tuning.dusk > 24 || tuning.dawn >= tuning.dusk) {
    throw new RangeError('Clock requires positive duration and ordered dawn/dusk in [0,24]');
  }
}

/** Advance only by simulation delta, never wall time. Pause by passing zero. */
export function advanceClock(clock: WorldClock, realSeconds: number, tuning: ClockTuning): WorldClock {
  validate(tuning);
  if (!Number.isFinite(realSeconds) || realSeconds < 0
    || !Number.isSafeInteger(clock.day) || clock.day < 0
    || !Number.isFinite(clock.timeOfDay) || clock.timeOfDay < 0 || clock.timeOfDay >= 24) {
    throw new RangeError('Invalid clock or delta');
  }
  const hours = clock.timeOfDay + realSeconds * 24 / tuning.realSecondsPerDay;
  return { day: clock.day + Math.floor(hours / 24), timeOfDay: hours % 24 };
}

/** Unwrapped angle: dawn=0, noon=π/2, dusk=π, next dawn=2π.
 * It describes an abstract sun orbit; world orientation is a rendering decision.
 */
export function sunAngle(timeOfDay: number, tuning: ClockTuning): number {
  validate(tuning);
  if (!Number.isFinite(timeOfDay)) throw new RangeError('Time must be finite');
  const hour = ((timeOfDay % 24) + 24) % 24;
  if (hour >= tuning.dawn && hour < tuning.dusk) {
    return Math.PI * (hour - tuning.dawn) / (tuning.dusk - tuning.dawn);
  }
  const nightHours = hour >= tuning.dusk ? hour - tuning.dusk : hour + 24 - tuning.dusk;
  return Math.PI + Math.PI * nightHours / (24 - tuning.dusk + tuning.dawn);
}

export function dayPhase(timeOfDay: number, tuning: ClockTuning): 'day' | 'night' {
  return sunAngle(timeOfDay, tuning) < Math.PI ? 'day' : 'night';
}
