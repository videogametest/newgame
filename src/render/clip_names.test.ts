import { describe, expect, it } from 'vitest';
import { UNITS } from '../data/units';
import { clipNamesOf } from './characters';

describe('clipNamesOf', () => {
  it('lists only clip names, not the windup and attack ranges', () => {
    const names = clipNamesOf(UNITS.enemy_soldier);
    expect(names).toContain('Melee_1H_Attack_Chop');
    expect(names.every((n) => typeof n === 'string' && !/^\d/.test(n))).toBe(true);
    expect(names).not.toContain('0');
  });

  it('includes the dodge clips for the hero', () => {
    expect(clipNamesOf(UNITS.hero)).toEqual(expect.arrayContaining(['Dodge_Forward', 'Dodge_Backward', 'Dodge_Left', 'Dodge_Right']));
  });
});
