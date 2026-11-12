// Pacing targets from GAME_DESIGN.md section 6. Growth must track the story.
// These bands are checked against a full playthrough by the pacing test in task 006.

import { perksEarned, slotCount } from './perks';
import { mainSkillLevels } from './skills';
import type { ProgressionState } from './types';

export type Beat = 'first_lantern' | 'forge_freed' | 'mill_retaken' | 'facing_stane' | 'valley_complete';

export interface Band {
  /** Level of the skill the player uses most. The second most used may sit up to SECOND_SKILL_SLACK below the band. */
  mainSkills: [number, number];
  perks: [number, number];
  slots: [number, number];
}

export const PACING_BANDS: Record<Beat, Band> = {
  first_lantern: { mainSkills: [4, 7], perks: [3, 5], slots: [3, 3] },
  forge_freed: { mainSkills: [8, 12], perks: [7, 12], slots: [3, 5] },
  mill_retaken: { mainSkills: [13, 16], perks: [11, 17], slots: [5, 5] },
  facing_stane: { mainSkills: [18, 20], perks: [16, 22], slots: [5, 7] },
  valley_complete: { mainSkills: [20, 20], perks: [20, 24], slots: [7, 7] },
};

/** A player who spreads effort over many skills has a lower second skill. This many levels below the band is still on pace. */
export const SECOND_SKILL_SLACK = 2;

/** The beats before which no main skill may sit at the region cap. */
export const NO_CAP_BEFORE: Beat = 'mill_retaken';

function inside(value: number, [lo, hi]: [number, number]): boolean {
  return value >= lo && value <= hi;
}

/** Problems with the hero's growth at a story beat. Empty when it is on pace. */
export function checkPacing(beat: Beat, state: ProgressionState): string[] {
  const band = PACING_BANDS[beat];
  const problems: string[] = [];
  const [first, second] = mainSkillLevels(state);
  if (!inside(first, band.mainSkills) || !inside(second, [band.mainSkills[0] - SECOND_SKILL_SLACK, band.mainSkills[1]])) {
    problems.push(`${beat}: main skills at ${first} and ${second}, wanted ${band.mainSkills[0]} to ${band.mainSkills[1]}`);
  }
  const perks = perksEarned(state);
  if (!inside(perks, band.perks)) problems.push(`${beat}: ${perks} perks, wanted ${band.perks[0]} to ${band.perks[1]}`);
  const slots = slotCount(state);
  if (!inside(slots, band.slots)) problems.push(`${beat}: ${slots} slots, wanted ${band.slots[0]} to ${band.slots[1]}`);
  if ((beat === 'first_lantern' || beat === 'forge_freed') && first >= state.regionCap) {
    problems.push(`${beat}: a main skill is already at the region cap`);
  }
  return problems;
}
