// Valley clock settings and the ?tod= parser. Pure: no Babylon imports.

import { CLOCK_DAY_TUNING, type ClockTuning } from './clock';

/** The design clock (section 5): dawn 6, dusk 18, a real 20-minute day. Windows light at 19. Matches lightingAt(). */
export const VALLEY_CLOCK: ClockTuning = {
  realSecondsPerDay: CLOCK_DAY_TUNING.realSecondsPerDay,
  dawn: 6,
  dusk: 18,
};

/** Default start: dusk, as a new game begins, with the ground gold and the sky warm. */
export const VALLEY_DEFAULT_TOD = 18;

/** Parses ?tod=<hours>. Anything missing, non-numeric, or out of range returns the default. */
export function parseTod(raw: string | null): number {
  if (raw === null || raw.trim() === '') return VALLEY_DEFAULT_TOD;
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours < 0 || hours >= 24) return VALLEY_DEFAULT_TOD;
  return hours;
}
