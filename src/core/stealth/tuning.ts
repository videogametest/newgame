/** Stream D tuning, to be folded into the single config at integration (§7).
 * No values here have been balanced against the running game. */
export const STEALTH_TUNING = {
  range: 24, // untuned placeholder (metres)
  halfFieldOfView: Math.PI / 3, // untuned placeholder (radians)
  noticePerSecond: 1, // untuned placeholder
  suspiciousAt: 1, // untuned placeholder
  alertAt: 3, // untuned placeholder
  night: 0.35, // untuned placeholder
  grass: 0.4, // untuned placeholder
  movement: {
    still: 0.5, // untuned placeholder
    crouched: 0.3, // untuned placeholder
    crouchedStill: 0.04, // untuned placeholder
    walking: 1, // untuned placeholder
    sprinting: 1.8, // untuned placeholder
  },
  markHoldSeconds: 1, // untuned placeholder
  markDurationSeconds: 20, // untuned placeholder
};

export type StealthTuning = typeof STEALTH_TUNING;
