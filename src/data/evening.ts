// Item 25: the first evening's words, read from docs/writing by id. Nothing here is retyped.
import { WRITING, writtenGroup } from '../core/people/dialogue';
import { ACTIONS, defaultBindings, type Action, type Bindings, type Device } from '../core/settings/actions';
import { inputLabel, promptFor } from '../core/settings/labels';
import { writtenAnswers, conversationPages } from './talking';

const one = (group: string): string => {
  const line = writtenGroup({ source: 'evening', group })[0]?.text;
  if (!line) throw new Error(`Missing ${group} in first-evening.md`);
  return line;
};
export const EVENING_OPEN = one('evening.open');
export const EVENING_CHOICE = writtenAnswers({ source: 'evening', group: 'evening.choice' });
export const eveningSkipPages = () => conversationPages({ source: 'evening', group: 'evening.skip' }, 'hesper', 'Hesper');

/** The first-time prompt row from interface.md, by its "When" cell. */
function interfaceRow(when: string): string {
  const row = WRITING.interface.split('\n').find(l => l.startsWith(`| ${when} |`));
  const cell = row?.split('|')[2]?.trim();
  if (!cell) throw new Error(`Missing first-time prompt "${when}" in interface.md`);
  return cell;
}
/** interface.md writes default keys in backticks; turn each into the action whose default it is (a "{action}"). */
export function toActionTemplate(cell: string): string {
  const defaults = defaultBindings().keyboard;
  return cell.replace(/`([^`]+)`/g, (whole, key: string) => {
    const action = ACTIONS.find(a => defaults[a].some(i => { const l = inputLabel(i); return l === key || l.endsWith(` ${key}`); }));
    if (!action) throw new Error(`No default action for ${whole}`);
    return `{${action}}`;
  });
}
const sentences = (cell: string): string[] => cell.match(/[^.]+\./g)?.map(s => s.trim()) ?? [cell];
const [walk, look] = sentences(toActionTemplate(interfaceRow('The game begins')));
const sprint = toActionTemplate(interfaceRow('After a few seconds of walking'));
export const ROAD_PROMPTS = { move: walk, look, sprint } as const;

/** Filled from the player's actual bindings. Unbound actions are left out; a prompt with nothing bound is null. */
export function roadPrompt(kind: keyof typeof ROAD_PROMPTS, b: Bindings, device: Device): string | null {
  const template = ROAD_PROMPTS[kind];
  const names = [...template.matchAll(/\{(\w+)\}/g)].map(m => m[1] as Action);
  const labels = names.map(a => promptFor(b, a, device));
  if (names.length && labels.every(l => !l)) return null;
  let i = 0;
  return template.replace(/\{(\w+)\} ?/g, (_w, _a) => { const l = labels[i++]; return l ? `${l} ` : ''; })
    .replace(/\s+/g, ' ').trim();
}
