import { describe, expect, it } from 'vitest';
import { indexItems } from '../items';
import { PROJECTS } from './projects';
import { checkPurse } from './purse';
import { purseFor } from './purse-model';
import { buyPrice } from './trade';

const TYPICAL = ['scout', 'brawler', 'maker'];
const EVERYONE = [...TYPICAL, 'rusher', 'completionist'];

describe('the purse, modelled across whole playthroughs', () => {
  it.each(TYPICAL)('a %s has a purse inside the band at every story beat', name => {
    for (const snap of purseFor(name)) expect(checkPurse(snap.beat, { carried: snap.crowns, stored: 0 }), `${name} at ${snap.beat}`).toEqual([]);
  });

  it.each(EVERYONE)('a %s can always afford the essentials: half a quiver and a loaf at the worst prices', name => {
    const worst = { recovery: 0, taxed: true };
    const items = indexItems();
    const essentials = buyPrice(items.get('arrow_standard')!, 'common', worst) * 12 + buyPrice(items.get('marrins_loaf')!, 'common', worst);
    for (const snap of purseFor(name)) expect(snap.crowns, `${name} at ${snap.beat}`).toBeGreaterThanOrEqual(essentials);
  });

  it('the player feels poor at first: nobody can pay for a project and a refill before the first lantern is lit', () => {
    for (const name of TYPICAL) expect(purseFor(name)[0].projectsBuilt).toEqual([]);
  });

  it.each(EVERYONE)('a %s has not rebuilt all of Wick before facing Stane: there is always something left to want', name => {
    expect(purseFor(name)[3].projectsBuilt.length).toBeLessThan(PROJECTS.length);
  });

  it('a typical player ends the story with Wick partly rebuilt and more still to do', () => {
    for (const name of TYPICAL) {
      const built = purseFor(name)[4].projectsBuilt.length;
      expect(built, name).toBeGreaterThanOrEqual(3);
      expect(built, name).toBeLessThan(PROJECTS.length);
    }
  });

  it('doing everything rebuilds nearly all of Wick by the end, with the last project left for after the story', () => {
    expect(purseFor('completionist')[4].projectsBuilt.length).toBeGreaterThanOrEqual(PROJECTS.length - 1);
  });

  it('skipping Wick does not make anyone rich enough to stop caring', () => {
    const rush = purseFor('rusher');
    expect(rush[4].projectsBuilt).toEqual([]);
    expect(rush[4].crowns).toBeLessThan(PROJECTS.reduce((n, p) => n + p.cost, 0));
  });

  it('money never only piles up: every style has spent at least a third of what it earned by the end', () => {
    for (const name of EVERYONE) {
      const end = purseFor(name)[4];
      expect(end.spent / end.earned, name).toBeGreaterThan(1 / 3);
    }
  });

  it('is the same every time', () => {
    expect(purseFor('maker')).toEqual(purseFor('maker'));
  });
});
