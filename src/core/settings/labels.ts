// What an input is called on screen (GAME_DESIGN.md section 10). Claude's. Pure. Prompts always show what the
// player has actually bound, on the device they last touched, in that controller's own button names.
import { PAD, type Action, type Bindings, type Device, type Input } from './actions';

export type PadStyle = 'xbox' | 'playstation' | 'nintendo';

/** Which family a controller belongs to, from the name the browser reports. Unknown ones are shown as Xbox. */
export function padStyleOf(id: string): PadStyle {
  const s = id.toLowerCase();
  if (/(dualsense|dualshock|playstation|sony|054c)/.test(s)) return 'playstation';
  if (/(nintendo|switch|joy-con|pro controller|057e)/.test(s)) return 'nintendo';
  return 'xbox';
}

const PAD_NAMES: Record<PadStyle, Record<number, string>> = {
  xbox: { [PAD.south]: 'A', [PAD.east]: 'B', [PAD.west]: 'X', [PAD.north]: 'Y', [PAD.leftBumper]: 'LB', [PAD.rightBumper]: 'RB', [PAD.leftTrigger]: 'LT', [PAD.rightTrigger]: 'RT', [PAD.view]: 'View', [PAD.menu]: 'Menu', [PAD.leftStick]: 'L3', [PAD.rightStick]: 'R3' },
  playstation: { [PAD.south]: 'Cross', [PAD.east]: 'Circle', [PAD.west]: 'Square', [PAD.north]: 'Triangle', [PAD.leftBumper]: 'L1', [PAD.rightBumper]: 'R1', [PAD.leftTrigger]: 'L2', [PAD.rightTrigger]: 'R2', [PAD.view]: 'Create', [PAD.menu]: 'Options', [PAD.leftStick]: 'L3', [PAD.rightStick]: 'R3' },
  // Nintendo's letters are where they are on the pad, which is not where Xbox puts them.
  nintendo: { [PAD.south]: 'B', [PAD.east]: 'A', [PAD.west]: 'Y', [PAD.north]: 'X', [PAD.leftBumper]: 'L', [PAD.rightBumper]: 'R', [PAD.leftTrigger]: 'ZL', [PAD.rightTrigger]: 'ZR', [PAD.view]: '-', [PAD.menu]: '+', [PAD.leftStick]: 'L3', [PAD.rightStick]: 'R3' },
};
const DPAD: Record<number, string> = { [PAD.up]: 'D-pad up', [PAD.down]: 'D-pad down', [PAD.left]: 'D-pad left', [PAD.right]: 'D-pad right' };
const KEYS: Record<string, string> = {
  Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Right Shift', ControlLeft: 'Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Alt', AltRight: 'Right Alt',
  Escape: 'Esc', Tab: 'Tab', Enter: 'Enter', Backspace: 'Backspace', CapsLock: 'Caps Lock',
  ArrowUp: 'Up arrow', ArrowDown: 'Down arrow', ArrowLeft: 'Left arrow', ArrowRight: 'Right arrow',
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Backquote: '`',
};
const MOUSE = ['Left mouse', 'Middle mouse', 'Right mouse', 'Mouse 4', 'Mouse 5'];

/** The name to show for one input. */
export function inputLabel(input: Input, style: PadStyle = 'xbox'): string {
  const [kind, value] = input.split(':');
  if (kind === 'Pad') { const n = Number(value); return PAD_NAMES[style][n] ?? DPAD[n] ?? `Button ${n}`; }
  if (kind === 'Mouse') return MOUSE[Number(value)] ?? `Mouse ${Number(value) + 1}`;
  if (kind === 'Wheel') return value === 'up' ? 'Wheel up' : 'Wheel down';
  if (value.startsWith('Key') && value.length === 4) return value.slice(3);
  if (value.startsWith('Digit')) return value.slice(5);
  if (value.startsWith('Numpad')) return `Num ${value.slice(6)}`;
  return KEYS[value] ?? value;
}

/**
 * What a prompt shows for an action on the device in use: its main binding's name, or null if it has none there
 * (the prompt is then left out, never shown with a key the player cannot press).
 */
export function promptFor(b: Bindings, action: Action, device: Device, style: PadStyle = 'xbox'): string | null {
  if (device === 'pad' && action.startsWith('move')) return 'Left stick';
  const input = b[device][action][0];
  return input ? inputLabel(input, style) : null;
}

/** Fill the `{action}` marks in a prompt's words: "{dodge} to roll" becomes "Space to roll" or "A to roll". */
export function fillPrompt(text: string, b: Bindings, device: Device, style: PadStyle = 'xbox'): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in b[device] ? promptFor(b, name as Action, device, style) ?? '(unbound)' : whole));
}
