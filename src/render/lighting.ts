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
  /** Direction the light travels (from the sun toward the ground). */
  sunDir: Vector3;
  /** Unit direction from the valley toward the sun in the sky. Rises in the east, sets in the west (section 5). */
  sunSky: Vector3;
  /** Unit direction toward the moon: always opposite the sun, so it rises as the sun sets. */
  moonSky: Vector3;
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
 * Hours 0..24, by the design's clock (section 5, "The clock"): dawn 6, dusk 18, windows lit from 19 to 1.
 * Pure: no scene access.
 *
 * Dusk and dawn light things, not only the sky (task 003, first-look bar). The light does not stop when the sun
 * touches the horizon: it fades over the hour after, so at 18 the ground, walls, and faces are gold, at 19 the
 * windows are the brightest things, and by half past it is night. Golden warmth peaks at 18 and at 6.
 */
export function lightingAt(tod: number): Lighting {
  // The sun's path: theta is 0 at dawn (6), PI/2 at noon, PI at dusk (18). Below the horizon at night.
  const theta = ((tod - 6) / 12) * Math.PI;
  const elev = Math.sin(theta);
  const along = -Math.cos(theta);
  const sunSky = new Vector3(along * 0.8 + 0.5, elev, along * 0.6).normalize();
  const horiz = new Vector3(along * 0.8 + 0.5, 0, along * 0.6).normalize();
  // Daylight outlasts the sun by about an hour at each end of the day.
  const dayness = clamp01((elev + 0.2) * 2.2);
  const warm = Math.max(clamp01(1 - Math.abs(tod - 18) / 1.8), clamp01(1 - Math.abs(tod - 6) / 1.8));
  const nightness = tod < 12 ? clamp01((0.1 - elev) * 3) : clamp01((tod - 18.4) / 1.0);
  const zenith = mix(PALETTE.nightZenith, PALETTE.dayZenith, dayness);
  const horizon = mix(PALETTE.nightHorizon, PALETTE.dayHorizon, dayness);
  // The low sun is strong: grazing light needs the strength to colour flat ground, and it is what makes long shadows.
  const golden = warm * clamp01(dayness * 3);
  const afterglow = clamp01(0.35 + dayness * 2);
  return {
    // Never lower than this above the horizon, so flat ground still takes the light at dusk and dawn.
    // Horizontal heading comes from the sun's path; the downward part keeps the grazing-light strength it had.
    sunDir: new Vector3(-horiz.x * 0.75, -Math.max(0.22, elev), -horiz.z * 0.75).normalize(),
    sunSky,
    moonSky: sunSky.scale(-1),
    elevation: elev,
    sunColor: mix(mix(PALETTE.moon, PALETTE.sunWarm, dayness), PALETTE.sunGold, golden),
    sunIntensity: 0.3 + 0.9 * dayness + 1.1 * golden,
    hemiColor: mix(mix(PALETTE.moon, PALETTE.dayLight, dayness), PALETTE.warmHemi, golden * 0.7),
    hemiIntensity: 0.6 + 0.3 * dayness + 0.35 * golden,
    lit: tod >= 19 || tod < 1,
    nightness,
    // The sky's colour fades with the light, so the ground is never near-black under a bright sky.
    zenith: mix(zenith, PALETTE.duskZenith, warm * 0.7 * afterglow),
    sky: mix(horizon, PALETTE.duskHorizon, warm * 0.9 * afterglow),
  };
}
