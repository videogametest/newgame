import { describe, expect, it } from 'vitest';
import { TALLOWMERE_PERKS } from '../../data/perks/tallowmere';
import { PACING_BANDS, checkPacing } from './pacing';
import { earnPerk } from './perks';
import { createProgression } from './skills';
import type { Rank } from './types';

function heroAt(archery: number, stealth: number, perks: number, rank: Rank) {
  const s = createProgression(20, rank);
  s.skills.archery.level = archery;
  s.skills.stealth.level = stealth;
  for (const d of TALLOWMERE_PERKS.slice(0, perks)) earnPerk(s, d);
  return s;
}

describe('pacing bands', () => {
  it('rise from beat to beat', () => {
    const beats = ['first_lantern', 'forge_freed', 'mill_retaken', 'facing_stane', 'valley_complete'] as const;
    for (let i = 1; i < beats.length; i++) {
      expect(PACING_BANDS[beats[i]].mainSkills[0]).toBeGreaterThan(PACING_BANDS[beats[i - 1]].mainSkills[0]);
      expect(PACING_BANDS[beats[i]].perks[0]).toBeGreaterThan(PACING_BANDS[beats[i - 1]].perks[0]);
    }
  });

  it('accepts a hero who is on pace', () => {
    expect(checkPacing('first_lantern', heroAt(6, 5, 4, 'apprentice'))).toEqual([]);
    expect(checkPacing('forge_freed', heroAt(10, 9, 8, 'apprentice'))).toEqual([]);
    expect(checkPacing('mill_retaken', heroAt(15, 13, 12, 'scout'))).toEqual([]);
    expect(checkPacing('facing_stane', heroAt(20, 18, 18, 'scout'))).toEqual([]);
    expect(checkPacing('valley_complete', heroAt(20, 20, 24, 'warden'))).toEqual([]);
  });

  it('rejects a hero who is ahead, behind, or short of perks', () => {
    expect(checkPacing('first_lantern', heroAt(12, 5, 4, 'apprentice')).length).toBeGreaterThan(0);
    expect(checkPacing('facing_stane', heroAt(12, 11, 18, 'scout')).length).toBeGreaterThan(0);
    expect(checkPacing('forge_freed', heroAt(10, 9, 2, 'apprentice')).length).toBeGreaterThan(0);
  });

  it('rejects a main skill at the cap before the turn', () => {
    const problems = checkPacing('forge_freed', heroAt(20, 9, 8, 'apprentice'));
    expect(problems.some((p) => p.includes('cap'))).toBe(true);
  });
});
