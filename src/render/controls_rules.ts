// Pure rules for the Controls page (task 009, step 2b): what a press becomes as an input, and what the notice says
// after a change. The notice words are docs/writing/interface.md, "Settings and controls". No DOM here.
import { ACTION_NAMES, type Action, type Bindings, type Input, type RebindResult } from '../core/settings/actions';
import { inputLabel } from '../core/settings/labels';
import { hasModifier } from './input_rules';

/** The prompt while a slot is listening, on the keyboard and mouse tab. */
export const LISTEN_PROMPT = 'Press a key or button. Esc to cancel.';

/** A key press as an input. Ctrl, Alt and Cmd chords are the browser's, so they are not taken (the key is ignored). */
export function inputFromKey(e: { code: string; ctrlKey: boolean; altKey: boolean; metaKey: boolean }): Input | null {
  if (!e.code) return null;
  // A modifier on its own (Shift, Ctrl) is a key the player may bind; a chord with one held is not.
  const isModifierKey = /^(Shift|Control|Alt|Meta)(Left|Right)$/.test(e.code);
  if (!isModifierKey && hasModifier(e)) return null;
  return `Key:${e.code}`;
}

/** A mouse button as an input. Buttons 0 to 4 are the ones the game can bind. */
export function inputFromMouse(button: number): Input | null {
  return Number.isInteger(button) && button >= 0 && button <= 4 ? `Mouse:${button}` : null;
}

/** A wheel tick as an input: scrolling down is `Wheel:down`, up is `Wheel:up`, no movement is none. */
export function inputFromWheel(deltaY: number): Input | null {
  if (deltaY > 0) return 'Wheel:down';
  if (deltaY < 0) return 'Wheel:up';
  return null;
}

/**
 * The line shown after a change, or null when the copy has no line for it. The slot's old input is needed to say
 * where a displaced action has moved.
 */
export function noticeFor(
  result: RebindResult,
  before: Bindings,
  action: Action,
  slot: number,
  input: Input,
): string | null {
  if (!result.ok) {
    if (result.reason === 'reserved') return `${inputLabel(input)} always pauses. Choose another.`;
    if (result.reason === 'would_strand' && result.stranded) return `${ACTION_NAMES[result.stranded]} needs a key. Give it another first.`;
    return null;
  }
  const label = inputLabel(input);
  const displaced = result.displaced;
  if (!displaced) return `${ACTION_NAMES[action]} now uses ${label}.`;
  const old = before.keyboard[action][slot] ?? null;
  const other = result.bindings.keyboard[displaced];
  // A swap: the displaced action took this slot's old input.
  if (old && other.includes(old)) return `${ACTION_NAMES[action]} now uses ${label}. ${ACTION_NAMES[displaced]} has moved to ${inputLabel(old)}.`;
  // A plain take, worded only when it is true: the displaced action has nothing left on the keyboard.
  if (other.length === 0) return `${ACTION_NAMES[action]} now uses ${label}. ${ACTION_NAMES[displaced]} has nothing bound.`;
  // The displaced action keeps the input it had as its other slot.
  return `${ACTION_NAMES[action]} now uses ${label}. ${ACTION_NAMES[displaced]} still has ${inputLabel(other[0])}.`;
}
