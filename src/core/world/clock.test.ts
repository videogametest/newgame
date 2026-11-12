import { describe, expect, it } from 'vitest';
import { advanceClock, CLOCK_DAY_TUNING, dayPhase, sunAngle } from './clock';

// Dawn/dusk are test-only untuned placeholders, NOT approved phase cutoffs.
const tuning = { ...CLOCK_DAY_TUNING, dawn: 6, dusk: 18 };
describe('simulation clock (§4, §7)', () => {
  it('advances one day in twenty minutes and preserves the input/save shape', () => {
    const clock = { day: 2, timeOfDay: 17 };
    expect(advanceClock(clock, 1200, tuning)).toEqual({ day: 3, timeOfDay: 17 });
    expect(clock).toEqual({ day: 2, timeOfDay: 17 });
  });
  it('handles midnight and multi-day deltas', () => {
    expect(advanceClock({ day: 0, timeOfDay: 23 }, 50, tuning)).toEqual({ day: 1, timeOfDay: 0 });
    expect(advanceClock({ day: 5, timeOfDay: 23 }, 2450, tuning)).toEqual({ day: 8, timeOfDay: 0 });
  });
  it('does not advance while paused and agrees across simulation substeps', () => {
    const clock = { day: 0, timeOfDay: 0 };
    expect(advanceClock(clock, 0, tuning)).toEqual(clock);
    const a = advanceClock(advanceClock(clock, 25, tuning), 25, tuning);
    expect(a).toEqual(advanceClock(clock, 50, tuning));
  });
  it('derives phase and sun angle at dawn/noon/dusk/midnight', () => {
    expect(dayPhase(6, tuning)).toBe('day');
    expect(dayPhase(18, tuning)).toBe('night');
    expect(dayPhase(5.99, tuning)).toBe('night');
    expect(sunAngle(6, tuning)).toBe(0);
    expect(sunAngle(12, tuning)).toBe(Math.PI / 2);
    expect(sunAngle(18, tuning)).toBe(Math.PI);
    expect(sunAngle(0, tuning)).toBe(Math.PI * 1.5);
    expect(sunAngle(24, tuning)).toBe(sunAngle(0, tuning));
    expect(sunAngle(-6, tuning)).toBe(sunAngle(18, tuning));
  });
  it('uses explicit phase cutoffs rather than baking in test hours', () => {
    const other = { realSecondsPerDay: 2400, dawn: 4, dusk: 20 };
    expect(dayPhase(5, other)).toBe('day');
    expect(sunAngle(12, other)).toBe(Math.PI / 2);
    expect(advanceClock({ day: 0, timeOfDay: 0 }, 1200, other).timeOfDay).toBe(12);
  });
  it('rejects invalid deltas, save state and tuning', () => {
    expect(() => advanceClock({ day: 0, timeOfDay: 0 }, -1, tuning)).toThrow(RangeError);
    expect(() => advanceClock({ day: 0, timeOfDay: 24 }, 0, tuning)).toThrow(RangeError);
    expect(() => dayPhase(0, { ...tuning, dawn: 18, dusk: 6 })).toThrow(RangeError);
    expect(() => dayPhase(NaN, tuning)).toThrow(RangeError);
  });
});
