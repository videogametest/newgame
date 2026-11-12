import { describe, expect, it } from 'vitest';
import { checkPacing } from './pacing';
import { BEATS, playthrough, STRETCHES, STYLES, unscheduledPerks } from './playthrough';
import { SKILLS } from './types';

const run = (name: string) => playthrough(STYLES[name]);
const top = (snap: ReturnType<typeof run>[number]) => Math.max(...SKILLS.map(s => snap.state.skills[s].level));
const TYPICAL = ['scout', 'brawler', 'maker'];
const EVERYONE = Object.keys(STYLES);

describe('whole playthroughs, modelled', () => {
  it('covers every beat and every perk', () => {
    expect(STRETCHES.map(s => s.beat)).toEqual(BEATS);
    expect(unscheduledPerks()).toEqual([]);
  });

  it.each(TYPICAL)('a %s is on pace at every story beat', name => {
    for (const snap of run(name)) expect(checkPacing(snap.beat, snap.state), `${name} at ${snap.beat}`).toEqual([]);
  });

  it.each(EVERYONE)('a %s never reaches the cap before facing Stane, however they play', name => {
    for (const snap of run(name).slice(0, 3)) expect(top(snap), `${name} at ${snap.beat}`).toBeLessThan(snap.state.regionCap);
  });

  it.each(TYPICAL)('a %s finishes the valley with their main skill at the cap, not short of it', name => {
    const end = run(name)[4];
    expect(top(end)).toBe(end.state.regionCap);
  });

  it('doing everything is never more than two levels ahead of the pace', () => {
    const bandTop = [7, 12, 16, 20, 20];
    run('completionist').forEach((snap, i) => expect(top(snap)).toBeLessThanOrEqual(bandTop[i] + 2));
  });

  it('doing everything still leaves skills to grow after the story ends', () => {
    const end = run('completionist')[4];
    expect(end.perks).toBe(24);
    expect(SKILLS.filter(s => end.state.skills[s].level < end.state.regionCap).length).toBeGreaterThanOrEqual(3);
  });

  it('doing only what the story demands is behind, but not locked out', () => {
    const rush = run('rusher');
    // Facing Stane within five levels of the pace: hard, not hopeless.
    expect(top(rush[3])).toBeGreaterThanOrEqual(13);
    // And always ahead of where they were.
    for (let i = 1; i < rush.length; i++) expect(top(rush[i])).toBeGreaterThan(top(rush[i - 1]));
  });

  it('no perk is out of reach: a typical player who skipped a craft has at most a few left, all from levelling', () => {
    for (const name of TYPICAL) {
      const end = run(name)[4];
      expect(end.perks, name).toBeGreaterThanOrEqual(22);
    }
  });

  it('every style grows at every beat, so no stretch of the story is dead time', () => {
    for (const name of EVERYONE) {
      const snaps = run(name);
      for (let i = 1; i < snaps.length; i++) {
        const before = SKILLS.reduce((n, s) => n + snaps[i - 1].state.skills[s].level, 0);
        const after = SKILLS.reduce((n, s) => n + snaps[i].state.skills[s].level, 0);
        const mastery = (k: number) => Object.values(snaps[k].state.perks).reduce((n, p) => n + p.mastery, 0);
        expect(after > before || mastery(i) > mastery(i - 1), `${name} into ${snaps[i].beat}`).toBe(true);
      }
    }
  });

  it('perk slots follow the trials: three, then five, then seven', () => {
    expect(run('scout').map(s => s.slots)).toEqual([3, 5, 5, 5, 7]);
    expect(run('rusher').every(s => s.slots === 3)).toBe(true);
  });

  it('mastery arrives after the cap, not before: something new to earn once levels stop', () => {
    const scout = run('scout');
    expect(scout[2].topMastery).toBe(1);
    expect(scout[4].topMastery).toBeGreaterThanOrEqual(2);
  });

  it('is the same every time', () => {
    expect(run('maker')).toEqual(run('maker'));
  });
});
