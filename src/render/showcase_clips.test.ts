import { describe, expect, it } from 'vitest';
import { UNITS } from '../data/units';
import { SHOWCASE_CLIPS, SHOWCASE_NAMES, parseShowcaseTime, resolveShowcaseClip } from './showcase_clips';

const REQUIRED = [
  'sword_swing', 'bow_draw', 'bow_release', 'soldier_windup', 'soldier_strike', 'hit', 'death', 'dodge',
];

function allClipNames(unitId: string): string[] {
  const c = UNITS[unitId].clips;
  const names: string[] = [];
  for (const v of Object.values(c)) {
    if (typeof v === 'string') names.push(v);
    else if (v) names.push(...Object.values(v));
  }
  return names;
}

describe('showcase clips', () => {
  it('covers every clip the design asks for', () => {
    for (const name of REQUIRED) expect(SHOWCASE_NAMES).toContain(name);
  });

  it('lists only known clips, and archer clips are the extras', () => {
    const extras = SHOWCASE_NAMES.filter((n) => !REQUIRED.includes(n));
    expect(extras.sort()).toEqual(['archer_draw', 'archer_release']);
  });

  it('every entry names a real unit and a clip that unit has', () => {
    for (const name of SHOWCASE_NAMES) {
      const spec = SHOWCASE_CLIPS[name];
      expect(UNITS[spec.unitId], name).toBeDefined();
      const pose = spec.pose(UNITS[spec.unitId].clips, 0.5);
      expect(pose.kind, name).toBe('scrub');
      expect(allClipNames(spec.unitId), name).toContain(pose.clip);
    }
  });

  it('passes the normalized time straight through to the scrub', () => {
    const pose = SHOWCASE_CLIPS.sword_swing.pose(UNITS.hero.clips, 0.25);
    expect(pose).toEqual({ kind: 'scrub', clip: UNITS.hero.clips.attack, t: 0.25, range: [0, 1] });
  });

  it('rejects unknown and missing names with the valid list', () => {
    expect(() => resolveShowcaseClip(null)).toThrow(/Use one of/);
    expect(() => resolveShowcaseClip('toString')).toThrow(/Unknown showcase clip/);
    expect(resolveShowcaseClip('dodge')).toBe('dodge');
  });

  it('clamps and defaults the time parameter', () => {
    expect(parseShowcaseTime(null)).toBe(0);
    expect(parseShowcaseTime('abc')).toBe(0);
    expect(parseShowcaseTime('-1')).toBe(0);
    expect(parseShowcaseTime('2')).toBe(1);
    expect(parseShowcaseTime('0.4')).toBeCloseTo(0.4);
  });

  it('shows the soldier wind-up as the raise and the strike as the chop', () => {
    const c = UNITS.enemy_soldier.clips;
    const windup = SHOWCASE_CLIPS.soldier_windup.pose(c, 0.5);
    const strike = SHOWCASE_CLIPS.soldier_strike.pose(c, 0.5);
    expect(windup).toMatchObject({ kind: 'scrub', clip: 'Melee_1H_Attack_Chop', range: [0, 0.4] });
    expect(strike).toMatchObject({ kind: 'scrub', clip: 'Melee_1H_Attack_Chop', range: [0.4, 0.8] });
  });
});
