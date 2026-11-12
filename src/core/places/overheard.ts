// Overheard lines (GAME_DESIGN.md section 5; docs/writing/bandits.md). Which exchange, if any, is staged now.
// "Heard only while the hero is close and unnoticed. Each exchange is said once per visit, at the time of day given,
// by the people named. If one of the speakers is gone, skip it."
import type { OverheardDef } from '../../data/overheard';
import { OVERHEARD } from '../../data/overheard';
import { ROUTINE_CLOCK as c, during } from './schedules';

const WHEN: Readonly<Record<string, [number, number] | null>> = {
  any: null,
  morning: [c.dawn, c.midday],
  dawn: [c.dawn, c.work],
  before_dawn: [c.beforeDawn, c.dawn],
  midday: [c.midday, c.mealEnd],
  afternoon: [14, 16],
  dusk: [c.dusk, c.evening],
  evening: [c.evening, c.night],
  night: [c.night, c.dawn],
  midnight: [0, 2],
  always: null,
  guard_change: null,
};

export interface Listening {
  place: OverheardDef['place'];
  /** True at the Mill once it has been retaken. */
  retaken?: boolean;
  hour: number;
  /** Ids of those who are present, awake, and unaware of the hero. Include 'stane' when he is. */
  present: readonly string[];
  /** Line ids already said on this visit. Cleared when the hero leaves the place. */
  saidThisVisit: readonly string[];
  /** The hero is close enough to hear and nobody has noticed them. */
  heroCloseAndUnnoticed: boolean;
}

/** Every exchange that could be staged now, in the order written. */
export function candidates(l: Listening, lines: readonly OverheardDef[] = OVERHEARD): OverheardDef[] {
  if (!l.heroCloseAndUnnoticed) return [];
  return lines.filter(line => {
    if (line.place !== l.place) return false;
    if ((line.garrison === 'retaken') !== (l.retaken === true) && line.place === 'mill') return false;
    if (l.saidThisVisit.includes(line.id)) return false;
    if (!line.speakers.every(s => l.present.includes(s))) return false;
    const span = WHEN[line.when];
    return !span || during(l.hour, span[0], span[1]);
  });
}

/**
 * The exchange to stage, or null. Tells and information come before story, so a player who listens briefly still
 * learns what they can use. The answers of "the valley learns" are staged separately and come before all of these.
 */
export function nextOverheard(l: Listening, lines: readonly OverheardDef[] = OVERHEARD): OverheardDef | null {
  const rank = { tell: 0, information: 1, story: 2 } as const;
  return [...candidates(l, lines)].sort((a, b) => rank[a.kind] - rank[b.kind])[0] ?? null;
}
