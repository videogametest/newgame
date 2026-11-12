// Nobody says the same thing twice in a row, or talks too much (GAME_DESIGN.md section 10, "How people speak").
// Claude's. Pure: decides which line of a group is said next and whether anything should be said at all. The log is
// saved, so a line heard yesterday is not the first one heard today.

export const SPEECH_TUNING = {
  /** Game hours before the same speaker says another line above their head, outside a fight. One game hour is 50 seconds. */
  speakerGapHours: 2, // untuned placeholder
  /** Game hours of quiet after anyone in the company speaks, so lines never stack. */
  companyGapHours: 0.5, // untuned placeholder
  /** Game hours before a line already said may be said again, once every other line in its group has been. */
  repeatGapHours: 24, // untuned placeholder
} as const;

export interface SpeechLog {
  /** Line key (`group#index`) to the game hour it was last said. */
  lines: Record<string, number>;
  /** Speaker id to the game hour they last spoke. */
  speakers: Record<string, number>;
  /** The game hour anyone last spoke. */
  last: number | null;
}
export const emptySpeechLog = (): SpeechLog => ({ lines: {}, speakers: {}, last: null });

/** The clock speech runs on: whole game hours since the start. */
export const gameHour = (day: number, timeOfDay: number): number => (day - 1) * 24 + timeOfDay;

export interface SpeechRequest {
  speaker: string;
  /** The group id from the writing, such as `tamsin.field`. */
  group: string;
  /** How many lines the group has. */
  count: number;
  now: number;
  /** Shouts in a fight and answers to something the hero just did ignore the quiet gaps, never the no-repeat rule. */
  urgent?: boolean;
}

/**
 * Which line to say, or null to stay quiet. Lines never said come first, in the order written. After that, the one
 * said longest ago, and only if it has rested a full day: a group that has run out goes quiet instead of repeating.
 */
export function nextLine(log: SpeechLog, r: SpeechRequest, t = SPEECH_TUNING): { index: number; log: SpeechLog } | null {
  if (r.count <= 0) return null;
  if (!r.urgent) {
    const spoke = log.speakers[r.speaker];
    if (spoke !== undefined && r.now - spoke < t.speakerGapHours) return null;
    if (log.last !== null && r.now - log.last < t.companyGapHours) return null;
  }
  let index = -1;
  let oldest = Infinity;
  for (let i = 0; i < r.count; i++) {
    const at = log.lines[`${r.group}#${i}`];
    if (at === undefined) { index = i; oldest = -Infinity; break; }
    if (at < oldest) { oldest = at; index = i; }
  }
  if (oldest !== -Infinity && r.now - oldest < t.repeatGapHours) return null;
  return {
    index,
    log: { lines: { ...log.lines, [`${r.group}#${index}`]: r.now }, speakers: { ...log.speakers, [r.speaker]: r.now }, last: r.now },
  };
}
