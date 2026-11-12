// The valley learns (GAME_DESIGN.md section 5). Claude's. Pure logic, shipped dark until task 005.
// Held places prepare for the way the hero actually plays. Answers follow the hero's own counts, never the story,
// and a player who varies their approach draws none.

export type Habit = 'head_shots' | 'night' | 'quiet_removals' | 'bell' | 'fire';

/** What the hero did in taking one place. Recorded once, when its lantern is lit. Part of the save. */
export interface Taking {
  placeId: string;
  /** Defenders killed, knocked out, or made to surrender or run. */
  defendersBeaten: number;
  /** Of those, how many fell to an arrow in the head. */
  headShots: number;
  /** How many were beaten between dusk and dawn. */
  beatenAtNight: number;
  /** How many were knocked out or killed while unaware and out of sight of any other defender. */
  quietRemovals: number;
  /** The bell was silenced beforehand, or its runner was stopped. */
  bellStopped: boolean;
  /** How many were beaten by fire, or while fire was spreading. */
  beatenByFire: number;
}

export interface Answer {
  habit: Habit;
  /** What changes at places still held. Read by the system named. */
  effect: { system: 'combat' | 'places' | 'world'; key: string; amount: number };
  /** The overheard exchange that announces it (docs/writing/bandits.md). */
  line: string;
  /** What the player sees from a ridge. */
  seen: string;
  /** The way round, so no answer is a wall. Checked by a test to be something the answer does not cover. */
  wayRound: Habit[];
}

/** Amounts are untuned placeholders. */
export const ANSWERS: Readonly<Record<Habit, Answer>> = {
  head_shots: {
    habit: 'head_shots', effect: { system: 'combat', key: 'helmets', amount: 0.7 }, line: 'overheard.learns.helmets',
    seen: 'Most defenders wear helmets.', wayRound: ['quiet_removals', 'night', 'fire'],
  },
  night: {
    habit: 'night', effect: { system: 'places', key: 'night_watch', amount: 2 }, line: 'overheard.learns.night',
    seen: 'Twice the torches and a doubled watch after dusk.', wayRound: ['head_shots', 'quiet_removals', 'fire'],
  },
  quiet_removals: {
    habit: 'quiet_removals', effect: { system: 'places', key: 'walk_in_pairs', amount: 1 }, line: 'overheard.learns.pairs',
    seen: 'Nobody walks alone.', wayRound: ['head_shots', 'night', 'fire', 'bell'],
  },
  bell: {
    habit: 'bell', effect: { system: 'places', key: 'second_runner', amount: 1 }, line: 'overheard.learns.bell',
    seen: 'Two defenders stay near the bell.', wayRound: ['head_shots', 'night', 'quiet_removals', 'fire'],
  },
  fire: {
    habit: 'fire', effect: { system: 'world', key: 'grass_cut_and_buckets', amount: 1 }, line: 'overheard.learns.fire',
    seen: 'The grass is cut back to the fence and there are buckets by the doors.', wayRound: ['head_shots', 'night', 'quiet_removals'],
  },
};

/** Untuned placeholders. */
export const LEARNS_TUNING = {
  /** The share of beaten defenders at which a way of playing counts as leaned on. */
  leanAt: { head_shots: 0.5, night: 0.7, quiet_removals: 0.5, fire: 0.4 },
  /** Stopping the bell is ordinary good play, so it is answered only when nothing else stands out. */
  bellLean: 1,
  /** Never more than this many answers in force in one region. */
  maxAnswers: 2,
} as const;

/**
 * How hard the hero has leaned on each way of playing across every place taken so far. 1 is the point at which it
 * counts as a habit; higher is heavier. A habit must hold across the places taken, so one unusual night is diluted.
 */
export function leanings(takings: readonly Taking[], t = LEARNS_TUNING): Record<Habit, number> {
  const beaten = takings.reduce((n, x) => n + Math.max(0, x.defendersBeaten), 0);
  const share = (pick: (x: Taking) => number) => (beaten === 0 ? 0 : takings.reduce((n, x) => n + Math.max(0, pick(x)), 0) / beaten);
  const everyBell = takings.length > 0 && takings.every(x => x.bellStopped);
  return {
    head_shots: share(x => x.headShots) / t.leanAt.head_shots,
    night: share(x => x.beatenAtNight) / t.leanAt.night,
    quiet_removals: share(x => x.quietRemovals) / t.leanAt.quiet_removals,
    fire: share(x => x.beatenByFire) / t.leanAt.fire,
    bell: everyBell ? t.bellLean : 0,
  };
}

/** Order for breaking exact ties, so the result never depends on anything but the counts. */
const ORDER: readonly Habit[] = ['head_shots', 'quiet_removals', 'night', 'fire', 'bell'];

/**
 * The answers in force after the places taken so far, oldest first. One may be added per place taken: the heaviest
 * habit not already answered. Answers already given are never withdrawn, so the world stays consistent.
 * Call with the list of takings in the order they happened.
 */
export function answersInForce(takings: readonly Taking[], t = LEARNS_TUNING): Answer[] {
  const active: Habit[] = [];
  for (let n = 1; n <= takings.length && active.length < t.maxAnswers; n++) {
    const lean = leanings(takings.slice(0, n), t);
    const next = ORDER.filter(h => lean[h] >= 1 && !active.includes(h)).sort((a, b) => lean[b] - lean[a] || ORDER.indexOf(a) - ORDER.indexOf(b))[0];
    if (next) active.push(next);
  }
  return active.map(h => ANSWERS[h]);
}

/** The effect amounts a held place should apply, by key. Empty when the hero has no habits. */
export function effectsAt(takings: readonly Taking[], t = LEARNS_TUNING): Record<string, number> {
  return Object.fromEntries(answersInForce(takings, t).map(a => [a.effect.key, a.effect.amount]));
}

/** The overheard lines a held place should stage, each once, early in the hero's first visit after it took effect. */
export function linesToStage(takings: readonly Taking[], alreadyHeard: readonly string[], t = LEARNS_TUNING): string[] {
  return answersInForce(takings, t).map(a => a.line).filter(line => !alreadyHeard.includes(line));
}

/** Ways of playing that none of the answers in force is aimed at. There is always at least one. */
export function openApproaches(takings: readonly Taking[], t = LEARNS_TUNING): Habit[] {
  const answered = answersInForce(takings, t).map(a => a.habit);
  return ORDER.filter(h => !answered.includes(h));
}
