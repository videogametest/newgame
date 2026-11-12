// Time-of-day lighting: one pure function drives sun, moon, sky, fog, lamps and windows. Shared by the
// style test and the valley. Pure: no scene access; the Babylon scene applies the result.

import { Color3, Vector3 } from '@babylonjs/core';

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
export const mix = (a: Color3, b: Color3, t: number): Color3 => Color3.Lerp(a, b, clamp01(t));

export const PALETTE = {
  ground: new Color3(0.42, 0.5, 0.3),
  path: new Color3(0.6, 0.52, 0.4),
  wood: new Color3(0.36, 0.23, 0.13),
  floor: new Color3(0.46, 0.33, 0.2),
  stone: new Color3(0.55, 0.52, 0.47),
  water: new Color3(0.1, 0.18, 0.24),
  windowLit: new Color3(1, 0.72, 0.36),
  windowDark: new Color3(0.12, 0.14, 0.2),
  poolWarm: new Color3(1, 0.5, 0.16),
  nightZenith: new Color3(0.02, 0.03, 0.08),
  nightHorizon: new Color3(0.07, 0.09, 0.18),
  dayZenith: new Color3(0.3, 0.55, 0.9),
  dayHorizon: new Color3(0.74, 0.84, 0.94),
  duskZenith: new Color3(0.42, 0.26, 0.4),
  duskHorizon: new Color3(0.98, 0.52, 0.3),
  moon: new Color3(0.42, 0.5, 0.82),
  dayLight: new Color3(1, 0.98, 0.94),
  sunWarm: new Color3(1, 0.93, 0.82),
  sunGold: new Color3(1, 0.68, 0.36),
  warmHemi: new Color3(1, 0.74, 0.55),
};

export interface Lighting {
  sunDir: Vector3;
  /** Sine of the sun's altitude: positive above the horizon. Drives the sun and moon discs. */
  elevation: number;
  sunColor: Color3;
  sunIntensity: number;
  hemiColor: Color3;
  hemiIntensity: number;
  /** Windows and lamps are lit from dusk to dawn. */
  lit: boolean;
  /** 0 in daylight, 1 at full night: drives glow, light pools and the sky. */
  nightness: number;
  zenith: Color3;
  /** Horizon colour; also the fog colour, so distant ground fades into the sky. */
  sky: Color3;
}

/**
 * Hours 0..24. Sunrise 6, noon 12, dusk 19 (windows light), night 1..19 dark. Pure: no scene access.
 * Golden-hour warmth peaks at dusk (19) and at dawn (6): gold sun, warm fill, orange horizon, rose zenith.
 */
export function lightingAt(tod: number): Lighting {
  const elev = Math.sin(((tod - 6) / 12) * Math.PI);
  const dayness = clamp01(elev * 2.5);
  const warm = Math.max(clamp01(1 - Math.abs(tod - 19) / 2.5), clamp01(1 - Math.abs(tod - 6) / 2));
  // Mornings follow the sun's elevation; evenings darken from just after dusk.
  const nightness = tod < 12 ? clamp01((0.2 - elev) * 3) : clamp01((tod - 18.6) / 1.2);
  const zenith = mix(PALETTE.nightZenith, PALETTE.dayZenith, dayness);
  const horizon = mix(PALETTE.nightHorizon, PALETTE.dayHorizon, dayness);
  return {
    // Never higher than 0.12 below the horizon: low sun gives long shadows at dusk and dawn.
    sunDir: new Vector3(0.45, -Math.max(0.12, elev), 0.6).normalize(),
    elevation: elev,
    sunColor: mix(mix(PALETTE.moon, PALETTE.sunWarm, dayness), PALETTE.sunGold, warm),
    sunIntensity: 0.35 + 0.85 * dayness + 0.35 * warm,
    hemiColor: mix(mix(PALETTE.moon, PALETTE.dayLight, dayness), PALETTE.warmHemi, warm * 0.5),
    hemiIntensity: 0.7 + 0.25 * dayness,
    lit: tod >= 19 || tod < 1,
    nightness,
    zenith: mix(zenith, PALETTE.duskZenith, warm * 0.7),
    sky: mix(horizon, PALETTE.duskHorizon, warm * 0.9),
  };
}
