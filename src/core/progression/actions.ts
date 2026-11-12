// The only things that earn experience. Every entry is something the hero accomplished.
// There is deliberately no action for time passing, standing near enemies, or taking damage:
// GAME_DESIGN.md section 6 forbids experience from those, and a test checks this list.

import type { SkillId } from './types';

export interface ActionAward {
  skill: SkillId;
  base: number;
}

export const ACTIONS: Record<string, ActionAward[]> = {
  // Archery
  arrow_hit: [{ skill: 'archery', base: 5 }],
  weak_point_hit: [{ skill: 'archery', base: 12 }],
  perfect_draw_hit: [{ skill: 'archery', base: 8 }],
  hunt_kill: [{ skill: 'archery', base: 4 }],

  // Melee
  blade_hit: [{ skill: 'melee', base: 4 }],
  knife_hit: [{ skill: 'melee', base: 5 }],
  critical_strike: [{ skill: 'melee', base: 12 }],

  // Toughness: earned by not being hit, and by coming through
  perfect_dodge: [{ skill: 'toughness', base: 8 }],
  fight_survived: [{ skill: 'toughness', base: 15 }],
  place_freed: [{ skill: 'toughness', base: 40 }],

  // Stealth: each of these is an event, never a duration
  passed_unnoticed: [{ skill: 'stealth', base: 8 }],
  enemy_marked: [{ skill: 'stealth', base: 3 }],
  unaware_strike: [{ skill: 'stealth', base: 12 }],
  knockout: [{ skill: 'stealth', base: 10 }],

  // Leadership
  place_freed_with_squad: [{ skill: 'leadership', base: 40 }],
  bandit_won_back: [{ skill: 'leadership', base: 30 }],
  companions_standing: [{ skill: 'leadership', base: 10 }],

  // Gathering
  forage: [{ skill: 'gathering', base: 4 }],
  hunt_yield: [{ skill: 'gathering', base: 5 }],
  cut_wood: [{ skill: 'gathering', base: 4 }],
  mine_ore: [{ skill: 'gathering', base: 6 }],
  catch_fish: [{ skill: 'gathering', base: 5 }],

  // Crafting
  arrows_made: [{ skill: 'fletching', base: 5 }],
  meal_cooked: [{ skill: 'cooking', base: 6 }],
  item_crafted: [{ skill: 'smithing', base: 12 }],
  item_upgraded: [{ skill: 'smithing', base: 15 }],
};

/** Words that must never appear in an action id. Guards the rule above against later edits. */
export const FORBIDDEN_ACTION_WORDS = ['idle', 'wait', 'time', 'near', 'damage_taken', 'hit_taken', 'hurt'];
