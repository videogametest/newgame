// Screen words are read from the writing, never maintained as a second copy.
import writing from '../../docs/writing/interface.md?raw';
const section = writing.split('## Title screen\n')[1]?.split('\n## ')[0];
if (!section) throw new Error('Missing title writing');
const lines = section.split('\n').map(l => l.replace(/^- /, '').trim());
function exact(text: string): string {
  const found = lines.find(l => l === text);
  if (!found) throw new Error(`Missing title label: ${text}`);
  return found;
}
const question = section.match(/when a save exists: "([^"]+)" with \*\*([^*]+)\*\* and \*\*([^*]+)\*\*/);
if (!question) throw new Error('Missing new-game confirmation writing');
export const TITLE_WORDS = {
  continue: exact('Continue'), newGame: exact('New game'), settings: exact('Settings'),
  question: question[1], replace: question[2], keep: question[3],
};
/**
 * Item 29's one line under the title buttons when a new version is waiting. Placeholder: docs/writing/interface.md
 * has no line for it yet; replace with the writing's words when they exist.
 */
export const UPDATE_READY_LINE = 'An update is ready. It will be used the next time you start.';
// Untuned title-camera motion, radians and seconds. Bounded, so the view never turns away from Wick.
export const TITLE_MOTION = { amplitude: 0.045, period: 90 } as const;
