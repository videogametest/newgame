// Pure input decisions (no DOM), so they can be unit-tested. Used by input.ts.

/** Keys whose browser default (scroll, focus, menus, the debug panel key) the game takes over. */
const SUPPRESSED_CODES = new Set(['Tab', 'Space', 'Backquote']);

/** True when the browser's default action for this key must be cancelled. */
export function isSuppressedKey(code: string): boolean {
  return SUPPRESSED_CODES.has(code);
}

/** Modifier chords (Ctrl, Alt, Cmd/Meta) are the browser's or the OS's, never a game binding. */
export function hasModifier(e: { ctrlKey: boolean; altKey: boolean; metaKey: boolean }): boolean {
  return e.ctrlKey || e.altKey || e.metaKey;
}

/** Mouse buttons whose default must be cancelled everywhere: right (context menu) and middle (autoscroll). */
export function isSuppressedMouseButton(button: number): boolean {
  return button === 1 || button === 2;
}

/**
 * Whether the simulation may advance this frame. Pauses when the pointer is released (Esc, the debug panel,
 * a click out) or when the window loses focus (alt-tab, another window).
 */
export function simRunning(locked: boolean, windowFocused: boolean): boolean {
  return locked && windowFocused;
}
