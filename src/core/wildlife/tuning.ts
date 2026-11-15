/** Wildlife tuning (GAME_DESIGN.md section 4, "Wildlife"). Placeholders, not balanced against the running game.
 * Folded into the single config at integration (section 7). */
export const WILDLIFE_TUNING = {
  /** A flock startles only when the hero sprints within this distance (metres). Placeholder. */
  flockStartleRadius: 14, // untuned placeholder
  /** A startled flock makes nearby enemies suspicious within this radius (metres). Placeholder. */
  flockNoiseRadius: 22, // untuned placeholder
  /** Running within this distance of the Mill's geese sets them honking (metres). Placeholder. */
  geeseHonkRadius: 12, // untuned placeholder
  /** The fox shows itself within this distance of a secret (metres). Placeholder. */
  foxAppearRadius: 18, // untuned placeholder
  /** A quietly following hero keeps the fox leading while within this distance of it (metres). Placeholder. */
  foxFollowRadius: 9, // untuned placeholder
  /** A sprinting hero this close to the fox sends it away for good (metres). Placeholder. */
  foxSenseRadius: 10, // untuned placeholder
  /** The fox's walking speed while leading (metres per second). Placeholder. */
  foxLeadSpeed: 2.2, // untuned placeholder
} as const;

export type WildlifeTuning = typeof WILDLIFE_TUNING;
