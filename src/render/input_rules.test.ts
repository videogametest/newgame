import { describe, expect, it } from 'vitest';
import { hasModifier, isSuppressedKey, isSuppressedMouseButton, simRunning } from './input_rules';

const none = { ctrlKey: false, altKey: false, metaKey: false };

describe('input rules', () => {
  it('suppresses the browser defaults for Tab, Space and the backtick', () => {
    expect(isSuppressedKey('Tab')).toBe(true);
    expect(isSuppressedKey('Space')).toBe(true);
    expect(isSuppressedKey('Backquote')).toBe(true);
    expect(isSuppressedKey('KeyW')).toBe(false);
    expect(isSuppressedKey('Digit1')).toBe(false);
  });

  it('treats any Ctrl, Alt or Cmd chord as a non-game key', () => {
    expect(hasModifier(none)).toBe(false);
    expect(hasModifier({ ...none, ctrlKey: true })).toBe(true);
    expect(hasModifier({ ...none, altKey: true })).toBe(true);
    expect(hasModifier({ ...none, metaKey: true })).toBe(true);
    expect(hasModifier({ ...none, shiftKey: true } as typeof none)).toBe(false);
  });

  it('suppresses right and middle mouse defaults, not the left button', () => {
    expect(isSuppressedMouseButton(2)).toBe(true);
    expect(isSuppressedMouseButton(1)).toBe(true);
    expect(isSuppressedMouseButton(0)).toBe(false);
  });

  it('pauses the simulation when the pointer is released or the window loses focus', () => {
    expect(simRunning(true, true)).toBe(true);
    expect(simRunning(false, true)).toBe(false);
    expect(simRunning(true, false)).toBe(false);
    expect(simRunning(false, false)).toBe(false);
  });
});
