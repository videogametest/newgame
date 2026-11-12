// The design's clock and the first-look bar's lighting rules, held on the pure function (task 003, review 016).
import { describe, expect, it } from 'vitest';
import { lightingAt } from './lighting';

/** A stand-in for how bright flat ground comes out: sun on a level surface plus the sky's fill. */
const ground = (tod: number) => { const L = lightingAt(tod); return L.sunIntensity * -L.sunDir.y + L.hemiIntensity; };
const brightness = (c: { r: number; g: number; b: number }) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

describe('lighting follows the design clock: dawn 6, dusk 18, windows 19 to 1', () => {
  it('windows are dark at 18 and lit from 19 until 1', () => {
    expect(lightingAt(18).lit).toBe(false);
    expect(lightingAt(18.9).lit).toBe(false);
    expect(lightingAt(19).lit).toBe(true);
    expect(lightingAt(0.5).lit).toBe(true);
    expect(lightingAt(1).lit).toBe(false);
    expect(lightingAt(12).lit).toBe(false);
  });
  it('dusk lights things, not only the sky: at 18 and at 6 the ground is as bright as an hour before', () => {
    expect(ground(18)).toBeGreaterThan(ground(12) * 0.8);
    expect(ground(6)).toBeGreaterThan(ground(12) * 0.8);
    expect(ground(18) / brightness(lightingAt(18).sky)).toBeGreaterThan(ground(12) / brightness(lightingAt(12).sky));
  });
  it('the low sun is gold and never so low that flat ground goes dark', () => {
    const dusk = lightingAt(18);
    expect(dusk.sunColor.r).toBeGreaterThan(dusk.sunColor.b * 2);
    for (let tod = 0; tod < 24; tod += 0.5) expect(-lightingAt(tod).sunDir.y).toBeGreaterThan(0.2);
  });
  it('the sky fades with the light, so it is never bright over black ground', () => {
    for (let tod = 0; tod < 24; tod += 0.25) {
      const L = lightingAt(tod);
      expect(brightness(L.sky) / ground(tod), `at ${tod}`).toBeLessThan(1.1);
    }
  });
  it('night is dark and blue, and noon is not warm', () => {
    const night = lightingAt(23);
    expect(night.nightness).toBe(1);
    expect(night.sunColor.b).toBeGreaterThan(night.sunColor.r);
    expect(ground(23)).toBeLessThan(ground(12) * 0.7);
    const noon = lightingAt(12);
    expect(noon.nightness).toBe(0);
    expect(noon.sunColor.g).toBeGreaterThan(0.9);
  });
});

describe('the sun and moon follow their paths (section 5, review 017)', () => {
  it('the sun is up at noon and down at midnight', () => {
    expect(lightingAt(12).sunSky.y).toBeGreaterThan(0.5);
    expect(lightingAt(0).sunSky.y).toBeLessThan(-0.5);
  });
  it('the sun rises on one side and sets on the other', () => {
    const dawnX = lightingAt(6).sunSky.x;
    const duskX = lightingAt(18).sunSky.x;
    const dawnZ = lightingAt(6).sunSky.z;
    const duskZ = lightingAt(18).sunSky.z;
    expect(Math.sign(dawnZ)).not.toBe(Math.sign(duskZ));
    expect(dawnX * duskX).toBeLessThan(0.5);
  });
  it('the moon is up at 0 and 23 and has set by 6', () => {
    expect(lightingAt(0).moonSky.y).toBeGreaterThan(0.5);
    expect(lightingAt(23).moonSky.y).toBeGreaterThan(0.5);
    expect(lightingAt(6.5).moonSky.y).toBeLessThan(-0.02);
  });
  it('the moon is always opposite the sun', () => {
    for (let tod = 0; tod < 24; tod += 0.5) {
      const L = lightingAt(tod);
      expect(L.moonSky.x + L.sunSky.x).toBeCloseTo(0, 9);
      expect(L.moonSky.y + L.sunSky.y).toBeCloseTo(0, 9);
      expect(L.moonSky.z + L.sunSky.z).toBeCloseTo(0, 9);
    }
  });
  it('the sun path is a unit direction at every hour', () => {
    for (let tod = 0; tod < 24; tod += 0.5) expect(lightingAt(tod).sunSky.length()).toBeCloseTo(1, 6);
  });
  it('stars are visible at night and gone by noon', () => {
    const starAlpha = (tod: number) => Math.min(1, Math.max(0, (lightingAt(tod).nightness - 0.3) / 0.5));
    expect(starAlpha(23)).toBe(1);
    expect(starAlpha(12)).toBe(0);
  });
});
