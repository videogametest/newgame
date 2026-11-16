import { describe, expect, it } from 'vitest';
import { canContinue, needsConfirmation, titleYaw } from './title_rules';
import { TITLE_WORDS, TITLE_MOTION } from '../data/title_screen';
import writing from '../../docs/writing/interface.md?raw';
import valley from './valley.ts?raw';
import input from './input.ts?raw';

describe('title decisions and words', () => {
  it('offers Continue only for a validated usable save', () => {
    expect(canContinue('loaded')).toBe(true);
    for (const status of ['new', 'damaged', 'unavailable'] as const) expect(canContinue(status)).toBe(false);
  });
  it('requires explicit replacement only when a valid game exists', () => {
    expect(needsConfirmation('new', 'loaded')).toBe(true);
    expect(needsConfirmation('continue', 'loaded')).toBe(false);
    for (const status of ['new', 'damaged', 'unavailable'] as const) expect(needsConfirmation('new', status)).toBe(false);
  });
  it('uses the exact writing, including destructive-action and cancellation labels', () => {
    for (const word of Object.values(TITLE_WORDS)) expect(writing).toContain(word);
    expect(TITLE_WORDS.keep).toBe('Keep my game'); expect(TITLE_WORDS.replace).toBe('Start again');
  });
  it('drifts slowly and stays inside its bounded arc', () => {
    const base = -2.3;
    expect(titleYaw(base, 0)).toBe(base); expect(titleYaw(base, -10)).toBe(base);
    expect(titleYaw(base, TITLE_MOTION.period / 4)).toBeCloseTo(base + TITLE_MOTION.amplitude);
    expect(Math.abs(titleYaw(base, 1) - base)).toBeLessThan(0.004);
    for (let t = 0; t < 500; t++) expect(Math.abs(titleYaw(base, t) - base)).toBeLessThanOrEqual(TITLE_MOTION.amplitude + 1e-10);
  });
  it('guards autosave, page exit, simulation and pointer lock during title preview', () => {
    expect(valley).toContain('!this.picture && !this.titleActive');
    expect(valley).toContain('if (!this.persistent || this.picture || this.titleActive) return false');
    expect(valley).toContain('clockRuns(this.paused || this.titleActive');
    expect(valley).toContain('if (this.paused || this.titleActive)');
    expect(input).toContain('if (this.enabled()) this.canvas.requestPointerLock()');
  });
});
