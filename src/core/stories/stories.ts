// The five household stories and Hesper's loose threads (GAME_DESIGN.md section 9; docs/writing/stories.md).
// Claude's. Pure logic, shipped dark until task 007. The lines themselves are in the writing; this decides which
// is said when, what each decision changes, and that no decision locks anything away.
import type { BanditState, PlaceStatus } from '../types';

export type StoryId = 'miller' | 'striker' | 'tally' | 'thatcher' | 'maren';
export const STORY_IDS: readonly StoryId[] = ['miller', 'striker', 'tally', 'thatcher', 'maren'];

/** What the stories need to know about the world. A projection of the game state, supplied by the caller. */
export interface Facts {
  places: Readonly<Record<string, { status: PlaceStatus; timesFreed: number }>>;
  /** Household ids that are home. */
  home: readonly string[];
  bandits: Readonly<Record<string, BanditState>>;
  /** The Mill has been retaken and not yet freed again. */
  millDark: boolean;
  /** Bond stage with each companion, 1 to 3. */
  bond: Readonly<Record<string, number>>;
  day: number;
}

/** Something the hero did, or that happened. */
export type Happening =
  | { kind: 'show'; item: string; to: string }
  | { kind: 'give'; item: string; to: string }
  | { kind: 'overheard'; line: string }
  | { kind: 'visit'; where: string; beforeDawn?: boolean }
  | { kind: 'campfire'; with: readonly string[] }
  | { kind: 'spared'; who: string; where: string }
  | { kind: 'walk'; toward: 'wick' | 'watch_house' | 'valley_edge'; with?: string }
  | { kind: 'dusk' }
  | { kind: 'bell'; place: string }
  | { kind: 'tick' };

export interface StoryState {
  /** A named stage. 'closed' is before it can begin; 'done' is finished. */
  stage: string;
  /** The day the current stage began. */
  since: number;
  /** How the decision went, once made. */
  choice?: string;
  /** True when the person at the centre was dead or gone and the shorter form was told. */
  short?: boolean;
}

export type Stories = Record<StoryId, StoryState>;

export interface Step {
  state: StoryState;
  /** Line ids to play, in order (docs/writing/stories.md). */
  lines: string[];
  /** A keepsake the hero hands over for good. */
  takes?: string;
}

export function newStories(): Stories {
  const fresh = (): StoryState => ({ stage: 'closed', since: 0 });
  return { miller: fresh(), striker: fresh(), tally: fresh(), thatcher: fresh(), maren: fresh() };
}

const freed = (f: Facts, place: string) => f.places[place]?.status === 'freed';
const isHome = (f: Facts, household: string) => f.home.includes(household);
const stayed = (f: Facts, who: string) => f.bandits[who] === 'stayed';
/** Dead, or gone from the valley for good. Not "still one of Stane's" and not "not yet decided". */
const lost = (f: Facts, who: string) => ['dead', 'left', 'returned_to_stane'].includes(f.bandits[who]);
const to = (s: StoryState, stage: string, f: Facts, extra: Partial<StoryState> = {}): StoryState => ({ ...s, stage, since: f.day, ...extra });
const same = (s: StoryState): Step => ({ state: s, lines: [] });

type Rule = (s: StoryState, f: Facts, h: Happening) => Step;

const miller: Rule = (s, f, h) => {
  const ready = freed(f, 'mill') || f.millDark ? isHome(f, 'marrins') : false;
  if (s.stage === 'closed') {
    if (!isHome(f, 'marrins')) return same(s);
    if (stayed(f, 'dob_finch')) return { state: to(s, 'wont_go_up', f), lines: ['story.miller.1.corin', 'story.miller.1.dob'] };
    if (lost(f, 'dob_finch')) return { state: to(s, 'short', f, { short: true }), lines: [] };
    return same(s);
  }
  if (!ready) return same(s);
  if (s.stage === 'short' && h.kind === 'show' && h.item === 'mill_bill' && h.to === 'ansa_marrin') {
    return { state: to(s, 'done', f, { choice: 'given_to_corin' }), lines: ['story.miller.dead'] };
  }
  if (s.stage === 'wont_go_up' && h.kind === 'show' && h.item === 'mill_bill' && h.to === 'dob_finch') {
    return { state: to(s, 'at_the_mill', f), lines: ['story.miller.2.dob', 'story.miller.2.ansa'] };
  }
  if (s.stage === 'at_the_mill') {
    if (f.millDark) return { state: to(s, 'asked', f), lines: ['story.miller.3.dob'] };
    // The turn came and went before he was back at the stones: the story ends where it is, with him at the Mill.
    if ((f.places.mill?.timesFreed ?? 0) >= 2) return { state: to(s, 'done', f, { choice: 'never_asked' }), lines: [] };
  }
  if (s.stage === 'asked') {
    if (h.kind === 'give' && h.item === 'dobs_spear' && h.to === 'dob_finch') return { state: to(s, 'sent', f, { choice: 'sent' }), lines: [] };
    if (h.kind === 'dusk') return { state: to(s, 'kept', f, { choice: 'kept' }), lines: [] };
  }
  if (s.stage === 'sent' && h.kind === 'bell' && h.place === 'mill') return { state: to(s, 'caught', f), lines: [] };
  if (s.stage === 'sent' && freed(f, 'mill')) return { state: to(s, 'done', f), lines: ['story.miller.3.sent', 'story.miller.3.ansa.sent'] };
  if (s.stage === 'kept' && freed(f, 'mill')) return { state: to(s, 'done', f), lines: ['story.miller.3.kept', 'story.miller.3.ansa.kept'] };
  if (s.stage === 'caught' && freed(f, 'watch_house')) return { state: to(s, 'done', f), lines: ['story.miller.3.caught', 'story.miller.3.ansa.sent'] };
  return same(s);
};

const striker: Rule = (s, f, h) => {
  if (s.stage === 'closed') {
    if (!freed(f, 'forge') || !isHome(f, 'aldrics')) return same(s);
    if (stayed(f, 'peg_rudge')) return { state: to(s, 'no_steel', f), lines: ['story.striker.1.garrick'] };
    if (lost(f, 'peg_rudge')) return { state: to(s, 'short', f, { short: true }), lines: [] };
    return same(s);
  }
  const showsBlade = h.kind === 'show' && h.item === 'flawed_blade' && h.to === 'bertram_aldric';
  if (s.stage === 'short' && showsBlade) return { state: to(s, 'done', f, { choice: 'garrick_learns' }), lines: ['story.striker.dead'] };
  if (s.stage === 'no_steel') {
    if (h.kind === 'show' && (h.item === 'steel' || h.item === 'iron_ore') && h.to === 'bertram_aldric') return { state: s, lines: ['story.striker.1.bertram'] };
    if (h.kind === 'visit' && h.where === 'forge' && h.beforeDawn) return { state: to(s, 'seen_her', f), lines: ['story.striker.2.peg'] };
  }
  if (s.stage === 'seen_her' && h.kind === 'visit' && h.where === 'forge' && !h.beforeDawn) {
    return { state: to(s, 'asked', f), lines: ['story.striker.3.bertram'] };
  }
  if (s.stage === 'seen_her' || s.stage === 'asked') {
    if (showsBlade) return { state: to(s, 'thinking', f, { choice: 'blade' }), lines: ['story.striker.3.blade'] };
  }
  if (s.stage === 'asked' && h.kind === 'walk' && h.toward === 'valley_edge' && h.with === 'peg_rudge') {
    return { state: to(s, 'done', f, { choice: 'road' }), lines: ['story.striker.3.road', 'story.striker.3.road.garrick'] };
  }
  if (s.stage === 'thinking' && f.day - s.since >= 3 && h.kind === 'visit' && h.where === 'forge') {
    return { state: to(s, 'done', f), lines: ['story.striker.3.blade.after'] };
  }
  return same(s);
};

const tally: Rule = (s, f, h) => {
  if (s.stage === 'closed') {
    if (!isHome(f, 'pikes')) return same(s);
    if (stayed(f, 'tobin_pike')) return { state: to(s, 'counts_doors', f), lines: [] };
    if (lost(f, 'tobin_pike')) return { state: to(s, 'short', f, { short: true }), lines: [] };
    return same(s);
  }
  const showsStick = (who: string) => h.kind === 'show' && h.item === 'tally_stick' && h.to === who;
  if (s.stage === 'short' && showsStick('ned_pike')) return { state: to(s, 'done', f, { choice: 'ned_works_it_off' }), lines: ['story.tally.dead'] };
  if (s.stage === 'counts_doors' && h.kind === 'campfire' && h.with.includes('tobin_pike') && (f.bond.tobin_pike ?? 1) >= 2) {
    return { state: to(s, 'told', f), lines: ['story.tally.1.tobin'] };
  }
  if (s.stage === 'told') {
    if (showsStick('ned_pike')) return { state: to(s, 'working', f, { choice: 'ned' }), lines: ['story.tally.3.ned'] };
    if (showsStick('tobin_pike')) return { state: to(s, 'to_burn', f, { choice: 'burn' }), lines: [] };
  }
  if (s.stage === 'working' && f.day - s.since >= 3) return { state: to(s, 'done', f), lines: ['story.tally.3.ned.after'] };
  if (s.stage === 'to_burn' && h.kind === 'campfire' && h.with.includes('tobin_pike')) {
    return { state: to(s, 'done', f), lines: ['story.tally.3.burn'], takes: 'tally_stick' };
  }
  return same(s);
};

const thatcher: Rule = (s, f, h) => {
  const fallen = freed(f, 'watch_house');
  if (s.stage === 'closed') {
    if (fallen) return same(s);
    if (f.bandits.hew_pollard === 'dead') return { state: to(s, 'short', f, { short: true }), lines: [] };
    return { state: to(s, 'on_the_road', f), lines: [] };
  }
  if (s.stage === 'short' && h.kind === 'show' && h.item === 'thatching_needle' && h.to === 'hesper') {
    return { state: to(s, 'done', f, { choice: 'remembered' }), lines: ['story.thatcher.dead'] };
  }
  if (s.stage === 'on_the_road' || s.stage === 'heard') {
    if (f.bandits.hew_pollard === 'dead') return { state: to(s, 'short', f, { short: true }), lines: [] };
    if (h.kind === 'spared' && h.who === 'hew_pollard' && h.where === 'tax_cart') return { state: to(s, 'asked', f), lines: ['story.thatcher.2.hew'] };
    // The Watch-house fell first. He is won back, or not, the ordinary way, and there is no decision to make.
    if (fallen) return { state: to(s, 'done', f, { choice: 'never_asked' }), lines: [] };
    if (s.stage === 'on_the_road' && h.kind === 'overheard' && h.line === 'overheard.cart.1') return { state: to(s, 'heard', f), lines: ['story.thatcher.1.village'] };
  }
  if (s.stage === 'asked' && h.kind === 'walk') {
    if (h.toward === 'wick') return { state: to(s, 'done', f, { choice: 'wick' }), lines: ['story.thatcher.3.wick', 'story.thatcher.3.wick.hesper'] };
    if (h.toward === 'watch_house') return { state: to(s, 'inside', f, { choice: 'gate' }), lines: [] };
  }
  if (s.stage === 'inside' && h.kind === 'visit' && h.where === 'watch_house_back_gate') return { state: s, lines: ['story.thatcher.3.gate'] };
  if (s.stage === 'inside' && fallen) return { state: to(s, 'done', f), lines: ['story.thatcher.3.gate.after'] };
  return same(s);
};

const WAX = ['tallow', 'beeswax', 'candle'];
const maren: Rule = (s, f, h) => {
  if (s.stage === 'closed') return isHome(f, 'maren') ? { state: to(s, 'cupboard', f), lines: [] } : same(s);
  const atMaren = (h.kind === 'show' || h.kind === 'give') && h.to === 'maren';
  if (s.stage === 'cupboard') {
    if (h.kind === 'visit' && h.where === 'maren' && f.day > s.since) return { state: s, lines: ['story.maren.1'] };
    if (atMaren && WAX.includes((h as { item: string }).item)) return { state: to(s, 'second_lamp', f), lines: ['story.maren.2'], takes: (h as { item: string }).item };
  }
  if (s.stage === 'second_lamp' && atMaren && (h as { item: string }).item === 'guards_helmet') return { state: to(s, 'offered', f), lines: ['story.maren.3'] };
  if (s.stage === 'offered' || s.stage === 'kept') {
    // She does not ask. Showing it to her a second time is the hero's answer, and it can be given at any later time.
    if (atMaren && (h as { item: string }).item === 'guards_helmet') {
      return { state: to(s, 'done', f, { choice: 'left' }), lines: ['story.maren.3.left', 'story.maren.3.left.hesper'], takes: 'guards_helmet' };
    }
  }
  if (s.stage === 'offered' && h.kind === 'visit' && h.where === 'maren' && f.day > s.since) return { state: to(s, 'kept', f, { choice: 'kept' }), lines: ['story.maren.3.kept'] };
  return same(s);
};

const RULES: Record<StoryId, Rule> = { miller, striker, tally, thatcher, maren };

/** Move every story on by one happening. Call with `{ kind: 'tick' }` each morning and after anything that changes the facts. */
export function advance(stories: Stories, facts: Facts, happening: Happening): { stories: Stories; lines: string[]; takes: string[] } {
  const next = { ...stories };
  const lines: string[] = [];
  const takes: string[] = [];
  for (const id of STORY_IDS) {
    if (stories[id].stage === 'done') continue;
    const step = RULES[id](stories[id], facts, happening);
    next[id] = step.state;
    lines.push(...step.lines);
    if (step.takes) takes.push(step.takes);
  }
  return { stories: next, lines, takes };
}

/**
 * What the stories change in the world, for the systems that own each thing. Every key is here, so a test can check
 * that none of them is a perk, a companion, a household's return, or an ending.
 */
export interface StoryEffects {
  /** Keepsakes that can be found in the world. */
  keepsakesInWorld: string[];
  /** Flour is better and cheaper: at once with Dob at the stones, or at this many lit windows without him. */
  betterFlour: true | { atWindows: number } | false;
  /** The night the Mill is retaken back: its door is unbarred and Brock Tull is away from it for the first watch. */
  millDoorUnbarred: boolean;
  /** Dob is held at the Watch-house until it falls. */
  dobHeld: boolean;
  /** Steel can be made: now, or at this many lit windows. */
  steel: true | { atWindows: number } | false;
  /** Peg has left the valley. */
  pegGone: boolean;
  /** Tobin cannot travel with the company until this day. */
  tobinAwayUntil: number | null;
  /** The village's goodwill toward the hero, 0 to 1, for Market.goodwill. */
  goodwill: number;
  /** Hew is living in Wick and mending roofs. */
  hewHome: boolean;
  /** The Watch-house is short a man: a fourth guard on the cart and two men on the back gate. */
  watchHouseWary: boolean;
  /** The Watch-house back gate is unbarred at midnight. */
  backGateOpen: boolean;
  /** Maren's second lamp is lit in her window; and the helmet stands beside it. */
  secondLamp: boolean;
  helmetInWindow: boolean;
}

export function effects(stories: Stories, facts: Facts): StoryEffects {
  const { miller: m, striker: k, tally: t, thatcher: h, maren: n } = stories;
  const after = (s: StoryState, ...stages: string[]) => stages.includes(s.stage);
  const dobAtMill = !m.short && after(m, 'at_the_mill', 'asked', 'sent', 'kept', 'caught', 'done');
  return {
    keepsakesInWorld: [
      ...(m.stage !== 'closed' && m.stage !== 'done' && !dobAtMill ? ['mill_bill'] : []),
      ...(after(k, 'seen_her', 'asked', 'short') ? ['flawed_blade'] : []),
      ...(after(t, 'told', 'short') ? ['tally_stick'] : []),
      ...(h.short && h.stage === 'short' ? ['thatching_needle'] : []),
    ],
    betterFlour: dobAtMill ? true : m.short && m.stage === 'done' ? { atWindows: 12 } : false,
    millDoorUnbarred: m.stage === 'sent',
    dobHeld: m.stage === 'caught',
    steel: k.stage === 'done' ? (k.short ? { atWindows: 14 } : true) : false,
    pegGone: k.choice === 'road',
    tobinAwayUntil: t.stage === 'working' ? t.since + 3 : null,
    goodwill: t.stage === 'done' && t.choice === 'ned' ? 1 : 0,
    hewHome: h.stage === 'done' && (h.choice === 'wick' || h.choice === 'gate'),
    watchHouseWary: h.choice === 'wick' && !freed(facts, 'watch_house'),
    backGateOpen: h.stage === 'inside',
    secondLamp: after(n, 'second_lamp', 'offered', 'kept', 'done'),
    helmetInWindow: n.choice === 'left',
  };
}

// ---------- Where they went ----------

/**
 * Nobody in a story moves without a trace (design section 9). For everyone a story has taken from where the player
 * last saw them, the line that says where they are, and who says it (docs/writing/stories.md, "Where they went").
 */
export function traces(stories: Stories, facts: Facts): { line: string; saidBy: string }[] {
  const fx = effects(stories, facts);
  const out: { line: string; saidBy: string }[] = [];
  if (fx.dobHeld) out.push({ line: 'trace.dob', saidBy: 'ansa_marrin' });
  if (fx.pegGone) out.push({ line: 'trace.peg', saidBy: 'bertram_aldric' });
  if (fx.tobinAwayUntil !== null) out.push({ line: 'trace.tobin', saidBy: 'hesper' });
  if (fx.backGateOpen) out.push({ line: 'trace.hew', saidBy: 'hesper' });
  return out;
}

// ---------- Loose threads ----------

/** Other things left open, which the caller knows and the stories do not. */
export interface OpenThings {
  carryingStolen: boolean;
  trialSet: boolean;
  /** The companion whose wish is known and not done, if any. */
  wishOf: string | null;
  placeSeenNotReached: boolean;
  helmetFound: boolean;
  /** The tax cart has come through Wick at least once while the hero was there. */
  cartSeen: boolean;
}

/** Every thread that is open now, as line ids from the table in docs/writing/stories.md. */
export function openThreads(stories: Stories, open: OpenThings): string[] {
  const { miller: m, striker: k, tally: t, thatcher: h, maren: n } = stories;
  const out: string[] = [];
  if (m.stage === 'wont_go_up' || (m.stage === 'short' && !m.choice)) out.push('thread.miller');
  if (m.stage === 'asked') out.push('thread.miller.gate');
  if (k.stage === 'no_steel' || k.stage === 'seen_her' || k.stage === 'asked') out.push('thread.striker');
  if (k.stage === 'thinking') out.push('thread.striker.wait');
  if (t.stage === 'counts_doors' || t.stage === 'told') out.push('thread.tally');
  if (h.stage === 'on_the_road' && open.cartSeen) out.push('thread.thatcher');
  if (n.stage === 'cupboard') out.push('thread.maren');
  if (n.stage === 'second_lamp' && !open.helmetFound) out.push('thread.maren.road');
  if (open.carryingStolen) out.push('thread.stolen');
  if (open.trialSet) out.push('thread.trial');
  if (open.wishOf) out.push('thread.wish');
  if (open.placeSeenNotReached) out.push('thread.place');
  return out;
}

/**
 * The one line Hesper says when the hero rests in Wick, or null. Never the same one twice running. The choice
 * turns with the day, so it is the same every time for the same save and still moves through what is open.
 * The most pressing thread, a decision with a deadline, always comes first.
 */
export function threadForRest(stories: Stories, open: OpenThings, day: number, lastSaid: string | null): string | null {
  const threads = openThreads(stories, open);
  if (threads.includes('thread.miller.gate')) return 'thread.miller.gate';
  const choices = threads.filter(t => t !== lastSaid);
  if (choices.length === 0) return null;
  return choices[((day % choices.length) + choices.length) % choices.length];
}
