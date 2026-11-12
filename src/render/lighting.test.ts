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
