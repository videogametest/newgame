// Item 28: the households against docs/writing/households.md (as item 10 checks bandits.md), and their day.
import { describe, expect, it } from 'vitest';
import writing from '../../../docs/writing/households.md?raw';
import { WICK_DAYS } from '../../data/wick_days';
import { wickHouses } from '../../village/plan';
import { VALLEY_SEED } from '../world/valley';
import { TUNING } from '../../config/tuning';
import { HOUSEHOLDS, updateHouseholds, type PeopleWorld } from './households';
import { allWalkers, litWindows, openHouses, routine, villagerGround, walkPath, wickVillagers, DRAWN_ONLY_IF, NOT_DRAWN } from './daily';
import { newGameState } from '../state';

/** The writing's numbered sections: heading name, and its Who and Trigger lines verbatim. */
const SECTIONS = [...writing.matchAll(/^## (\d+)\. (.+)$/gm)].map((m, i, all) => {
  const end = all[i + 1]?.index ?? writing.indexOf('## Lines that depend on the count');
  const body = writing.slice(m.index!, end);
  return { n: Number(m[1]), name: m[2].trim(), body,
    who: body.match(/\*\*Who:\*\* (.+)/)?.[1] ?? '', trigger: body.match(/\*\*Trigger:\*\* (.+)/)?.[1] ?? '' };
});
/** What each data trigger must say in the writing (the raw Trigger line, or the section's opening for Hesper). */
const WRITTEN_TRIGGER: Record<string, string> = {
  hesper: 'Her window is lit from the start', maren: 'The first lantern is lit.', marrins: 'The Mill is freed.',
  aldrics: "The smith's hammer is returned to him.", sedges: 'the Forge is freed, or lanterns are built along the east road',
  pikes: 'Tobin is won back.', wains: 'The inn is rebuilt.', kettles: 'Three windows are lit.', brands: 'The Forge is freed.',
  oona: 'Six windows are lit.', hollins: 'Eight windows are lit.', tolleys: "The bowyer's tools are returned.",
  ashbys: 'Ten windows are lit.', loomises: 'The loom shuttle is returned.', dunns: 'Twelve windows are lit.',
  rudds: 'The village bell is rehung.',
};
const COUNT: Record<string, number> = { Three: 3, Six: 6, Eight: 8, Ten: 10, Twelve: 12 };

describe('households match the writing', () => {
  it('sixteen sections, in the written order, named as written', () => {
    expect(SECTIONS.map(s => s.n)).toEqual([...Array(16)].map((_, i) => i + 1));
    expect(HOUSEHOLDS.map(d => d.name)).toEqual(SECTIONS.map(s => s.name));
  });
  it.each(HOUSEHOLDS.map((d, i) => [d.id, d, i] as const))('%s: written members and trigger', (_id, d, i) => {
    const s = SECTIONS[i];
    const text = `${s.name} ${s.who} ${s.body.split('\n').slice(0, 3).join(' ')}`;
    for (const m of d.members) for (const word of m.split(' ').filter(w => w !== 'Old' || m === 'Old Maren'))
      expect(text, `${m} in section ${s.n}`).toContain(word);
    expect(d.id === 'hesper' ? s.body : s.trigger).toContain(WRITTEN_TRIGGER[d.id]);
    if (d.trigger.kind === 'windows') expect(COUNT[s.trigger.split(' ')[0]]).toBe(d.trigger.count);
  });
  it('the natural order in the writing names every household', () => {
    const order = writing.match(/A natural order, if the player does everything: (.+)\./)![1].split(', ').map(x => x.replace(/^the /, 'The '));
    expect([...order].sort()).toEqual(HOUSEHOLDS.map(d => d.name).sort());
  });
  it('unnamed relatives get no invented names: the Brands sons and the Dunns children are not members', () => {
    expect(SECTIONS[8].who).toContain('his two sons'); expect(HOUSEHOLDS[8].members).toEqual(['Old Tam Brand']);
    expect(SECTIONS[14].who).toContain('four children'); expect(HOUSEHOLDS[14].members).toEqual(['Rob Dunn', 'Sal Dunn']);
    expect(SECTIONS[4].who).toContain('Bracken, a sheepdog'); expect(NOT_DRAWN).toEqual(['Bracken']);
  });
  it('every household lives in its own house of the seeded plan, never Fairlow or the inn', () => {
    const houses = wickHouses(VALLEY_SEED);
    const ids = HOUSEHOLDS.map(d => d.houseId);
    expect(new Set(ids).size).toBe(16);
    for (const d of HOUSEHOLDS) {
      const h = houses.find(x => x.id === d.houseId);
      expect(h, d.houseId).toBeDefined();
      expect(h!.who).toContain(d.name === 'Old Maren' ? 'Old Maren' : d.name.replace(/^The /, ''));
    }
    expect(ids).not.toContain('fairlow'); expect(ids).not.toContain('inn');
  });
  it('Old Maren comes home with the first lantern: the gate lantern, or any place lit', () => {
    const g = newGameState(VALLEY_SEED);
    expect(updateHouseholds(g).find(h => h.id === 'maren')!.home).toBe(false);
    g.tutorial = { ...g.tutorial, lantern: { phase: 'lit' } };
    expect(updateHouseholds(g).find(h => h.id === 'maren')!.home).toBe(true);
    const h = newGameState(VALLEY_SEED); h.places[0] = { ...h.places[0], status: 'freed', timesFreed: 1 };
    expect(updateHouseholds(h).find(x => x.id === 'maren')!.home).toBe(true);
  });
  it('a place freed once then retaken still brings its household (and keeps it)', () => {
    const g = newGameState(VALLEY_SEED); g.places[0] = { ...g.places[0], status: 'held', timesFreed: 1 };
    expect(updateHouseholds(g).find(x => x.id === 'marrins')!.home).toBe(true);
  });
});

const world = (home: string[], extra: Partial<PeopleWorld> = {}): PeopleWorld => ({
  day: 3, places: [], bandits: {}, stolenGoodsReturned: [], projectsBuilt: [], storyMoments: [],
  households: HOUSEHOLDS.map(d => ({ id: d.id, home: home.includes(d.id) })), ...extra,
});
const all = HOUSEHOLDS.map(d => d.id);

describe('a day in Wick', () => {
  const T = TUNING.wickPeople;
  it('only people who are home are returned; Old Maren is there from the start, Hesper is the talking actor', () => {
    const start = wickVillagers(world(['hesper']), 12, WICK_DAYS);
    expect(start.map(v => v.name)).toEqual(['Old Maren']);
    expect(wickVillagers(world(['hesper', 'marrins']), 12, WICK_DAYS).map(v => v.name)).toEqual(['Old Maren', 'Ansa Marrin', 'Corin']);
    expect(wickVillagers(world(all), 12, WICK_DAYS).some(v => v.household === 'hesper')).toBe(false);
  });
  it('Tobin is drawn with the Pikes only once won back', () => {
    expect(DRAWN_ONLY_IF['Tobin Pike']).toBeDefined();
    const names = (b: PeopleWorld['bandits']) => wickVillagers(world(all, { bandits: b }), 12, WICK_DAYS).filter(v => v.household === 'pikes').map(v => v.name);
    expect(names({})).toEqual(['Ned Pike', 'Orla Pike']);
    expect(names({ tobin_pike: 'stayed' })).toEqual(['Ned Pike', 'Orla Pike', 'Tobin Pike']);
  });
  it('wake at dawn and walk, work by day, gather at the well at dusk, walk home, indoors at night', () => {
    const w = allWalkers(WICK_DAYS).find(x => x.def.id === 'kettles')!;
    expect(routine(w, 3)).toMatchObject({ activity: 'indoors', visible: false });
    expect(routine(w, T.wake - 0.01).activity).toBe('indoors');
    expect(routine(w, T.wake + 0.2)).toMatchObject({ activity: 'walking', visible: true });
    expect(routine(w, 12)).toMatchObject({ activity: 'working', x: w.work.x, z: w.work.z });
    expect(routine(w, T.workEnd + 0.2).activity).toBe('walking');
    expect(routine(w, (T.atWell + T.leaveWell) / 2)).toMatchObject({ activity: 'gathering', x: w.well.x, z: w.well.z });
    expect(['walking', 'standing']).toContain(routine(w, T.home - 0.05).activity);
    expect(routine(w, T.home)).toMatchObject({ activity: 'indoors', visible: false, x: w.door.x, z: w.door.z });
    expect(routine(w, 23.9).visible).toBe(false);
  });
  it('a walk moves continuously and arrives by the time the next part of the day begins', () => {
    for (const w of allWalkers(WICK_DAYS).filter(x => !x.day.stays)) {
      let prev = routine(w, T.wake);
      for (let h = T.wake; h < T.home; h += 0.02) {
        const r = routine(w, h);
        expect(Math.hypot(r.x - prev.x, r.z - prev.z), `${w.id} jump at ${h}`).toBeLessThan(5);
        prev = r;
      }
      const near = (h: number, p: { x: number; z: number }) => { const r = routine(w, h); return Math.hypot(r.x - p.x, r.z - p.z); };
      expect(near(T.atWork - 0.001, w.work), w.id).toBeLessThan(0.5);
      expect(near(T.atWell - 0.001, w.well), w.id).toBeLessThan(0.5);
      expect(near(T.home - 0.001, w.door), w.id).toBeLessThan(0.5);
    }
  });
  it('every spot and every point on every walk is walkable ground: round houses, the well and the water', () => {
    for (const w of allWalkers(WICK_DAYS)) {
      for (const p of [w.door, w.work, w.well]) expect(villagerGround(p.x, p.z), `${w.id} at ${p.x},${p.z}`).toBe(true);
      if (w.day.stays) continue;
      for (const [a, b] of [[w.door, w.work], [w.work, w.well], [w.well, w.door]] as const)
        for (const p of walkPath(a, b).slice(1, -1)) expect(villagerGround(p.x, p.z), `${w.id} via ${p.x},${p.z}`).toBe(true);
    }
  });
  it('is deterministic: the same hour gives the same village', () => {
    expect(wickVillagers(world(all), 7.3, WICK_DAYS)).toEqual(wickVillagers(world(all), 7.3, WICK_DAYS));
  });
  it('Old Maren keeps to her door by day and goes in at night', () => {
    const m = wickVillagers(world(['hesper']), 12, WICK_DAYS)[0];
    expect(m).toMatchObject({ activity: 'standing', visible: true });
    expect(wickVillagers(world(['hesper']), 22, WICK_DAYS)[0]).toMatchObject({ activity: 'indoors', visible: false });
  });
});

describe('a window is lit at night only if someone is home', () => {
  it('at the start only Hesper\'s; Old Maren sits in the dark until her window is lit', () => {
    expect([...litWindows(world(['hesper']), 22, WICK_DAYS)]).toEqual(['hesper']);
    expect([...litWindows(world(['hesper', 'maren']), 22, WICK_DAYS)].sort()).toEqual(['hesper', 'old_maren']);
  });
  it('home households light 19 to 1; Hesper from her gold hour to dawn; none by day', () => {
    const w = world(all);
    expect(litWindows(w, 12, WICK_DAYS).size).toBe(0);
    expect([...litWindows(w, 17.5, WICK_DAYS)]).toEqual(['hesper']);
    expect(litWindows(w, 18.7, WICK_DAYS).has('kettle')).toBe(false); // still out at the well or walking home
    expect(litWindows(w, 19, WICK_DAYS).size).toBe(16);
    expect(litWindows(w, 0.9, WICK_DAYS).size).toBe(16);
    expect([...litWindows(w, 2, WICK_DAYS)]).toEqual(['hesper']);
    expect(litWindows(w, 6, WICK_DAYS).size).toBe(0);
  });
  it('a household not home is never lit, and its boards stay up', () => {
    const w = world(['hesper', 'marrins']);
    expect(litWindows(w, 22, WICK_DAYS).has('marrin')).toBe(true);
    expect(litWindows(w, 22, WICK_DAYS).has('kettle')).toBe(false);
    expect([...openHouses(w)].sort()).toEqual(['hesper', 'marrin']);
  });
  it('lit iff home and someone indoors: every lit window has an indoor villager of that household', () => {
    const w = world(all);
    for (let h = 0; h < 24; h += 0.25) {
      const inside = new Set(wickVillagers(w, h, WICK_DAYS).filter(v => v.activity === 'indoors').map(v => v.household));
      for (const id of litWindows(w, h, WICK_DAYS)) if (id !== 'hesper')
        expect(inside.has(HOUSEHOLDS.find(d => d.houseId === id)!.id), `${id} at ${h}`).toBe(true);
    }
  });
});
