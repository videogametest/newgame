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
  // Compass bearing, clockwise from north. North is -z (layout, task 003).
  const bearing = (v: { x: number; z: number }) => (((Math.atan2(v.x, -v.z) * 180) / Math.PI) + 360) % 360;
  const angleBetween = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
  const altitude = (v: { y: number }) => (Math.asin(v.y) * 180) / Math.PI;
  it('the sun rises due east, stands due south at noon, and sets due west (review 018, item 1)', () => {
    expect(angleBetween(bearing(lightingAt(6).sunSky), 90)).toBeLessThan(1);
    expect(angleBetween(bearing(lightingAt(12).sunSky), 180)).toBeLessThan(1);
    expect(angleBetween(bearing(lightingAt(18).sunSky), 270)).toBeLessThan(1);
  });
  it('the sun is in the southern half of the sky from dawn to dusk', () => {
    for (let tod = 6.25; tod <= 17.75; tod += 0.25) {
      const L = lightingAt(tod);
      expect(L.sunSky.y, `altitude at ${tod}`).toBeGreaterThan(0);
      expect(angleBetween(bearing(L.sunSky), 180), `bearing at ${tod}`).toBeLessThan(90.5);
    }
  });
  it('the sun and the moon stay under 35 degrees, so the moon is in reach of an ordinary upward glance (review 019)', () => {
    for (let tod = 0; tod < 24; tod += 0.25) {
      expect(altitude(lightingAt(tod).sunSky), `sun at ${tod}`).toBeLessThanOrEqual(35.01);
      expect(altitude(lightingAt(tod).moonSky), `moon at ${tod}`).toBeLessThanOrEqual(35.01);
    }
    expect(altitude(lightingAt(0).moonSky)).toBeGreaterThan(34.9);
    expect(altitude(lightingAt(12).sunSky)).toBeGreaterThan(34.9);
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
