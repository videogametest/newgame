import { describe, expect, it } from 'vitest';
import { defaultBindings, rebind, type Bindings } from '../core/settings/actions';
import { inputFromKey, inputFromMouse, inputFromWheel, noticeFor } from './controls_rules';

const none = { ctrlKey: false, altKey: false, metaKey: false };

describe('inputFromKey', () => {
  it('names a key by its code', () => {
    expect(inputFromKey({ code: 'KeyW', ...none })).toBe('Key:KeyW');
    expect(inputFromKey({ code: 'ShiftRight', ...none })).toBe('Key:ShiftRight');
  });

  it('takes a modifier key on its own', () => {
    expect(inputFromKey({ code: 'ControlLeft', ctrlKey: true, altKey: false, metaKey: false })).toBe('Key:ControlLeft');
  });

  it('ignores a chord, which belongs to the browser or the OS', () => {
    expect(inputFromKey({ code: 'KeyA', ctrlKey: true, altKey: false, metaKey: false })).toBeNull();
    expect(inputFromKey({ code: 'KeyA', ctrlKey: false, altKey: false, metaKey: true })).toBeNull();
  });

  it('ignores an event with no code', () => {
    expect(inputFromKey({ code: '', ...none })).toBeNull();
  });
});

describe('inputFromMouse and inputFromWheel', () => {
  it('takes mouse buttons 0 to 4 only', () => {
    expect(inputFromMouse(0)).toBe('Mouse:0');
    expect(inputFromMouse(4)).toBe('Mouse:4');
    expect(inputFromMouse(5)).toBeNull();
    expect(inputFromMouse(-1)).toBeNull();
    expect(inputFromMouse(1.5)).toBeNull();
  });

  it('reads the wheel direction, and nothing for no movement', () => {
    expect(inputFromWheel(120)).toBe('Wheel:down');
    expect(inputFromWheel(-120)).toBe('Wheel:up');
    expect(inputFromWheel(0)).toBeNull();
  });
});

/** Default bindings with the keyboard set to keys nothing else uses, so the notices can be checked exactly. */
function known(): Bindings {
  const b = defaultBindings();
  b.keyboard.eat = ['Key:KeyG'];
  b.keyboard.lockOn = ['Key:KeyX'];
  b.keyboard.knife = ['Key:KeyR'];
  return b;
}

describe('noticeFor', () => {
  it('says a reserved input always pauses', () => {
    const b = known();
    const r = rebind(b, 'keyboard', 'eat', 'Key:Escape');
    expect(noticeFor(r, b, 'eat', 0, 'Key:Escape')).toBe('Esc always pauses. Choose another.');
  });

  it('shows the swap when the displaced action takes this slot\u2019s old input', () => {
    const b = known();
    // Lock on takes Space from Dodge. Dodge is essential and has nothing else, so it moves to X, Lock on's old input.
    const r = rebind(b, 'keyboard', 'lockOn', 'Key:Space');
    expect(r.ok).toBe(true);
    expect(noticeFor(r, b, 'lockOn', 0, 'Key:Space')).toBe('Lock on now uses Space. Dodge has moved to X.');
  });

  it('shows a plain take when the displaced action has nothing left', () => {
    const b = known();
    b.keyboard.lockOn = [];
    // Eat has G only and is not essential, so it is not given anything back. Eat has nothing bound.
    const r = rebind(b, 'keyboard', 'lockOn', 'Key:KeyG');
    expect(r.ok).toBe(true);
    expect(noticeFor(r, b, 'lockOn', 0, 'Key:KeyG')).toBe('Lock on now uses G. Eat has nothing bound.');
  });

  it('shows a plain assignment when nothing was taken', () => {
    const b = known();
    const r = rebind(b, 'keyboard', 'knife', 'Key:KeyY');
    expect(noticeFor(r, b, 'knife', 0, 'Key:KeyY')).toBe('Throw a knife now uses Y.');
  });

  it('says the displaced action still has its other input when it keeps one', () => {
    const b = known();
    b.keyboard.knife = ['Key:KeyR', 'Key:KeyY'];
    const r = rebind(b, 'keyboard', 'lockOn', 'Key:KeyY');
    expect(r.ok).toBe(true);
    expect(noticeFor(r, b, 'lockOn', 0, 'Key:KeyY')).toBe('Lock on now uses Y. Throw a knife still has R.');
  });

  it('says a refused change needs another input first', () => {
    const b = known();
    // Interact is essential and has one input; taking it leaves it with nothing, and nothing is given back.
    b.keyboard.interact = ['Key:KeyJ'];
    const r = rebind(b, 'keyboard', 'eat', 'Key:KeyJ', 1);
    expect(r).toMatchObject({ ok: false, reason: 'would_strand', stranded: 'interact' });
    expect(noticeFor(r, b, 'eat', 1, 'Key:KeyJ')).toBe('Interact needs a key. Give it another first.');
  });
});
