// Pause rules (docs/tasks/009-settings-and-controllers.md, step 2). Pure: the scene asks these, the DOM is not touched here.
// The pause key, or losing the mouse capture (Esc, alt-tab, the window losing focus), pauses the walk.
// Getting the capture back resumes it.
import { advanceClock, type ClockTuning, type WorldClock } from '../core/world/clock';

export type PauseEvent = 'pauseKey' | 'lockLost' | 'lockGained';

/** Whether the game is paused right after an event. A pause key press always pauses; losing the capture pauses; regaining it resumes. */
export function pausedAfter(event: PauseEvent): boolean {
  return event !== 'lockGained';
}

/** Whether the clock runs on a frame. The scene reads the pause state after the pause key is handled, so a frame that handles Esc does not run the clock. */
export function clockRuns(paused: boolean, frozen: boolean, windowFocused: boolean): boolean {
  return !paused && !frozen && windowFocused;
}

/** The clock after one frame: unchanged when it does not run, otherwise advanced by the frame's delta. */
export function clockAfterFrame(clock: WorldClock, realSeconds: number, tuning: ClockTuning, runs: boolean): WorldClock {
  return runs ? advanceClock(clock, realSeconds, tuning) : clock;
}
