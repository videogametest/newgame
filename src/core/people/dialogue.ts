import households from '../../../docs/writing/households.md?raw';
import companions from '../../../docs/writing/companions.md?raw';
import hesper from '../../../docs/writing/hesper.md?raw';
import stane from '../../../docs/writing/stane.md?raw';
import bram from '../../../docs/writing/bram.md?raw';
import screen from '../../../docs/writing/interface.md?raw';
import { meetsTrigger, type PeopleWorld, type Trigger } from './households';
import { bondStage, type CompanionState } from './companions';

/** Source documents are imported as data, never copied or rewritten. No IO at runtime. */
export const WRITING = { households, companions, hesper, stane, bram, interface: screen };
export type WritingSource = keyof typeof WRITING;
export interface SpokenLine { text: string; speaker?: string; label?: string }
export interface DialogueRef { source: WritingSource; group: string }
export type SpeechForm = 'above-head' | 'conversation' | 'campfire';
// Explicit speaker prefixes used in these source files. Other prefixes are conditions, not speakers.
const SPEAKER_PREFIXES = new Set([
  'Ansa', 'Corin', 'Bertram', 'Garrick', 'Hale', 'Tamsin', 'Orla', 'Ned', 'Joss', 'Merry',
  'Tobin', 'Oona', 'Bram', 'Hesper', 'Stane',
]);

/** Only explicitly quoted numbered/bulleted writing is speech; stage directions are not. */
function parseLine(line: string): SpokenLine | undefined {
  const match = line.match(/^(?:\d+\.|-)\s+(?:(.+?):\s+)?"(.*)"(?:\s+\(.*\))?$/);
  if (!match) return undefined;
  const prefix = match[1];
  return { text: match[2], ...(prefix ? { label: prefix } : {}),
    ...(SPEAKER_PREFIXES.has(prefix) ? { speaker: prefix } : {}) };
}

/** A section ends at its next ID or heading. Unknown IDs are quiet, not invented dialogue. */
export function writtenGroup(ref: DialogueRef): SpokenLine[] {
  const lines = WRITING[ref.source].split('\n');
  const start = lines.findIndex(line => line.startsWith(`\`${ref.group}\``));
  if (start < 0) return [];
  const result: SpokenLine[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('#') || line.startsWith('`')) break;
    const parsed = parseLine(line);
    if (parsed) result.push(parsed);
  }
  return result;
}

export interface DialogueRule {
  ref: DialogueRef;
  form: SpeechForm;
  when?: Trigger;
  minBond?: 1 | 2 | 3;
  /** Household meetings repeat the last; "one of" and shoulder failures cycle without repeats. */
  mode: 'ordered' | 'cycle' | 'once';
}
export type DialogueHistory = Readonly<Record<string, number>>;
export function selectDialogue(rules: readonly DialogueRule[], world: PeopleWorld,
  history: DialogueHistory = {}, companion?: CompanionState) {
  for (const rule of rules) {
    if (rule.when && !meetsTrigger(rule.when, world)) continue;
    if (rule.minBond && (!companion || bondStage(companion) < rule.minBond)) continue;
    const key = `${rule.ref.source}:${rule.ref.group}`;
    const lines = writtenGroup(rule.ref);
    const visits = history[key] ?? 0;
    if (!lines.length || (rule.mode === 'once' && visits >= lines.length)) continue;
    const index = rule.mode === 'cycle' ? visits % lines.length : Math.min(visits, lines.length - 1);
    return { line: lines[index], ref: rule.ref, form: rule.form, history: { ...history, [key]: visits + 1 } };
  }
  return undefined;
}

export interface ShowItem {
  id: string;
  kind: 'fragment' | 'stolen-good' | 'unique-item';
  /** Source label from the written character's Show group, not an invented response. */
  responses?: Partial<Record<'hesper' | 'stane', string>>;
}
export function showOptions(items: readonly ShowItem[], foundIds: readonly string[]): ShowItem[] {
  return items.filter(item => foundIds.includes(item.id))
    .filter((item, i, found) => found.findIndex(other => other.id === item.id) === i);
}

/** Match a Show response by its exact source label; default to the author's "Anything else". */
export function showResponse(character: 'hesper' | 'stane', item: ShowItem,
  foundIds: readonly string[]): SpokenLine | undefined {
  if (!foundIds.includes(item.id)) return undefined;
  const lines = writtenGroup({ source: character, group: `${character}.show` });
  return lines.find(line => line.label === item.responses?.[character])
    ?? lines.find(line => line.label === 'Anything else');
}

/** Lighter households have no group IDs in the writing; reference their heading and phase. */
export function householdLine(householdName: string, phase: 'Return' | 'Settled' | 'Festival'): SpokenLine | undefined {
  const section = households.split(/^## /m).find(s => s.split('\n')[0].endsWith(householdName));
  return section?.split('\n').map(parseLine).find(line => line?.label === phase);
}
