import { describe, expect, it } from 'vitest';
import { PACING_BANDS } from '../../core/progression/pacing';
import { validatePerks } from '../../core/progression/perks';
import { PROGRESSION_TUNING as T } from '../../core/progression/tuning';
import { SKILLS } from '../../core/progression/types';
import { TALLOWMERE_PERKS as perks } from './tallowmere';

describe('the perks of Tallowmere', () => {
  it('number 24, matching the pacing table', () => {
    expect(perks.length).toBe(24);
    expect(PACING_BANDS.valley_complete.perks[1]).toBe(24);
  });

  it('obey the design rules', () => {
    expect(validatePerks(perks)).toEqual([]);
  });

  it('cover every skill', () => {
    const covered = new Set(perks.map((p) => p.skill));
    for (const skill of SKILLS) expect(covered.has(skill), skill).toBe(true);
  });

  it('come mostly from the story, not from levels', () => {
    const fromLevels = perks.filter((p) => p.source.kind === 'level').length;
    expect(fromLevels).toBeLessThan(perks.length / 2);
  });

  it('give every perk taught by a person a fallback, and no other perk one', () => {
    for (const p of perks) {
      if (p.source.kind === 'person') expect(p.fallback, p.id).not.toBeNull();
      else expect(p.fallback, p.id).toBeNull();
    }
  });

  it('put every level perk within reach under the valley cap', () => {
    for (const p of perks) {
      if (p.source.kind === 'level') expect(p.source.level, p.id).toBeLessThanOrEqual(T.regionCaps.tallowmere);
    }
  });

  it('never describe a perk as a plain number increase', () => {
    for (const p of perks) {
      for (const text of [p.summary, ...p.ranks]) expect(/\d+\s*%/.test(text), `${p.id}: ${text}`).toBe(false);
    }
  });

  it('declare a distinct effect for each perk', () => {
    const keys = perks.map((p) => `${p.effect.system}:${p.effect.key}`);
    expect(new Set(keys).size).toBe(perks.length);
  });

  it('allow enough early perks for the first pacing band without any trial or person', () => {
    const early = perks.filter((p) => p.source.kind === 'level' && p.source.level <= 7).length;
    const firstLantern = perks.filter((p) => p.source.kind === 'story' && p.source.moment === 'first_lantern').length;
    expect(early + firstLantern).toBeGreaterThanOrEqual(PACING_BANDS.first_lantern.perks[0]);
  });
});
