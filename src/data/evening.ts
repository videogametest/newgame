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
  return filledPrompt(ROAD_PROMPTS[kind], b, device);
}

// Item 26: the yard. Her lines by id (group and index into the written group), the prompts from interface.md.
export const YARD_MISS_COUNTS = { targets: lines('evening.targets.miss').length, far: lines('evening.far.miss').length };
function lines(group: string, source: 'evening' | 'hesper' = 'evening') {
  const l = writtenGroup({ source, group });
  if (!l.length) throw new Error(`Missing ${group} in docs/writing`);
  return l;
}
/** One written line as a conversation page, by group and index; the id is `<group>.<index>`. */
export function yardPage(group: string, index: number) {
  const source = group.startsWith('hesper.') ? 'hesper' : 'evening';
  const page = conversationPages({ source, group }, 'hesper', 'Hesper')[index];
  if (!page) throw new Error(`Missing ${group} line ${index}`);
  return page;
}
/** Her yard intro: hesper.apprentice as written, then the first ask. */
export const yardIntroPages = () => [...lines('hesper.apprentice', 'hesper').map((_, i) => yardPage('hesper.apprentice', i)), yardPage('evening.targets', 0)];
/** "First fight" row ("`1` for the blade, `2` for the bow."): its second half names the bow's key. */
const bowSentence = toActionTemplate(interfaceRow('First fight')).split(', ')[1];
/** "Scroll to change arrows." names no key in backticks: "Scroll" is the wheel, the default for the next arrow. */
const ARROW_ROW = interfaceRow('First special arrow picked up');
export const YARD_PROMPTS = {
  bow: bowSentence,
  draw: interfaceRow('First time the bow is drawn'),
  arrow: ARROW_ROW.replace(/^Scroll\b/, '{arrowNext}'),
} as const;
/**
 * Yard prompts, from the actual bindings. The arrow prompt keeps the written "Scroll" while the next-arrow action is
 * on the wheel; anything else names what is bound. "Hold to draw" names no input, so it is never wrong.
 */
export function yardPrompt(kind: keyof typeof YARD_PROMPTS, b: Bindings, device: Device): string | null {
  if (kind === 'arrow' && b[device].arrowNext[0]?.startsWith('Wheel:')) return ARROW_ROW;
  return filledPrompt(YARD_PROMPTS[kind], b, device);
}

function filledPrompt(template: string, b: Bindings, device: Device): string | null {
  const names = [...template.matchAll(/\{(\w+)\}/g)].map(m => m[1] as Action);
  const labels = names.map(a => promptFor(b, a, device));
  if (names.length && labels.every(l => !l)) return null;
  let i = 0;
  return template.replace(/\{(\w+)\} ?/g, (_w, _a) => { const l = labels[i++]; return l ? `${l} ` : ''; })
    .replace(/\s+/g, ' ').trim();
}

// Item 27: steps 4 to 6, and walking away and back. Her lines by id through yardPage (any evening or hesper group);
// prompts from interface.md's first-time rows, filled from the actual bindings.
export const eveningPage = yardPage;
export const LESSON_LINE_COUNTS = {
  fenceSeen: lines('evening.fence.seen').length,
  postHit: lines('evening.post.hit').length,
  back: lines('evening.back').length,
  lanternFirst: lines('hesper.lantern.first', 'hesper').length,
};
/** Bram, from the fence: one line at most per step, only on a success (first-evening.md). Step order picks the line. */
export function bramEveningLine(step: 'fence' | 'post'): string {
  const all = lines('bram.evening');
  const page = all[step === 'fence' ? 1 : 2] ?? all[all.length - 1];
  return page.text;
}
/** "Hold the right mouse button" names no key in backticks: it is the default for the look-closer (aim) action. */
const MARK_ROW = interfaceRow('First time an enemy is in view while the bow is out');
const MARK_DEFAULT = 'the right mouse button';
export const LESSON_PROMPTS = {
  crouch: toActionTemplate(interfaceRow('First approach to an enemy place')),
  mark: MARK_ROW.replace(MARK_DEFAULT, '{aim}'),
  blade: `${toActionTemplate(interfaceRow('First fight')).split(', ')[0]}.`,
  dodge: toActionTemplate(interfaceRow('First enemy wind-up')),
  lock: toActionTemplate(interfaceRow('First fight with more than one enemy close')),
  map: toActionTemplate(interfaceRow('First place discovered')),
} as const;
/** Steps 4 to 6 prompts. The mark row keeps its written words while look-closer is on the right mouse button. */
export function lessonPrompt(kind: keyof typeof LESSON_PROMPTS, b: Bindings, device: Device): string | null {
  if (kind === 'mark' && device === 'keyboard' && b.keyboard.aim[0] === 'Mouse:2') return MARK_ROW;
  return filledPrompt(LESSON_PROMPTS[kind], b, device);
}
