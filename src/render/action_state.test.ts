import { describe, expect, it } from 'vitest';
import { defaultBindings, rebind } from '../core/settings/actions';
import { ActionState } from './action_state';

function fresh() {
  return new ActionState(defaultBindings());
}

describe('ActionState: the default route', () => {
  it('maps the keys and mouse buttons to their actions', () => {
    const s = fresh();
    expect(s.isBound('Key:KeyW')).toBe(true);
    expect(s.actionsOn('Key:KeyW')).toEqual(['moveForward']);
    expect(s.actionsOn('Key:Space')).toEqual(['dodge']);
    expect(s.actionsOn('Key:Digit1')).toEqual(['weaponBlade']);
    expect(s.actionsOn('Key:Digit2')).toEqual(['weaponBow']);
    expect(s.actionsOn('Mouse:0')).toEqual(['attack']);
    expect(s.actionsOn('Mouse:2')).toEqual(['aim']);
    expect(s.actionsOn('Key:ShiftLeft')).toEqual(['sprint']);
    expect(s.actionsOn('Key:Escape')).toEqual(['pause']);
  });

  it('keeps the arrow keys on the same movement actions', () => {
    const s = fresh();
    expect(s.actionsOn('Key:ArrowUp')).toEqual(['moveForward']);
    expect(s.actionsOn('Key:ArrowLeft')).toEqual(['moveLeft']);
  });

  it('leaves unbound keys alone, so the browser keeps its default for them', () => {
    const s = fresh();
    expect(s.isBound('Key:KeyX')).toBe(false);
    expect(s.press('Key:KeyX')).toEqual([]);
  });

  it('either Shift sprints: Right Shift is the spare sprint input by default (review 029)', () => {
    const s = fresh();
    expect(s.isBound('Key:ShiftRight')).toBe(true);
    s.press('Key:ShiftRight');
    expect(s.isDown('sprint')).toBe(true);
  });

  it('a wheel tick is a one-step press, never held', () => {
    const s = fresh();
    expect(s.tick('Wheel:up')).toEqual(['arrowPrev']);
    expect(s.tick('Wheel:down')).toEqual(['arrowNext']);
  });
});

describe('ActionState: presses, holds and edges', () => {
  it('a press sets the held state and one edge', () => {
    const s = fresh();
    s.press('Key:Space');
    expect(s.isDown('dodge')).toBe(true);
    expect(s.takePressed('dodge')).toBe(true);
    expect(s.takePressed('dodge')).toBe(false);
  });

  it('a repeat of a held input gives no second edge', () => {
    const s = fresh();
    s.press('Key:Space');
    s.takePressed('dodge');
    expect(s.press('Key:Space')).toEqual([]);
    expect(s.takePressed('dodge')).toBe(false);
    expect(s.isDown('dodge')).toBe(true);
  });

  it('a release clears the held state and gives a release edge', () => {
    const s = fresh();
    s.press('Mouse:0');
    s.release('Mouse:0');
    expect(s.isDown('attack')).toBe(false);
    expect(s.takeReleased('attack')).toBe(true);
    expect(s.takeReleased('attack')).toBe(false);
  });

  it('cancel forgets a press that did not take effect', () => {
    const s = fresh();
    s.press('Mouse:0');
    s.cancel('Mouse:0');
    expect(s.takePressed('attack')).toBe(false);
    expect(s.isDown('attack')).toBe(false);
  });

  it('clear forgets everything held and every edge', () => {
    const s = fresh();
    s.press('Key:KeyW');
    s.press('Key:Space');
    s.clear();
    expect(s.isDown('moveForward')).toBe(false);
    expect(s.takePressed('dodge')).toBe(false);
  });

  it('a press in the route is seen as a held move', () => {
    const s = fresh();
    s.press('Key:KeyW');
    s.press('Key:KeyD');
    expect(s.isDown('moveForward')).toBe(true);
    expect(s.isDown('moveRight')).toBe(true);
    s.release('Key:KeyW');
    expect(s.isDown('moveForward')).toBe(false);
    expect(s.isDown('moveRight')).toBe(true);
  });
});

describe('ActionState: rebinding', () => {
  it('after moving dodge to J, Space gives no dodge and J does', () => {
    const r = rebind(defaultBindings(), 'keyboard', 'dodge', 'Key:KeyJ');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = new ActionState(r.bindings);
    expect(s.isBound('Key:Space')).toBe(false);
    s.press('Key:Space');
    expect(s.takePressed('dodge')).toBe(false);
    s.release('Key:Space');
    s.press('Key:KeyJ');
    expect(s.takePressed('dodge')).toBe(true);
    expect(s.isDown('dodge')).toBe(true);
  });

  it('setBindings applies a new map to the inputs already held', () => {
    const s = fresh();
    s.press('Key:KeyJ');
    const r = rebind(defaultBindings(), 'keyboard', 'dodge', 'Key:KeyJ');
    if (!r.ok) throw new Error('rebind failed');
    s.setBindings(r.bindings);
    expect(s.isDown('dodge')).toBe(true);
  });
});
