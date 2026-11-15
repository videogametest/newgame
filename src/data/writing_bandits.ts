// Reads docs/writing/bandits.md as the source of truth for Stane's men: the rosters, the overheard lines, what a
// yielding bandit says, the valley learns, and the table of who stays. Nothing here is typed by hand; the parse is
// the only copy of the words the game uses. The writing is changed first, and the data (bandits.ts, overheard.ts,
// places.ts) is checked against it by src/data/writing_bandits.test.ts.
import bandits from '../../docs/writing/bandits.md?raw';
import type { Loyalty, PlaceId, UnitType } from './bandits';

export const BANDITS_WRITING: string = bandits;

export type WrittenKind = 'information' | 'story' | 'tell';
export type WrittenPlace = PlaceId | 'tax_cart';

export interface WrittenBandit {
  id: string;
  name: string;
  place: PlaceId;
  garrison: 'first' | 'retaken';
  leader: boolean;
  unit: UnitType;
  loyalty: Loyalty;
  /** The writing's "Was" column. */
  was: string;
  /** The writing's "Habit" column, exactly. */
  habit: string;
}

export interface WrittenLine {
  /** Text before the colon as written: a name, a placeholder such as `{A}`, or null for an unattributed line. */
  label: string | null;
  /** The id this line is spoken by, a `{A}`/`{B}` placeholder, or null. */
  speaker: string | null;
  text: string;
}

export interface WrittenOverheard {
  id: string;
  place: WrittenPlace | null;
  garrison: 'first' | 'retaken';
  kind: WrittenKind;
  /** Normalised: 'any', 'before_dawn', or the writing's own time word. Null for the valley learns. */
  when: string | null;
  /** For the valley learns only: the trigger in the writing's brackets. */
  trigger: string | null;
  /** Unique speakers in order of first speaking. */
  speakers: string[];
  /** Who the header says is there, after the colon. May include someone who never speaks. Empty for the valley learns. */
  participants: string[];
  lines: WrittenLine[];
}

export interface WrittenYield {
  id: string;
  place: WrittenPlace;
  garrison: 'first' | 'retaken';
  /** The overheard id this stands for. */
  sameAs: string;
  /** The bandit this is not said by, if the writing says so. */
  notSaidBy: string | null;
  lines: WrittenLine[];
}

export interface WrittenStay {
  who: string;
  takesUp: string;
  says: string;
}

const TITLES = new Set(['Sergeant', 'Lieutenant', 'Captain']);
const UNITS: Readonly<Record<string, UnitType>> = {
  Soldier: 'soldier', Archer: 'archer', Brute: 'brute', 'Shield-bearer': 'shield_bearer', Runner: 'runner',
};
const LOYALTIES: Readonly<Record<string, Loyalty>> = { High: 'high', Middling: 'middling', Low: 'low' };
const ROSTER_HEADINGS: Readonly<Record<string, { place: PlaceId; garrison: 'first' | 'retaken' }>> = {
  'The Mill': { place: 'mill', garrison: 'first' },
  'The Mill, retaken': { place: 'mill', garrison: 'retaken' },
  'The Forge': { place: 'forge', garrison: 'first' },
  'The Watch-house': { place: 'watch_house', garrison: 'first' },
};
const TIME_WORDS = ['any time', 'on the road', 'before dawn', 'midday', 'morning', 'dusk', 'evening', 'night watch', 'night'];
const SEGMENT_PLACE: Readonly<Record<string, WrittenPlace>> = { mill: 'mill', forge: 'forge', watch: 'watch_house', cart: 'tax_cart' };

interface Section { heading: string; lines: string[] }

function sections(md: string): Section[] {
  const out: Section[] = [{ heading: '', lines: [] }];
  for (const line of md.split('\n')) {
    const h = line.match(/^#{2,3} (.*)$/);
    if (h) out.push({ heading: h[1].trim(), lines: [] });
    else out[out.length - 1].lines.push(line);
  }
  return out;
}

/** Splits a markdown table row into trimmed cells. */
export function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

/** The name without bold, the "(leader)" marker or the title, as the roster's name. */
export function plainName(cell: string): string {
  return cell.replace(/\*\*/g, '').replace(/\(leader\)/, '').trim();
}

export function nameTokens(name: string): string[] {
  return name.split(/\s+/).filter(t => !TITLES.has(t));
}

/** Data ids are the name in lower case with underscores, without the title. Stane is the exception, see resolveSpeaker. */
export function idOf(name: string): string {
  return nameTokens(name).join('_').toLowerCase();
}

export function parseRoster(md: string = BANDITS_WRITING): WrittenBandit[] {
  const out: WrittenBandit[] = [];
  for (const sec of sections(md)) {
    const where = ROSTER_HEADINGS[sec.heading];
    if (!where) continue;
    for (const line of sec.lines) {
      if (!line.startsWith('|')) continue;
      const cells = splitRow(line);
      if (cells.length !== 5) continue;
      const [nameCell, type, loyalty, was, habit] = cells;
      if (!(type in UNITS)) continue; // header, separator, and Captain Stane ("See section 9")
      const name = plainName(nameCell);
      out.push({
        id: idOf(name), name, place: where.place, garrison: where.garrison,
        leader: /\(leader\)/.test(nameCell), unit: UNITS[type], loyalty: LOYALTIES[loyalty], was, habit,
      });
    }
  }
  return out;
}

export const ROSTER: readonly WrittenBandit[] = parseRoster();

/**
 * Resolves a speaker label as written to a data id. A label is a first or last name from the roster. Captain Edric
 * Stane is not on the roster (section 9); his id is `stane`. `{A}` and `{B}` stay placeholders. Throws on an
 * unknown or ambiguous label, so the test fails loudly rather than guessing.
 */
export function resolveSpeaker(label: string, roster: readonly WrittenBandit[] = ROSTER): string {
  if (label.startsWith('{')) return label;
  if (label === 'Stane') return 'stane';
  const hits = roster.filter(r => nameTokens(r.name).includes(label));
  if (hits.length !== 1) throw new Error(`Cannot resolve speaker "${label}" to one bandit (${hits.length} matches)`);
  return hits[0].id;
}

/** Parses one written line: `Name: "text"`, `Name, to the fire: "text"`, `{A}: "text"`, or an unattributed `"text"`. */
export function parseLine(body: string, roster: readonly WrittenBandit[] = ROSTER): WrittenLine {
  const m = body.match(/^(.*?): "(.*)"$/);
  if (m && !body.startsWith('"')) {
    const label = m[1].trim();
    const who = label.split(',')[0].trim();
    return { label, speaker: resolveSpeaker(who, roster), text: m[2] };
  }
  const plain = body.match(/^"(.*)"$/);
  if (!plain) throw new Error(`Not a quoted line: ${body}`);
  return { label: null, speaker: null, text: plain[1] };
}

export function normaliseWhen(raw: string): string {
  if (raw === 'any time' || raw === 'on the road') return 'any';
  if (raw === 'before dawn') return 'before_dawn';
  if (raw === 'night watch') return 'night';
  return raw;
}

/** The time word in a header such as "midday, at the fire: Harl, Bran" or "on the road: Hew, Gant". */
export function parseWhen(headerInside: string): string {
  const before = headerInside.split(':')[0];
  const piece = before.split(',').map(p => p.trim()).find(p => TIME_WORDS.includes(p));
  if (!piece) throw new Error(`No time word in "${headerInside}"`);
  return normaliseWhen(piece);
}

/** The numbered lines that follow a header, up to the first line that is neither numbered nor blank. */
function linesAfter(lines: string[], start: number): { body: string[]; next: number } {
  const body: string[] = [];
  let i = start;
  while (i < lines.length && lines[i].trim() === '') i++;
  while (i < lines.length) {
    const m = lines[i].match(/^\d+\. (.*)$/);
    if (!m) break;
    body.push(m[1]);
    i++;
  }
  return { body, next: i };
}

export function parseOverheard(md: string = BANDITS_WRITING, roster: readonly WrittenBandit[] = ROSTER): WrittenOverheard[] {
  const out: WrittenOverheard[] = [];
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^`(overheard\.[^`]+)` — (information|story|a tell) \((.*?)\)/);
    if (!h) continue;
    const [, id, kindWord, inside] = h;
    const kind: WrittenKind = kindWord === 'a tell' ? 'tell' : (kindWord as WrittenKind);
    const { body, next } = linesAfter(lines, i + 1);
    i = next - 1;
    const parsed = body.map(b => parseLine(b, roster));
    const speakers = [...new Set(parsed.map(l => l.speaker).filter((s): s is string => !!s))];
    const seg = id.split('.')[1];
    const isLearn = seg === 'learns';
    out.push({
      id,
      place: isLearn ? null : (SEGMENT_PLACE[seg] ?? null),
      garrison: id.includes('retaken') ? 'retaken' : 'first',
      kind,
      when: isLearn ? null : parseWhen(inside),
      trigger: isLearn ? inside : null,
      speakers,
      participants: isLearn ? [] : parseParticipants(inside, roster),
      lines: parsed,
    });
  }
  return out;
}

/** The names after the colon in a header: "night watch: Harl, Nessa" gives Harl and Nessa. "alone" is not a name. */
export function parseParticipants(headerInside: string, roster: readonly WrittenBandit[] = ROSTER): string[] {
  const after = headerInside.split(':').slice(1).join(':');
  return after.split(',').map(p => p.trim()).filter(p => p && p !== 'alone').map(p => resolveSpeaker(p, roster));
}

export function parseYields(md: string = BANDITS_WRITING, roster: readonly WrittenBandit[] = ROSTER): WrittenYield[] {
  const out: WrittenYield[] = [];
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^`(yield\.[^`]+)` \(stands for `([^`]+)`(?:; not said by (\w+))?\)/);
    if (!h) continue;
    const [, id, sameAs, notBy] = h;
    const { body, next } = linesAfter(lines, i + 1);
    i = next - 1;
    const seg = id.split('.')[1];
    out.push({
      id,
      place: SEGMENT_PLACE[seg],
      garrison: id.includes('retaken') ? 'retaken' : 'first',
      sameAs,
      notSaidBy: notBy ? resolveSpeaker(notBy, roster) : null,
      lines: body.map(b => parseLine(b, roster)),
    });
  }
  return out;
}

export function parseStay(md: string = BANDITS_WRITING): WrittenStay[] {
  const sec = sections(md).find(s => s.heading === 'If they stay');
  if (!sec) throw new Error('No "If they stay" section');
  const rows: WrittenStay[] = [];
  for (const line of sec.lines) {
    if (!line.startsWith('|')) continue;
    const cells = splitRow(line);
    if (cells.length !== 3 || cells[0] === 'Who' || cells[0].startsWith('---')) continue;
    rows.push({ who: plainName(cells[0]), takesUp: cells[1], says: cells[2].replace(/^"|"$/g, '') });
  }
  return rows;
}

export const OVERHEARD_WRITING: readonly WrittenOverheard[] = parseOverheard();
export const YIELDS_WRITING: readonly WrittenYield[] = parseYields();
export const STAY_WRITING: readonly WrittenStay[] = parseStay();

/** The written line for an overheard or learns id, by id, for whatever plays it. */
export function writtenOverheard(id: string): WrittenOverheard {
  const found = OVERHEARD_WRITING.find(x => x.id === id);
  if (!found) throw new Error(`No written overheard line ${id}`);
  return found;
}
