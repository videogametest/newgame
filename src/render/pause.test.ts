import { describe, expect, it } from 'vitest';
import { defaultBindings, rebind } from '../core/settings/actions';
import { CLOCK_DAY_TUNING } from '../core/world/clock';
import { clockAfterFrame, clockRuns, pausedAfter } from './pause';

const TUNING = { ...CLOCK_DAY_TUNING, dawn: 6, dusk: 19 };
const FRAME = 1 / 60;

describe('pausedAfter', () => {
  it('pauses on the pause key and on losing the mouse capture', () => {
    expect(pausedAfter('pauseKey')).toBe(true);
    expect(pausedAfter('lockLost')).toBe(true);
  });

  it('resumes when the mouse capture is regained', () => {
    expect(pausedAfter('lockGained')).toBe(false);
  });
});

describe('clock during pause', () => {
  it('does not advance on the frame Esc is handled, nor on any frame after it', () => {
    let clock = { day: 1, timeOfDay: 18 };
    // Frames 1 to 3 run normally.
    for (let f = 0; f < 3; f++) clock = clockAfterFrame(clock, FRAME, TUNING, clockRuns(false, false, true));
    const before = clock.timeOfDay;
    expect(before).toBeGreaterThan(18);

    // Frame 4: Esc is handled first, then the clock step runs with the new pause state.
    let paused = pausedAfter('pauseKey');
    clock = clockAfterFrame(clock, FRAME, TUNING, clockRuns(paused, false, true));
    expect(clock.timeOfDay).toBe(before);

    // Frames 5 to 304: paused, the clock stays exactly where it was.
    for (let f = 0; f < 300; f++) {
      const next = clockAfterFrame(clock, FRAME, TUNING, clockRuns(paused, false, true));
      expect(next).toBe(clock);
      clock = next;
    }
    expect(clock.timeOfDay).toBe(before);
  });

  it('resumes advancing on the frame the mouse capture returns', () => {
    const clock = { day: 1, timeOfDay: 18 };
    const paused = pausedAfter('pauseKey');
    expect(clockAfterFrame(clock, FRAME, TUNING, clockRuns(paused, false, true))).toBe(clock);
    const resumed = pausedAfter('lockGained');
    const after = clockAfterFrame(clock, FRAME, TUNING, clockRuns(resumed, false, true));
    expect(after.timeOfDay).toBeGreaterThan(clock.timeOfDay);
  });

  it('a frozen clock or an unfocused window also holds the clock', () => {
    const clock = { day: 1, timeOfDay: 18 };
    expect(clockAfterFrame(clock, FRAME, TUNING, clockRuns(false, true, true))).toBe(clock);
    expect(clockAfterFrame(clock, FRAME, TUNING, clockRuns(false, false, false))).toBe(clock);
  });
});

describe('pause binding', () => {
  it('Escape stays bound to pause: a slot-0 rebind is refused as reserved', () => {
    const r = rebind(defaultBindings(), 'keyboard', 'pause', 'Key:KeyP', 0);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected refusal');
    expect(r.reason).toBe('reserved');
  });

  it('a second (spare) pause key keeps Escape bound', () => {
    const r = rebind(defaultBindings(), 'keyboard', 'pause', 'Key:KeyP', 1);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.reason);
    expect(r.bindings.keyboard.pause).toContain('Key:Escape');
    expect(r.bindings.keyboard.pause).toContain('Key:KeyP');
  });
});
