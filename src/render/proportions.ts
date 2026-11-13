// Body proportions for the valley hero, so the character reads as a grown adult beside house doors.
// Bone scales are applied after the animation each frame (see CharacterView). Feet are counter-scaled so only the legs lengthen.

export const PROPORTIONS = {
  head: 0.78,
  leg: 1.34,
  chestWidth: 1.06,
  /** Leg bones' combined rest length in metres (upper to lower to foot), for lifting the body by the extra. */
  legLength: 0.38,
};

export type Proportions = typeof PROPORTIONS;
