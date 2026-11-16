// Versioned JSON boundary. Never trust localStorage as typed state. Pure, no browser/engine imports.
import { migrateSave, newGameState } from '../state';
import { SAVE_VERSION, SKILL_IDS, type GameState } from '../types';
import { STORY_IDS } from '../stories/stories';

type Check = (value: unknown) => boolean;
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num: Check = v => typeof v === 'number' && Number.isFinite(v);
const nonnegative: Check = v => num(v) && (v as number) >= 0;
const integer: Check = v => Number.isSafeInteger(v) && (v as number) >= 0;
const positive: Check = v => num(v) && (v as number) > 0;
const str: Check = v => typeof v === 'string';
const bool: Check = v => typeof v === 'boolean';
const one = (...values: unknown[]): Check => v => values.includes(v);
const optional = (check: Check): Check => v => v === undefined || check(v);
const nullable = (check: Check): Check => v => v === null || check(v);
const array = (check: Check): Check => v => Array.isArray(v) && v.every(check);
const record = (check: Check): Check => v => obj(v) && Object.values(v).every(check);
const shape = (checks: Record<string, Check>): Check => v => obj(v) && Object.entries(checks).every(([k, check]) => check(v[k]));
const strings = array(str);
const rank = one('apprentice', 'scout', 'warden');
const bandit = one('alive', 'dead', 'knocked_out', 'spared', 'stayed', 'left', 'returned_to_stane');
const arrow = one('standard', 'fire', 'blunt', 'whistling');
const stack = shape({ itemId: str, count: positive, quality: optional(one('common', 'fine', 'masterwork')), marks: optional(strings) });
const skill = shape({ level: positive, xp: nonnegative });
const checks: Record<keyof GameState, Check> = {
  version: one(SAVE_VERSION), seed: integer, timeOfDay: v => nonnegative(v) && (v as number) < 24, day: v => integer(v) && (v as number) >= 1,
  hero: v => shape({ position: shape({ x: num, z: num }), hp: nonnegative, maxHp: positive, regionId: str })(v)
    && (v as GameState['hero']).hp <= (v as GameState['hero']).maxHp,
  progression: shape({ skills: shape(Object.fromEntries(SKILL_IDS.map(k => [k, skill]))), rank, regionCap: positive,
    perks: record(shape({ rank: one(1, 2, 3), mastery: nonnegative, via: one('primary', 'fallback') })), equipped: strings,
    sets: array(shape({ name: str, perks: strings })), repeats: record(integer), overflowBank: shape(Object.fromEntries(SKILL_IDS.map(k => [k, nonnegative]))) }),
  inventory: shape({ carried: array(stack), stored: array(stack), unseen: strings, soldStolen: strings, recipes: strings }),
  purse: shape({ carried: integer, stored: integer }), incomePaidThrough: integer, gatheredOn: record(integer), lastCartStopped: bool,
  quiver: shape({ capacity: integer, arrows: shape({ standard: integer, fire: integer, blunt: integer, whistling: integer }) }),
  arrowsInWorld: array(shape({ id: str, type: arrow, location: one('ground', 'scenery', 'enemy'), landedAt: nonnegative, broken: bool, pickedUp: bool })),
  company: array(shape({ id: one('bram', 'tamsin', 'tobin_pike', 'oona', 'garrick', 'bracken', 'ketch'), level: positive,
    wounded: bool, joined: bool, travelling: bool, bond: nonnegative, wishFulfilled: bool })),
  places: array(shape({ id: str, status: one('held', 'cleared', 'freed'), timesFreed: integer, bellSilenced: bool,
    morale: v => nonnegative(v) && (v as number) <= 1, freedDay: optional(integer) })),
  households: array(shape({ id: str, home: bool, homeSince: optional(integer) })), bandits: record(bandit),
  heardLines: strings, takings: array(shape({ placeId: str, defendersBeaten: integer, headShots: integer,
    beatenAtNight: integer, quietRemovals: integer, bellStopped: bool, beatenByFire: integer })),
  stories: shape(Object.fromEntries(STORY_IDS.map(k => [k, shape({ stage: str, since: integer, choice: optional(str), short: optional(bool) })]))),
  lastThread: nullable(str), notes: array(shape({ lineId: str, kind: one('overheard', 'said', 'thread', 'trace', 'yield'), speakers: strings, place: str, day: integer })),
  speech: shape({ lines: record(nonnegative), speakers: record(nonnegative), last: nullable(nonnegative) }),
  watch: shape({ won: integer, lastDay: nullable(integer), tonight: nullable(str) }),
  tutorial: shape({ step: one('road', 'door', 'yard', 'fence', 'post', 'lantern', 'done'), opened: bool, used: shape({ move: bool, look: bool, sprint: bool }),
    walked: nonnegative, choice: one(null, 'show', 'skip'),
    yard: shape({ phase: one('intro', 'targets', 'far', 'arrows', 'done'), struck: strings, misses: integer, arrow: one('standard', 'blunt') }),
    fence: shape({ phase: one('intro', 'cross', 'mark', 'done'), seen: integer, restart: bool, notice: nonnegative, clock: nonnegative, markHeld: nonnegative }),
    post: shape({ phase: one('intro', 'blade', 'dodge', 'lock', 'done'), strikes: integer, dodged: integer, hits: integer }),
    lantern: shape({ phase: one('intro', 'light', 'lit', 'done') }), away: bool, backs: integer }),
  openedChests: strings, discoveredPlaces: strings, fragmentsFound: strings, lostPeople: strings, trialsPassed: strings,
  stolenGoodsReturned: strings, projectsBuilt: strings, campfiresFound: strings, storyMoments: strings, boundBandits: strings, lessonsTaken: strings,
};

/** Full current shape plus essential identities. Unknown top-level fields (including settings) are discarded. */
export function checkedState(raw: unknown): GameState | null {
  if (!shape(checks)(raw)) return null;
  const state = raw as GameState;
  for (const id of ['mill', 'forge', 'watch_house']) if (state.places.filter(p => p.id === id).length !== 1) return null;
  if (new Set(state.places.map(p => p.id)).size !== state.places.length) return null;
  if (!state.households.some(h => h.id === 'hesper')) return null;
  return Object.fromEntries(Object.keys(checks).map(k => [k, (raw as Record<string, unknown>)[k]])) as unknown as GameState;
}

export type SaveRead = { state: GameState; status: 'loaded' | 'new' | 'damaged' | 'unavailable' };
export function decodeSave(text: string | null, seed: number): SaveRead {
  if (text === null) return { state: newGameState(seed), status: 'new' };
  try {
    const raw: unknown = JSON.parse(text);
    // A current save must be complete. Earlier versions use the existing migration defaults.
    if (!obj(raw) || !Number.isSafeInteger(raw.version) || (raw.version as number) < 1 || (raw.version as number) > SAVE_VERSION)
      return { state: newGameState(seed), status: 'damaged' };
    const candidate = raw.version === SAVE_VERSION ? raw : migrateSave(raw);
    const state = checkedState(candidate);
    if (state) return { state, status: 'loaded' };
  } catch { /* malformed JSON or invalid older state: recover as a whole, never half-load */ }
  return { state: newGameState(seed), status: 'damaged' };
}
export function encodeSave(state: GameState): string {
  const checked = checkedState(state);
  if (!checked) throw new Error('Invalid game state; previous save kept');
  return JSON.stringify(checked);
}
