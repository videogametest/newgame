import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BanditState } from '../types';
import { indexItems } from '../items';
import { TALLOWMERE_PERKS } from '../../data/perks/tallowmere';
import {
  advance, effects, newStories, openThreads, STORY_IDS, threadForRest, traces,
  type Facts, type Happening, type OpenThings, type Stories, type StoryEffects,
} from './stories';

const writing = readFileSync('docs/writing/stories.md', 'utf8');

function world(over: Partial<Facts> = {}): Facts {
  return {
    places: { mill: { status: 'freed', timesFreed: 1 }, forge: { status: 'freed', timesFreed: 1 }, watch_house: { status: 'held', timesFreed: 0 } },
    home: ['hesper', 'maren', 'marrins', 'aldrics', 'pikes'],
    bandits: { dob_finch: 'stayed', peg_rudge: 'stayed', tobin_pike: 'stayed', hew_pollard: 'alive' },
    millDark: false, bond: { tobin_pike: 2 }, day: 10, ...over,
  };
}
const bandits = (over: Record<string, BanditState>) => ({ dob_finch: 'stayed', peg_rudge: 'stayed', tobin_pike: 'stayed', hew_pollard: 'alive', ...over } as Record<string, BanditState>);

/** Run a script of [facts, happening] and collect every line said. */
function run(script: [Facts, Happening][], start: Stories = newStories()) {
  let stories = start;
  const lines: string[] = [];
  const takes: string[] = [];
  for (const [facts, happening] of script) {
    const r = advance(stories, facts, happening);
    stories = r.stories; lines.push(...r.lines); takes.push(...r.takes);
  }
  return { stories, lines, takes };
}
const tick: Happening = { kind: 'tick' };

describe('the miller\'s hand', () => {
  const dark = world({ millDark: true, places: { ...world().places, mill: { status: 'held', timesFreed: 1 } }, day: 20 });
  const relit = world({ places: { ...world().places, mill: { status: 'freed', timesFreed: 2 } }, day: 22 });
  const toAsked: [Facts, Happening][] = [
    [world(), tick],
    [world(), { kind: 'show', item: 'mill_bill', to: 'dob_finch' }],
    [dark, tick],
  ];
  it('begins when Dob has stayed and the Marrins are home, and he will not go up', () => {
    const r = run([[world(), tick]]);
    expect(r.stories.miller.stage).toBe('wont_go_up');
    expect(effects(r.stories, world()).keepsakesInWorld).toContain('mill_bill');
    expect(effects(r.stories, world()).betterFlour).toBe(false);
  });
  it('the mill bill sends him up, and the flour is better', () => {
    const r = run(toAsked.slice(0, 2));
    expect(r.lines.filter(l => l.startsWith('story.miller'))).toContain('story.miller.2.dob');
    expect(effects(r.stories, world()).betterFlour).toBe(true);
  });
  it('sent: the door is unbarred, and he is glad of it afterwards', () => {
    const r = run([...toAsked, [dark, { kind: 'give', item: 'dobs_spear', to: 'dob_finch' }]]);
    expect(effects(r.stories, dark).millDoorUnbarred).toBe(true);
    const end = run([[relit, tick]], r.stories);
    expect(end.stories.miller).toMatchObject({ stage: 'done', choice: 'sent' });
    expect(end.lines.filter(l => l.startsWith('story.miller'))).toEqual(['story.miller.3.sent', 'story.miller.3.ansa.sent']);
  });
  it('sent, and the bell rings: he is held at the Watch-house until it falls', () => {
    const r = run([...toAsked, [dark, { kind: 'give', item: 'dobs_spear', to: 'dob_finch' }], [dark, { kind: 'bell', place: 'mill' }], [relit, tick]]);
    expect(r.stories.miller.stage).toBe('caught');
    expect(effects(r.stories, relit).dobHeld).toBe(true);
    const fallen = { ...relit, places: { ...relit.places, watch_house: { status: 'freed' as const, timesFreed: 1 } } };
    const end = run([[fallen, tick]], r.stories);
    expect(end.lines.filter(l => l.startsWith('story.miller'))).toContain('story.miller.3.caught');
    expect(effects(end.stories, fallen).dobHeld).toBe(false);
  });
  it('kept: letting dusk pass is the answer, and he is safe', () => {
    const r = run([...toAsked, [dark, { kind: 'dusk' }], [dark, { kind: 'bell', place: 'mill' }], [relit, tick]]);
    expect(r.stories.miller).toMatchObject({ stage: 'done', choice: 'kept' });
    expect(r.lines.filter(l => l.startsWith('story.miller'))).toContain('story.miller.3.kept');
    expect(effects(r.stories, relit).millDoorUnbarred).toBe(false);
  });
  it('if Dob was killed, the pick goes to Corin and the flour comes later', () => {
    const dead = world({ bandits: bandits({ dob_finch: 'dead' }) });
    const r = run([[dead, tick], [dead, { kind: 'show', item: 'mill_bill', to: 'ansa_marrin' }]]);
    expect(r.lines.filter(l => l.startsWith('story.miller'))).toEqual(['story.miller.dead']);
    expect(r.stories.miller).toMatchObject({ stage: 'done', short: true });
    expect(effects(r.stories, dead).betterFlour).toEqual({ atWindows: 12 });
  });
  it('does not begin while Dob is undecided or the Marrins are away', () => {
    expect(run([[world({ bandits: bandits({ dob_finch: 'spared' }) }), tick]]).stories.miller.stage).toBe('closed');
    expect(run([[world({ home: ['hesper'] }), tick]]).stories.miller.stage).toBe('closed');
  });
});

describe('the striker', () => {
  const toAsked: [Facts, Happening][] = [
    [world(), tick],
    [world(), { kind: 'show', item: 'iron_ore', to: 'bertram_aldric' }],
    [world(), { kind: 'visit', where: 'forge', beforeDawn: true }],
    [world({ day: 11 }), { kind: 'visit', where: 'forge' }],
  ];
  it('he will not make steel, she lights his fire before dawn, and he gives his terms', () => {
    const r = run(toAsked);
    expect(r.lines.filter(l => l.startsWith('story.striker'))).toEqual(['story.striker.1.garrick', 'story.striker.1.bertram', 'story.striker.2.peg', 'story.striker.3.bertram']);
    expect(effects(r.stories, world()).steel).toBe(false);
    expect(effects(r.stories, world()).keepsakesInWorld).toContain('flawed_blade');
  });
  it('the road: steel at once, and Peg is gone', () => {
    const r = run([...toAsked, [world({ day: 11 }), { kind: 'walk', toward: 'valley_edge', with: 'peg_rudge' }]]);
    expect(effects(r.stories, world())).toMatchObject({ steel: true, pegGone: true });
  });
  it('the blade: no steel for three days, then both of them at the anvil', () => {
    const shown = run([...toAsked, [world({ day: 11 }), { kind: 'show', item: 'flawed_blade', to: 'bertram_aldric' }]]);
    expect(effects(shown.stories, world()).steel).toBe(false);
    const early = run([[world({ day: 13 }), { kind: 'visit', where: 'forge' }]], shown.stories);
    expect(early.stories.striker.stage).toBe('thinking');
    const end = run([[world({ day: 14 }), { kind: 'visit', where: 'forge' }]], shown.stories);
    expect(end.lines.filter(l => l.startsWith('story.striker'))).toEqual(['story.striker.3.blade.after']);
    expect(effects(end.stories, world())).toMatchObject({ steel: true, pegGone: false });
  });
  it('the blade can be shown before he ever gives his terms', () => {
    const r = run([...toAsked.slice(0, 3), [world(), { kind: 'show', item: 'flawed_blade', to: 'bertram_aldric' }]]);
    expect(r.stories.striker.choice).toBe('blade');
  });
  it('if Peg was killed, he knows the flaw, and steel waits for Garrick', () => {
    const dead = world({ bandits: bandits({ peg_rudge: 'dead' }) });
    const r = run([[dead, tick], [dead, { kind: 'show', item: 'flawed_blade', to: 'bertram_aldric' }]]);
    expect(r.lines.filter(l => l.startsWith('story.striker'))).toEqual(['story.striker.dead']);
    expect(effects(r.stories, dead).steel).toEqual({ atWindows: 14 });
  });
});

describe('the tally', () => {
  const toTold: [Facts, Happening][] = [[world(), tick], [world(), { kind: 'campfire', with: ['bram', 'tobin_pike'] }]];
  it('he tells it at a campfire once he trusts the hero, not before', () => {
    const early = world({ bond: { tobin_pike: 1 } });
    expect(run([[early, tick], [early, { kind: 'campfire', with: ['tobin_pike'] }]]).stories.tally.stage).toBe('counts_doors');
    expect(run([[world(), tick], [world(), { kind: 'campfire', with: ['bram'] }]]).stories.tally.stage).toBe('counts_doors');
    expect(run(toTold).lines.filter(l => l.startsWith('story.tally'))).toEqual(['story.tally.1.tobin']);
  });
  it('shown to Ned: Tobin is away three days, then the village is kinder', () => {
    const r = run([...toTold, [world({ day: 12 }), { kind: 'show', item: 'tally_stick', to: 'ned_pike' }]]);
    expect(effects(r.stories, world()).tobinAwayUntil).toBe(15);
    expect(effects(r.stories, world()).goodwill).toBe(0);
    const end = run([[world({ day: 15 }), tick]], r.stories);
    expect(end.lines.filter(l => l.startsWith('story.tally'))).toEqual(['story.tally.3.ned.after']);
    expect(effects(end.stories, world())).toMatchObject({ tobinAwayUntil: null, goodwill: 1 });
  });
  it('shown to Tobin: he burns it at the next fire, stays, and nothing changes in Wick', () => {
    const r = run([...toTold, [world(), { kind: 'show', item: 'tally_stick', to: 'tobin_pike' }], [world(), { kind: 'campfire', with: ['tobin_pike'] }]]);
    expect(r.lines.filter(l => l.startsWith('story.tally'))).toContain('story.tally.3.burn');
    expect(r.takes).toEqual(['tally_stick']);
    expect(effects(r.stories, world())).toMatchObject({ tobinAwayUntil: null, goodwill: 0 });
  });
  it('if Tobin was killed, his father takes the count on himself', () => {
    const dead = world({ bandits: bandits({ tobin_pike: 'dead' }) });
    const r = run([[dead, tick], [dead, { kind: 'show', item: 'tally_stick', to: 'ned_pike' }]]);
    expect(r.lines.filter(l => l.startsWith('story.tally'))).toEqual(['story.tally.dead']);
    expect(effects(r.stories, dead).goodwill).toBe(0);
  });
});

describe('the thatcher', () => {
  const fallen = world({ places: { ...world().places, watch_house: { status: 'freed', timesFreed: 1 } }, day: 30 });
  const toAsked: [Facts, Happening][] = [
    [world(), tick],
    [world(), { kind: 'overheard', line: 'overheard.cart.1' }],
    [world(), { kind: 'spared', who: 'hew_pollard', where: 'tax_cart' }],
  ];
  it('is overheard on the road, and he makes his offer at the ford', () => {
    expect(run(toAsked).lines.filter(l => l.startsWith('story.thatcher'))).toEqual(['story.thatcher.1.village', 'story.thatcher.2.hew']);
  });
  it('makes his offer even if nobody overheard him first', () => {
    expect(run([[world(), tick], [world(), { kind: 'spared', who: 'hew_pollard', where: 'tax_cart' }]]).stories.thatcher.stage).toBe('asked');
  });
  it('Wick: he is home at once, and the Watch-house hardens until it falls', () => {
    const r = run([...toAsked, [world(), { kind: 'walk', toward: 'wick' }]]);
    expect(effects(r.stories, world())).toMatchObject({ hewHome: true, watchHouseWary: true, backGateOpen: false });
    expect(effects(r.stories, fallen).watchHouseWary).toBe(false);
  });
  it('the Watch-house: nothing changes in Wick, the gate is open, and he comes home when it falls', () => {
    const r = run([...toAsked, [world(), { kind: 'walk', toward: 'watch_house' }]]);
    expect(effects(r.stories, world())).toMatchObject({ hewHome: false, watchHouseWary: false, backGateOpen: true });
    expect(run([[world(), { kind: 'visit', where: 'watch_house_back_gate' }]], r.stories).lines.filter(l => l.startsWith('story.thatcher'))).toEqual(['story.thatcher.3.gate']);
    const end = run([[fallen, tick]], r.stories);
    expect(end.lines.filter(l => l.startsWith('story.thatcher'))).toEqual(['story.thatcher.3.gate.after']);
    expect(effects(end.stories, fallen)).toMatchObject({ hewHome: true, backGateOpen: false });
  });
  it('if Hew was killed, the needle is in his boot and Hesper knows whose it was', () => {
    const dead = world({ bandits: bandits({ hew_pollard: 'dead' }) });
    const r = run([[world(), tick], [dead, tick]]);
    expect(effects(r.stories, dead).keepsakesInWorld).toContain('thatching_needle');
    expect(run([[dead, { kind: 'show', item: 'thatching_needle', to: 'hesper' }]], r.stories).lines.filter(l => l.startsWith('story.thatcher'))).toEqual(['story.thatcher.dead']);
  });
  it('closes quietly if the Watch-house falls before he is ever met', () => {
    const r = run([[world(), tick], [fallen, tick]]);
    expect(r.stories.thatcher).toMatchObject({ stage: 'done', choice: 'never_asked' });
    expect(r.lines.filter(l => l.startsWith('story.thatcher'))).toEqual([]);
  });
});

describe('Maren\'s second lamp', () => {
  const next = world({ day: 11 });
  const toOffered: [Facts, Happening][] = [
    [world(), tick],
    [next, { kind: 'visit', where: 'maren' }],
    [next, { kind: 'give', item: 'beeswax', to: 'maren' }],
    [next, { kind: 'show', item: 'guards_helmet', to: 'maren' }],
  ];
  it('she mentions the lamp, takes the wax, and knows the helmet', () => {
    const r = run(toOffered);
    expect(r.lines.filter(l => l.startsWith('story.maren'))).toEqual(['story.maren.1', 'story.maren.2', 'story.maren.3']);
    expect(r.takes).toEqual(['beeswax']);
    expect(effects(r.stories, next)).toMatchObject({ secondLamp: true, helmetInWindow: false });
  });
  it('she does not ask: the helmet is only ever left by the hero showing it again', () => {
    const r = run([...toOffered, [next, { kind: 'show', item: 'guards_helmet', to: 'maren' }]]);
    expect(r.takes).toContain('guards_helmet');
    expect(effects(r.stories, next).helmetInWindow).toBe(true);
  });
  it('kept: she says so once, and it can still be left with her any day after', () => {
    const later = world({ day: 14 });
    const kept = run([...toOffered, [later, { kind: 'visit', where: 'maren' }]]);
    expect(kept.lines.filter(l => l.startsWith('story.maren'))).toContain('story.maren.3.kept');
    expect(run([[later, { kind: 'visit', where: 'maren' }]], kept.stories).lines.filter(l => l.startsWith('story.maren'))).toEqual([]);
    const changed = run([[world({ day: 40 }), { kind: 'give', item: 'guards_helmet', to: 'maren' }]], kept.stories);
    expect(effects(changed.stories, later).helmetInWindow).toBe(true);
  });
  it('the helmet means nothing to her before the second lamp is lit', () => {
    expect(run([[world(), tick], [next, { kind: 'show', item: 'guards_helmet', to: 'maren' }]]).stories.maren.stage).toBe('cupboard');
  });
});

describe('rules for all five', () => {
  it('every line this code can say is in the writing', () => {
    const source = readFileSync('src/core/stories/stories.ts', 'utf8');
    const ids = [...source.matchAll(/'((?:story|thread)\.[a-z0-9_.]+)'/g)].map(m => m[1]);
    expect(ids.length).toBeGreaterThan(40);
    for (const id of new Set(ids)) expect(writing, id).toContain(`\`${id}\``);
  });
  it('every keepsake a story uses exists as an item', () => {
    const items = indexItems();
    for (const id of ['mill_bill', 'flawed_blade', 'tally_stick', 'thatching_needle', 'guards_helmet']) expect(items.has(id)).toBe(true);
  });
  it('no decision can touch a perk, a companion, a household, or an ending', () => {
    const everything: Required<StoryEffects> = effects(newStories(), world());
    const allowed = ['keepsakesInWorld', 'betterFlour', 'millDoorUnbarred', 'dobHeld', 'steel', 'pegGone', 'tobinAwayUntil', 'goodwill',
      'hewHome', 'watchHouseWary', 'backGateOpen', 'secondLamp', 'helmetInWindow'];
    expect(Object.keys(everything).sort()).toEqual([...allowed].sort());
    const perkIds = TALLOWMERE_PERKS.map(p => p.id);
    for (const key of allowed) expect(perkIds).not.toContain(key);
  });
  it('whatever is decided, steel and better flour still come', () => {
    const dead = world({ bandits: bandits({ dob_finch: 'dead', peg_rudge: 'dead' }) });
    const r = run([[dead, tick], [dead, { kind: 'show', item: 'mill_bill', to: 'ansa_marrin' }], [dead, { kind: 'show', item: 'flawed_blade', to: 'bertram_aldric' }]]);
    expect(effects(r.stories, dead).steel).not.toBe(false);
    expect(effects(r.stories, dead).betterFlour).not.toBe(false);
  });
  it('a finished story never moves again', () => {
    const dead = world({ bandits: bandits({ tobin_pike: 'dead' }) });
    const done = run([[dead, tick], [dead, { kind: 'show', item: 'tally_stick', to: 'ned_pike' }]]);
    const again = run([[dead, { kind: 'show', item: 'tally_stick', to: 'ned_pike' }], [dead, tick]], done.stories);
    expect(again.lines).toEqual([]);
    expect(again.stories.tally).toEqual(done.stories.tally);
  });
  it('is the same every time, and never changes the state it was given', () => {
    const start = newStories();
    const a = advance(start, world(), tick);
    expect(advance(start, world(), tick)).toEqual(a);
    expect(start).toEqual(newStories());
    expect(STORY_IDS).toHaveLength(5);
  });
});

describe('loose threads', () => {
  const nothing: OpenThings = { carryingStolen: false, trialSet: false, wishOf: null, placeSeenNotReached: false, helmetFound: false, cartSeen: true };
  const begun = run([[world(), tick]]).stories;
  it('says nothing when nothing is open', () => {
    expect(threadForRest(newStories(), nothing, 3, null)).toBeNull();
  });
  it('offers one line about one open thing', () => {
    expect(openThreads(begun, nothing).sort()).toEqual(['thread.maren', 'thread.miller', 'thread.striker', 'thread.tally', 'thread.thatcher']);
    expect(openThreads(begun, nothing)).toContain(threadForRest(begun, nothing, 3, null));
  });
  it('never says the same one twice running, and moves through what is open', () => {
    let last: string | null = null;
    const said = new Set<string>();
    for (let day = 0; day < 12; day++) {
      const line: string = threadForRest(begun, nothing, day, last)!;
      expect(line).not.toBe(last);
      said.add(line); last = line;
    }
    expect(said.size).toBeGreaterThanOrEqual(4);
  });
  it('is never offered for something already closed', () => {
    const dead = world({ bandits: bandits({ tobin_pike: 'dead' }) });
    const done = run([[dead, tick], [dead, { kind: 'show', item: 'tally_stick', to: 'ned_pike' }]]).stories;
    expect(openThreads(done, nothing)).not.toContain('thread.tally');
  });
  it('a decision with a deadline comes before everything else', () => {
    const dark = world({ millDark: true, places: { ...world().places, mill: { status: 'held', timesFreed: 1 } } });
    const asked = run([[world(), tick], [world(), { kind: 'show', item: 'mill_bill', to: 'dob_finch' }], [dark, tick]]).stories;
    for (let day = 0; day < 5; day++) expect(threadForRest(asked, { ...nothing, carryingStolen: true }, day, null)).toBe('thread.miller.gate');
  });
  it('does not mention the cart before it has been seen, or the road once the helmet is found', () => {
    expect(openThreads(begun, { ...nothing, cartSeen: false })).not.toContain('thread.thatcher');
    const lamp = run([[world(), tick], [world({ day: 11 }), { kind: 'give', item: 'tallow', to: 'maren' }]]).stories;
    expect(openThreads(lamp, nothing)).toContain('thread.maren.road');
    expect(openThreads(lamp, { ...nothing, helmetFound: true })).not.toContain('thread.maren.road');
  });
  it('covers the things the stories do not know about', () => {
    const open = { ...nothing, carryingStolen: true, trialSet: true, wishOf: 'tamsin', placeSeenNotReached: true };
    expect(openThreads(newStories(), open)).toEqual(['thread.stolen', 'thread.trial', 'thread.wish', 'thread.place']);
  });
});

describe('no story can be broken by where the hero went first', () => {
  // A small seeded generator, so a failure can be replayed.
  const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const PEOPLE = ['dob_finch', 'ansa_marrin', 'bertram_aldric', 'ned_pike', 'tobin_pike', 'hesper', 'maren', 'peg_rudge'];
  const ITEMS = ['mill_bill', 'flawed_blade', 'tally_stick', 'thatching_needle', 'guards_helmet', 'tallow', 'steel', 'dobs_spear'];
  const ALPHABET: Happening[] = [
    ...PEOPLE.flatMap(to => ITEMS.flatMap(item => [{ kind: 'show', item, to }, { kind: 'give', item, to }] as Happening[])),
    { kind: 'overheard', line: 'overheard.cart.1' },
    { kind: 'visit', where: 'forge', beforeDawn: true }, { kind: 'visit', where: 'forge' }, { kind: 'visit', where: 'maren' },
    { kind: 'visit', where: 'watch_house_back_gate' },
    { kind: 'campfire', with: ['tobin_pike'] }, { kind: 'campfire', with: [] },
    { kind: 'spared', who: 'hew_pollard', where: 'tax_cart' },
    { kind: 'walk', toward: 'wick' }, { kind: 'walk', toward: 'watch_house' }, { kind: 'walk', toward: 'valley_edge', with: 'peg_rudge' },
    { kind: 'dusk' }, { kind: 'bell', place: 'mill' }, { kind: 'tick' },
  ];
  /** The valley's own order of events, each of which may come at any point among the hero's doings. */
  const TIMELINE: ((f: Facts, fate: (id: string) => BanditState) => Facts)[] = [
    f => ({ ...f, places: { ...f.places, mill: { status: 'freed', timesFreed: 1 } } }),
    (f, fate) => ({ ...f, bandits: { ...f.bandits, dob_finch: fate('dob_finch') } }),
    f => ({ ...f, home: [...f.home, 'marrins'] }),
    f => ({ ...f, home: [...f.home, 'maren'] }),
    f => ({ ...f, places: { ...f.places, forge: { status: 'freed', timesFreed: 1 } } }),
    (f, fate) => ({ ...f, bandits: { ...f.bandits, peg_rudge: fate('peg_rudge'), tobin_pike: fate('tobin_pike') } }),
    f => ({ ...f, places: { ...f.places, mill: { status: 'held', timesFreed: 1 } }, millDark: true }),
    f => ({ ...f, home: [...f.home, 'aldrics'] }),
    f => ({ ...f, home: [...f.home, 'pikes'] }),
    f => ({ ...f, places: { ...f.places, mill: { status: 'freed', timesFreed: 2 } }, millDark: false }),
    (f, fate) => ({ ...f, bandits: { ...f.bandits, hew_pollard: fate('hew_pollard') === 'stayed' ? 'alive' : fate('hew_pollard') } }),
    f => ({ ...f, places: { ...f.places, watch_house: { status: 'freed', timesFreed: 1 } } }),
    f => ({ ...f, bond: { tobin_pike: 2 } }),
  ];
  const START: Facts = {
    places: { mill: { status: 'held', timesFreed: 0 }, forge: { status: 'held', timesFreed: 0 }, watch_house: { status: 'held', timesFreed: 0 } },
    home: ['hesper'], bandits: { dob_finch: 'alive', peg_rudge: 'alive', tobin_pike: 'alive', hew_pollard: 'alive' },
    millDark: false, bond: {}, day: 1,
  };

  it('whatever order things are done in, and whoever lived, every story can still be finished', () => {
    const FATES: BanditState[] = ['stayed', 'dead', 'left', 'returned_to_stane'];
    for (let seed = 1; seed <= 400; seed++) {
      const next = rng(seed);
      const fates: Record<string, BanditState> = {};
      const fate = (id: string) => (fates[id] ??= FATES[Math.floor(next() * FATES.length)]);
      let facts = START;
      let stories = newStories();
      let at = 0;
      // The hero does things in any order, before and after each thing the valley does.
      while (at < TIMELINE.length) {
        if (next() < 0.25) facts = TIMELINE[at++](facts, fate);
        if (next() < 0.3) facts = { ...facts, day: facts.day + 1 };
        const happening = ALPHABET[Math.floor(next() * ALPHABET.length)];
        const before = JSON.stringify(stories);
        stories = advance(stories, facts, happening).stories;
        for (const id of STORY_IDS) if (JSON.parse(before)[id].stage === 'done') expect(stories[id].stage).toBe('done');
      }
      // The valley is whole. Whatever is still open must be closable from here, with what is still in the world.
      for (let round = 0; round < 12 && STORY_IDS.some(id => stories[id].stage !== 'done'); round++) {
        facts = { ...facts, day: facts.day + 1 };
        for (const happening of ALPHABET) stories = advance(stories, facts, happening).stories;
      }
      const open = STORY_IDS.filter(id => stories[id].stage !== 'done').map(id => `${id}:${stories[id].stage}`);
      expect(open, `seed ${seed}, fates ${JSON.stringify(fates)}`).toEqual([]);
    }
  });
});

describe('nobody moves without a trace', () => {
  const at = (over: Partial<Stories>): Stories => ({ ...newStories(), ...over });
  it('everyone a story takes away has a line that says where they are, and it is in the writing', () => {
    const cases: [Partial<Stories>, string, string][] = [
      [{ miller: { stage: 'caught', since: 5, choice: 'sent' } }, 'trace.dob', 'ansa_marrin'],
      [{ striker: { stage: 'done', since: 5, choice: 'road' } }, 'trace.peg', 'bertram_aldric'],
      [{ tally: { stage: 'working', since: 5, choice: 'ned' } }, 'trace.tobin', 'hesper'],
      [{ thatcher: { stage: 'inside', since: 5, choice: 'gate' } }, 'trace.hew', 'hesper'],
    ];
    for (const [over, line, saidBy] of cases) {
      expect(traces(at(over), world())).toEqual([{ line, saidBy }]);
      expect(writing, line).toContain(`\`${line}\``);
    }
    expect(traces(newStories(), world())).toEqual([]);
  });
  it('every way a story can move someone is covered: an effect that takes a person away has a trace', () => {
    // If a new effect that moves a person is added, add its trace here and in the writing.
    const moving: (keyof StoryEffects)[] = ['dobHeld', 'pegGone', 'tobinAwayUntil', 'backGateOpen'];
    const fx = effects(newStories(), world());
    for (const key of moving) expect(key in fx).toBe(true);
    expect(moving).toHaveLength(4);
  });
});
