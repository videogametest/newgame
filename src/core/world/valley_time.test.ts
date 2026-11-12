import { describe, expect, it } from 'vitest';
import { VALLEY_CLOCK, VALLEY_DEFAULT_TOD, parseTod } from './valley_time';

describe('parseTod', () => {
  it('defaults to dusk when missing or blank', () => {
    expect(parseTod(null)).toBe(VALLEY_DEFAULT_TOD);
    expect(parseTod('  ')).toBe(VALLEY_DEFAULT_TOD);
  });
  it('accepts hours in [0, 24)', () => {
    expect(parseTod('12')).toBe(12);
    expect(parseTod('6.5')).toBe(6.5);
    expect(parseTod('0')).toBe(0);
  });
  it('falls back to the default for bad input', () => {
    expect(parseTod('noon')).toBe(VALLEY_DEFAULT_TOD);
    expect(parseTod('24')).toBe(VALLEY_DEFAULT_TOD);
    expect(parseTod('-1')).toBe(VALLEY_DEFAULT_TOD);
    expect(parseTod('NaN')).toBe(VALLEY_DEFAULT_TOD);
  });
  it('clock has ordered dawn and dusk', () => {
    expect(VALLEY_CLOCK.dawn).toBeLessThan(VALLEY_CLOCK.dusk);
  });
});
