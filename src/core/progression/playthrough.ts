// A model of whole playthroughs, used to check that growth tracks the story before the real game can be played.
// It feeds the real progression code the accomplishments a player of a given style would plausibly earn between
// story beats. The counts are estimates, written down here so they can be argued with and replaced: task 006 swaps
// them for counts measured from the bot. The rules being tested are real; only the inputs are modelled.

import { TALLOWMERE_PERKS } from '../../data/perks/tallowmere';
import type { ExperienceEvent as SharedEvent } from '../types';
import { ACTIONS } from './actions';
import type { Beat } from './pacing';
import { earnPerk, equipPerks, indexPerks, perksEarned, recordPerkUse, settleGains, slotCount } from './perks';
import { awardSharedEvent, createProgression } from './skills';
import type { PerkDef, ProgressionState, Rank } from './types';

export const BEATS: readonly Beat[] = ['first_lantern', 'forge_freed', 'mill_retaken', 'facing_stane', 'valley_complete'];

/** What the valley puts in front of the player between one beat and the next. The same for every style. */
export interface Stretch {
  beat: Beat;
  /** Enemies who must be dealt with to reach the beat. */
  enemies: number;
  /** Further enemies a thorough player also meets: patrols, the tax cart, wolves, the boar. */
  optionalEnemies: number;
  fights: number;
  placesFreed: number;
  /** In-game days spent, which sets how much gathering and crafting there is time for. */
  days: number;
  /** How hard the feats are here, on the shared 0 to 1 scale. Tougher units and tighter places later. */
  difficulty: number;
}

export const STRETCHES: readonly Stretch[] = [
  { beat: 'first_lantern', enemies: 7, optionalEnemies: 3, fights: 3, placesFreed: 1, days: 3, difficulty: 0.16 },
  { beat: 'forge_freed', enemies: 8, optionalEnemies: 6, fights: 4, placesFreed: 1, days: 4, difficulty: 0.28 },
  { beat: 'mill_retaken', enemies: 6, optionalEnemies: 10, fights: 4, placesFreed: 0, days: 4, difficulty: 0.38 },
  { beat: 'facing_stane', enemies: 14, optionalEnemies: 8, fights: 6, placesFreed: 1, days: 5, difficulty: 0.48 },
  { beat: 'valley_complete', enemies: 6, optionalEnemies: 10, fights: 4, placesFreed: 1, days: 6, difficulty: 0.6 },
];

/** How one kind of player plays. Every number is "times per enemy", "per fight", or "per day". */
export interface Style {
  name: string;
  /** The share of optional enemies, secrets, trials, and side work this player bothers with, 0 to 1. */
  thoroughness: number;
  perEnemy: Record<string, number>;
  perFight: Record<string, number>;
  perDay: Record<string, number>;
}

const FIGHT = { fight_survived: 1, companions_standing: 0.7 };

export const STYLES: Readonly<Record<string, Style>> = {
  /** Watches, marks, and shoots. The player the game is built around. */
  scout: {
    name: 'scout', thoroughness: 0.6,
    perEnemy: { arrow_hit: 3, weak_point_hit: 0.9, perfect_draw_hit: 0.7, enemy_marked: 1, passed_unnoticed: 0.6, unaware_strike: 0.5, knockout: 0.4, blade_hit: 0.6, perfect_dodge: 0.3 },
    perFight: FIGHT,
    perDay: { forage: 2, hunt_kill: 1, hunt_yield: 1, arrows_made: 1.5, meal_cooked: 0.7, cut_wood: 0.5 },
  },
  /** Walks in the front gate with Bram. */
  brawler: {
    name: 'brawler', thoroughness: 0.5,
    perEnemy: { blade_hit: 4.5, critical_strike: 0.8, knife_hit: 0.8, perfect_dodge: 1.3, arrow_hit: 1, enemy_marked: 0.4, weak_point_hit: 0.1, unaware_strike: 0.15, passed_unnoticed: 0.1 },
    perFight: { fight_survived: 1.6, companions_standing: 1 },
    perDay: { forage: 1.5, meal_cooked: 1, hunt_yield: 0.5, mine_ore: 0.5, item_crafted: 0.3, arrows_made: 0.5 },
  },
  /** Gathers, fletches, cooks, and smiths, and fights with what that makes. */
  maker: {
    name: 'maker', thoroughness: 0.7,
    perEnemy: { arrow_hit: 3, weak_point_hit: 0.6, perfect_draw_hit: 0.4, enemy_marked: 0.7, blade_hit: 1, perfect_dodge: 0.4, knockout: 0.2, unaware_strike: 0.2, passed_unnoticed: 0.3 },
    perFight: FIGHT,
    perDay: { forage: 4, hunt_kill: 1, hunt_yield: 2, cut_wood: 1.5, mine_ore: 1.5, catch_fish: 1, arrows_made: 3, meal_cooked: 2, item_crafted: 0.8, item_upgraded: 0.4 },
  },
  /** Does only what the story requires. */
  rusher: {
    name: 'rusher', thoroughness: 0,
    perEnemy: { arrow_hit: 2.5, weak_point_hit: 0.5, blade_hit: 1.5, perfect_dodge: 0.5, perfect_draw_hit: 0.3 },
    perFight: { fight_survived: 1, companions_standing: 0.5 },
    perDay: {},
  },
  /** Does everything, everywhere, and then does it again. */
  completionist: {
    name: 'completionist', thoroughness: 1,
    perEnemy: { arrow_hit: 3.5, weak_point_hit: 1.2, perfect_draw_hit: 1, enemy_marked: 1, passed_unnoticed: 0.8, unaware_strike: 0.6, knockout: 0.6, blade_hit: 1.5, critical_strike: 0.3, knife_hit: 0.4, perfect_dodge: 0.8 },
    perFight: { fight_survived: 1, companions_standing: 1 },
    perDay: { forage: 5, hunt_kill: 2, hunt_yield: 2, cut_wood: 2, mine_ore: 2, catch_fish: 1.5, arrows_made: 3, meal_cooked: 2.5, item_crafted: 1, item_upgraded: 0.5 },
  },
};

/**
 * When each perk that does not come from levelling first becomes possible, and how thorough a player must be to
 * get it then. A less thorough player picks it up one stretch later if `late` allows, or never.
 */
const PERK_TIMES: Record<string, { from: Beat; needs: number }> = {
  first_lantern: { from: 'first_lantern', needs: 0 }, // story
  the_count: { from: 'first_lantern', needs: 0.4 }, // trial, natural before the Mill
  long_shot: { from: 'first_lantern', needs: 0.5 }, // trial
  practice_ground: { from: 'first_lantern', needs: 0.6 }, // secret
  the_trail: { from: 'forge_freed', needs: 0.5 }, // trial
  marrins: { from: 'forge_freed', needs: 0.3 }, // the Marrins come home once the Mill is free
  fisher: { from: 'forge_freed', needs: 0.6 },
  waterfall_cave: { from: 'forge_freed', needs: 0.7 }, // secret
  tobin_pike: { from: 'mill_retaken', needs: 0.4 }, // won back at the Forge
  oona: { from: 'mill_retaken', needs: 0.4 }, // six lit windows
  quiet_lantern: { from: 'mill_retaken', needs: 0.5 }, // trial
  the_turn_survived: { from: 'facing_stane', needs: 0 }, // story
  garrick: { from: 'facing_stane', needs: 0.5 }, // ten lit windows
  old_aldric: { from: 'facing_stane', needs: 0.5 }, // the hammer returned
  night_road: { from: 'facing_stane', needs: 0.5 }, // trial
  stane_yields: { from: 'valley_complete', needs: 0 }, // story
  hespers_shoulder: { from: 'valley_complete', needs: 0.5 }, // the last trial
};

const SCOUT_TRIALS = ['long_shot', 'the_trail', 'the_count'];
const WARDEN_TRIALS = ['quiet_lantern', 'night_road', 'hespers_shoulder'];

function sourceKey(def: PerkDef): string | null {
  const s = def.source;
  switch (s.kind) {
    case 'trial': return s.trial;
    case 'person': return s.person;
    case 'secret': return s.place;
    case 'story': return s.moment;
    default: return null;
  }
}

export interface Snapshot {
  beat: Beat;
  style: string;
  state: ProgressionState;
  perks: number;
  slots: number;
  rank: Rank;
  /** Highest mastery rank among earned perks. */
  topMastery: number;
}

/** Deterministic rounding of a fractional count: the fraction carries over, so 0.4 a time gives 2 in 5. */
function counter() {
  const carry: Record<string, number> = {};
  return (key: string, amount: number): number => {
    const total = (carry[key] ?? 0) + amount;
    const whole = Math.floor(total + 1e-9);
    carry[key] = total - whole;
    return whole;
  };
}

/** Play the valley through as one style and report the hero at each beat. */
export function playthrough(style: Style, defs: readonly PerkDef[] = TALLOWMERE_PERKS, stretches: readonly Stretch[] = STRETCHES): Snapshot[] {
  const index = indexPerks(defs);
  const state = createProgression();
  const take = counter();
  const trials = new Set<string>();
  const out: Snapshot[] = [];
  let serial = 0;

  const award = (action: string, times: number, difficulty: number) => {
    const skill = ACTIONS[action][0].skill;
    for (let i = 0; i < times; i++) {
      const event: SharedEvent = { skill, action, targetId: `t${serial++}`, difficulty, regionId: 'tallowmere' };
      settleGains(state, defs, index, awardSharedEvent(state, event));
    }
  };

  stretches.forEach((stretch, at) => {
    const enemies = stretch.enemies + stretch.optionalEnemies * style.thoroughness;
    const fights = stretch.fights * (0.6 + 0.4 * style.thoroughness);
    for (const [action, rate] of Object.entries(style.perEnemy)) award(action, take(action, rate * enemies), stretch.difficulty);
    for (const [action, rate] of Object.entries(style.perFight)) award(action, take(action, rate * fights), stretch.difficulty);
    for (const [action, rate] of Object.entries(style.perDay)) award(action, take(action, rate * stretch.days), stretch.difficulty * 0.85);
    award('place_freed', stretch.placesFreed, stretch.difficulty);
    award('place_freed_with_squad', stretch.placesFreed, stretch.difficulty);
    award('bandit_won_back', take('won_back', stretch.placesFreed * (1 + 2 * style.thoroughness)), stretch.difficulty);

    // Perks that come from the world rather than from levels.
    for (const def of defs) {
      const key = sourceKey(def);
      const when = key ? PERK_TIMES[key] : undefined;
      if (!key || !when) continue;
      const opened = BEATS.indexOf(when.from);
      // Thorough enough: at once. Half as thorough as needed: one stretch late. Otherwise never.
      const due = style.thoroughness >= when.needs ? opened : style.thoroughness >= when.needs / 2 ? opened + 1 : Infinity;
      if (at >= due && earnPerk(state, def) && def.source.kind === 'trial') trials.add(def.source.trial);
    }
    if (SCOUT_TRIALS.every(t => trials.has(t)) && state.rank === 'apprentice') state.rank = 'scout';
    if (WARDEN_TRIALS.every(t => trials.has(t)) && state.rank === 'scout') state.rank = 'warden';

    // Equip as many as the rank allows, and use each a few times per fight.
    const equipped = Object.keys(state.perks).slice(0, slotCount(state));
    equipPerks(state, equipped, true);
    for (const id of equipped) for (let i = 0; i < Math.round(fights * 2); i++) recordPerkUse(state, id);

    out.push({
      beat: stretch.beat, style: style.name, state: structuredClone(state), perks: perksEarned(state), slots: slotCount(state), rank: state.rank,
      topMastery: Math.max(0, ...Object.values(state.perks).map(p => p.rank)),
    });
  });
  return out;
}

/** Every perk a model player can reach must be scheduled, so a new perk cannot be forgotten here. */
export function unscheduledPerks(defs: readonly PerkDef[] = TALLOWMERE_PERKS): string[] {
  return defs.filter(d => d.source.kind !== 'level' && !(sourceKey(d)! in PERK_TIMES)).map(d => d.id);
}
