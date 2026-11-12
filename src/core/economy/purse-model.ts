// A model of the purse across whole playthroughs, to check section 6's rule that the purse is tested: always enough
// for the essentials, never so much that nothing is left to want. Like the progression model beside it, the rules
// are real and the amounts found and spent are estimates, replaced by measured ones in task 006.
import { STRETCHES, STYLES, type Stretch, type Style } from '../progression/playthrough';
import type { Beat } from '../progression/pacing';
import { PROJECTS } from './projects';
import { ECONOMY_TUNING } from './tuning';

/** Untuned placeholders: what the valley pays out and what living in it costs. */
export const PURSE_MODEL = {
  /** Crowns in each place's strongbox, by beat. The Mill pays again when retaken; the last is the Watch-house. */
  strongbox: { first_lantern: 35, forge_freed: 80, mill_retaken: 0, facing_stane: 70, valley_complete: 160 } as Record<Beat, number>,
  /** Crowns from selling what one beaten enemy carried. Sparing them leaves most of it with them. */
  lootPerEnemy: 3,
  /** The tax cart's strongbox, for those who stop it. */
  taxCart: 40,
  /** Arrows, food, and tending companions: crowns per day for someone who makes nothing themselves. */
  upkeepPerDay: 7,
  /** A maker sells surplus instead: crowns per day at full thoroughness in gathering and crafting. */
  craftIncomePerDay: 5,
  /** The smith's upgrades, bought once the Forge is free: crowns per stretch after it. */
  smithPerStretch: 45,
  /** The share of spare crowns a player puts into Wick each stretch, at full thoroughness. */
  rebuildShare: 0.8,
  /** Crowns always kept back for arrows and food before anything is spent on Wick. */
  reserve: 30,
} as const;

export interface PurseSnapshot {
  beat: Beat;
  style: string;
  /** Carried and stored together. */
  crowns: number;
  earned: number;
  spent: number;
  projectsBuilt: string[];
}

function makes(style: Style): number {
  const day = style.perDay;
  return Math.min(1, ((day.arrows_made ?? 0) + (day.meal_cooked ?? 0) + (day.forage ?? 0)) / 9);
}

/** Follow one style's crowns through the valley. */
export function purseThrough(style: Style, stretches: readonly Stretch[] = STRETCHES, m = PURSE_MODEL): PurseSnapshot[] {
  let crowns = 0;
  let freed = 0;
  let earned = 0;
  let spent = 0;
  const built: string[] = [];
  const out: PurseSnapshot[] = [];
  const pay = (amount: number) => { const paid = Math.min(crowns, Math.round(amount)); crowns -= paid; spent += paid; return paid; };
  const gain = (amount: number) => { crowns += Math.round(amount); earned += Math.round(amount); };

  stretches.forEach((s, i) => {
    const enemies = s.enemies + s.optionalEnemies * style.thoroughness;
    gain(enemies * m.lootPerEnemy);
    gain(m.strongbox[s.beat]);
    if (i >= 1 && i <= 3 && style.thoroughness >= 0.5) gain(m.taxCart);
    // Daily income from freed places, taxed until the Watch-house falls. The Mill is dark for the fourth stretch.
    const paying = s.beat === 'facing_stane' ? Math.max(0, freed - 1) : freed;
    const taxed = s.beat !== 'valley_complete';
    gain(paying * s.days * ECONOMY_TUNING.incomePerFreedPlace * (taxed ? ECONOMY_TUNING.taxIncome : 1));
    gain(makes(style) * m.craftIncomePerDay * s.days);
    freed += s.placesFreed;

    pay((1 - makes(style)) * m.upkeepPerDay * s.days);
    if (i >= 2) pay(m.smithPerStretch);
    // Whatever is spare, less a reserve, goes into Wick, cheapest available project first.
    let budget = Math.max(0, crowns - m.reserve) * m.rebuildShare * style.thoroughness;
    for (;;) {
      const next = PROJECTS.filter(p => !built.includes(p.id) && (p.needs ?? []).every(n => built.includes(n))).sort((a, b) => a.cost - b.cost)[0];
      if (!next || next.cost > budget) break;
      budget -= next.cost;
      pay(next.cost);
      built.push(next.id);
    }
    out.push({ beat: s.beat, style: style.name, crowns, earned, spent, projectsBuilt: [...built] });
  });
  return out;
}

export const purseFor = (name: string) => purseThrough(STYLES[name]);
