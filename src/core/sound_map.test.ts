import { describe, expect, it } from 'vitest';
import { advanceFootsteps, soundsForEvent } from './sound_map';

const HERO = 1;

describe('soundsForEvent', () => {
  it('plays the weapon sounds for the hero and for enemies alike', () => {
    expect(soundsForEvent({ type: 'swing', fighterId: HERO }, HERO)).toEqual(['sword_swing']);
    expect(soundsForEvent({ type: 'swing', fighterId: 7 }, HERO)).toEqual(['sword_swing']);
    expect(soundsForEvent({ type: 'draw', fighterId: 7 }, HERO)).toEqual(['bow_draw']);
    expect(soundsForEvent({ type: 'fire', fighterId: HERO, projectileId: 3 }, HERO)).toEqual(['bow_release']);
    expect(soundsForEvent({ type: 'impact', x: 0, y: 0, z: 0 }, HERO)).toEqual(['arrow_impact']);
    expect(soundsForEvent({ type: 'dodge', fighterId: HERO, x: 0, z: 0 }, HERO)).toEqual(['dodge']);
    expect(soundsForEvent({ type: 'death', fighterId: 7 }, HERO)).toEqual(['death']);
  });

  it('gives the hero its own pain sound and plays melee hits on enemies', () => {
    const hit = (fighterId: number, source: 'sword' | 'strike' | 'arrow') =>
      ({ type: 'damage', fighterId, amount: 5, x: 0, z: 0, source }) as const;
    expect(soundsForEvent(hit(HERO, 'strike'), HERO)).toEqual(['hurt']);
    expect(soundsForEvent(hit(HERO, 'arrow'), HERO)).toEqual(['hurt']);
    expect(soundsForEvent(hit(7, 'sword'), HERO)).toEqual(['sword_hit']);
    expect(soundsForEvent(hit(7, 'strike'), HERO)).toEqual(['sword_hit']);
  });

  it('keeps arrows that hit an enemy silent, since the impact sound covers them', () => {
    expect(soundsForEvent({ type: 'damage', fighterId: 7, amount: 5, x: 0, z: 0, source: 'arrow' }, HERO)).toEqual([]);
  });

  it('plays victory or defeat only at the end of a battle', () => {
    expect(soundsForEvent({ type: 'outcome', status: 'victory' }, HERO)).toEqual(['victory']);
    expect(soundsForEvent({ type: 'outcome', status: 'defeat' }, HERO)).toEqual(['defeat']);
    expect(soundsForEvent({ type: 'strike', fighterId: 7 }, HERO)).toEqual([]);
  });
});

describe('advanceFootsteps', () => {
  it('fires one footstep per stride of ground covered', () => {
    let d = 0;
    let steps = 0;
    for (let i = 0; i < 60; i++) {
      const r = advanceFootsteps(d, 2, 1 / 60, 1.3);
      d = r.distance;
      if (r.due) steps++;
    }
    // One second at 2 m/s is 2 m: exactly one 1.3 m stride.
    expect(steps).toBe(1);
  });

  it('stays silent when standing still and resets the count', () => {
    const r = advanceFootsteps(1.0, 0, 1 / 60, 1.3);
    expect(r).toEqual({ distance: 0, due: false });
  });
});
