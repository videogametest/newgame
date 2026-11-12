// Valley clock settings and the ?tod= parser. Pure: no Babylon imports.

import { CLOCK_DAY_TUNING, type ClockTuning } from './clock';

/** Sunrise 6, dusk 19 (windows light), a real 20-minute day. Matches lightingAt(). */
export const VALLEY_CLOCK: ClockTuning = {
  realSecondsPerDay: CLOCK_DAY_TUNING.realSecondsPerDay,
  dawn: 6,
  dusk: 19,
};

/** Default start: dusk, so the first look shows the lit windows and the warm sky. */
export const VALLEY_DEFAULT_TOD = 19;

/** Parses ?tod=<hours>. Anything missing, non-numeric, or out of range returns the default. */
export function parseTod(raw: string | null): number {
  if (raw === null || raw.trim() === '') return VALLEY_DEFAULT_TOD;
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours < 0 || hours >= 24) return VALLEY_DEFAULT_TOD;
  return hours;
}
