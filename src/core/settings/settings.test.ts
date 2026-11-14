import { describe, expect, it } from 'vitest';
import {
  ACTION_NAMES, ACTIONS, actionsDown, boundTo, defaultBindings, ESSENTIAL, PAD, parseBindings, rebind, RESERVED, resetDevice, unbind,
} from './actions';
import { fillPrompt, inputLabel, padStyleOf, promptFor } from './labels';
import { aimAssist, deviceInUse, readPad, stick } from './pad';
import { brightnessCurve, defaultSettings, parseSettings, RANGES, serializeSettings } from './settings';

const sticks = { deadzone: 0.15, lookSensitivity: 1, invertY: false, southpaw: false };
const padWith = (axes: number[], pressed: number[] = [], values: Record<number, number> = {}) =>
  ({ axes, buttons: Array.from({ length: 17 }, (_, i) => values[i] ?? (pressed.includes(i) ? 1 : 0)) });

describe('bindings: every action, on both devices', () => {
  const b = defaultBindings();
  it('every action has a name, and no input does two things on one device', () => {
    for (const a of ACTIONS) expect(ACTION_NAMES[a], a).toBeTruthy();
    for (const d of ['keyboard', 'pad'] as const) {
      const all = ACTIONS.flatMap((a) => b[d][a]);
      expect(new Set(all).size, d).toBe(all.length);
      for (const a of ESSENTIAL[d]) expect(b[d][a].length, `${d} ${a}`).toBeGreaterThan(0);
    }
  });
  it('the defaults are the keys the design lists', () => {
    expect(b.keyboard.dodge).toEqual(['Key:Space']);
    expect(b.keyboard.attack).toEqual(['Mouse:0']);
    expect(b.keyboard.pause).toEqual(['Key:Escape']);
    expect(b.pad.attack).toEqual([`Pad:${PAD.rightTrigger}`]);
    expect(b.pad.aim).toEqual([`Pad:${PAD.leftTrigger}`]);
    expect(b.pad.pause).toEqual([`Pad:${PAD.menu}`]);
  });
  it('a controller can reach everything: each action is bound, on a stick, or reached from the map', () => {
    const viaMapTabs = ['inventory', 'skills'], onStick = ['moveForward', 'moveBack', 'moveLeft', 'moveRight'];
    const covered = ['weaponBlade', 'weaponBow', 'arrowPrev']; // swap and next-arrow cycle through these
    for (const a of ACTIONS) expect(b.pad[a].length > 0 || viaMapTabs.includes(a) || onStick.includes(a) || covered.includes(a), a).toBe(true);
  });
  it('turns what is held into what is being done, from either device at once', () => {
    expect([...actionsDown(b, new Set(['Key:KeyW', 'Key:Space']))].sort()).toEqual(['dodge', 'moveForward']);
    expect([...actionsDown(b, new Set(['Key:KeyW', `Pad:${PAD.south}`]))].sort()).toEqual(['dodge', 'moveForward']);
    expect(actionsDown(b, new Set(['Key:KeyZ'])).size).toBe(0);
  });
});

describe('rebinding', () => {
  const b = defaultBindings();
  it('moves an action to a free key and leaves everything else alone', () => {
    const r = rebind(b, 'keyboard', 'dodge', 'Key:KeyG');
    if (!r.ok) throw new Error(r.reason);
    expect(r.bindings.keyboard.dodge).toEqual(['Key:KeyG']);
    expect(r.displaced).toBeNull();
    expect(r.bindings.pad).toEqual(b.pad);
    expect(b.keyboard.dodge).toEqual(['Key:Space']);
  });
  it('one key does one thing: taking a key that is in use swaps, so nothing essential is left without one', () => {
    const r = rebind(b, 'keyboard', 'dodge', 'Key:KeyE');
    if (!r.ok) throw new Error(r.reason);
    expect(r.displaced).toBe('interact');
    expect(r.bindings.keyboard.dodge).toEqual(['Key:KeyE']);
    expect(r.bindings.keyboard.interact).toEqual(['Key:Space']);
    expect(boundTo(r.bindings, 'Key:KeyE')).toBe('dodge');
  });
  it('an action that is not essential simply loses the key', () => {
    const r = rebind(b, 'keyboard', 'dodge', 'Key:KeyT');
    if (!r.ok) throw new Error(r.reason);
    expect(r.displaced).toBe('takeAlive');
    expect(r.bindings.keyboard.takeAlive).toEqual([]);
  });
  it('a spare binding can be added, and taking one of two leaves the other', () => {
    const r = rebind(b, 'keyboard', 'dodge', 'Key:AltLeft', 1);
    if (!r.ok) throw new Error(r.reason);
    expect(r.bindings.keyboard.dodge).toEqual(['Key:Space', 'Key:AltLeft']);
    const taken = rebind(b, 'keyboard', 'crouch', 'Key:ArrowUp');
    if (!taken.ok) throw new Error(taken.reason);
    expect(taken.bindings.keyboard.moveForward).toEqual(['Key:KeyW']);
  });
  it('the way out can never be taken or removed, on either device', () => {
    expect(rebind(b, 'keyboard', 'dodge', 'Key:Escape')).toEqual({ ok: false, reason: 'reserved' });
    expect(rebind(b, 'pad', 'dodge', RESERVED.pad)).toEqual({ ok: false, reason: 'reserved' });
    expect(unbind(b, 'keyboard', 'pause', 0)).toEqual({ ok: false, reason: 'reserved' });
    const extra = rebind(b, 'keyboard', 'pause', 'Key:KeyP', 1);
    if (!extra.ok) throw new Error(extra.reason);
    expect(extra.bindings.keyboard.pause).toEqual(['Key:Escape', 'Key:KeyP']);
  });
  it('refuses a key from the wrong device, and refuses to leave an essential action empty', () => {
    expect(rebind(b, 'keyboard', 'dodge', 'Pad:0')).toEqual({ ok: false, reason: 'wrong_device' });
    expect(unbind(b, 'keyboard', 'attack', 0)).toEqual({ ok: false, reason: 'would_strand', stranded: 'attack' });
    const freed = unbind(b, 'keyboard', 'takeAlive', 0);
    expect(freed.ok && freed.bindings.keyboard.takeAlive).toEqual([]);
  });
  it('works the same on a controller, and one device can be reset without touching the other', () => {
    const r = rebind(b, 'pad', 'dodge', `Pad:${PAD.east}`);
    if (!r.ok) throw new Error(r.reason);
    expect(r.bindings.pad.dodge).toEqual([`Pad:${PAD.east}`]);
    expect(r.displaced).toBe('crouch');
    const k = rebind(r.bindings, 'keyboard', 'dodge', 'Key:KeyG');
    if (!k.ok) throw new Error(k.reason);
    const reset = resetDevice(k.bindings, 'pad');
    expect(reset.pad).toEqual(b.pad);
    expect(reset.keyboard.dodge).toEqual(['Key:KeyG']);
  });
});

describe('saved bindings can never break the game', () => {
  it('keeps what is good and repairs what is not', () => {
    const def = defaultBindings();
    const changed = rebind(def, 'keyboard', 'dodge', 'Key:KeyG');
    if (!changed.ok) throw new Error(changed.reason);
    expect(parseBindings(JSON.parse(JSON.stringify(changed.bindings)))).toEqual(changed.bindings);
    for (const junk of [null, 7, 'x', [], { keyboard: 3 }, { keyboard: { dodge: 'Space' } }]) expect(parseBindings(junk)).toEqual(def);
  });
  it('drops unknown inputs, doubles, and anything on the reserved key, and never leaves an essential action empty', () => {
    const p = parseBindings({ keyboard: { dodge: ['Key:Escape', 'Nonsense', 'Key:KeyG'], crouch: ['Key:KeyG'], attack: [], pause: [] }, pad: { attack: ['Key:KeyQ'] } });
    expect(p.keyboard.dodge).toEqual(['Key:KeyG']);
    expect(p.keyboard.crouch).toEqual([]);
    expect(p.keyboard.attack).toEqual(['Mouse:0']);
    expect(p.keyboard.pause[0]).toBe('Key:Escape');
    expect(p.pad.attack.length).toBeGreaterThan(0);
    for (const d of ['keyboard', 'pad'] as const) for (const a of ESSENTIAL[d]) expect(p[d][a].length, `${d} ${a}`).toBeGreaterThan(0);
  });
});

describe('prompts show what the player has bound, on the device in their hands', () => {
  const b = defaultBindings();
  it('names keys, mouse buttons, and each family of controller in its own words', () => {
    expect(inputLabel('Key:KeyW')).toBe('W');
    expect(inputLabel('Key:Digit1')).toBe('1');
    expect(inputLabel('Key:ShiftLeft')).toBe('Left Shift');
    expect(inputLabel('Mouse:2')).toBe('Right mouse');
    expect(inputLabel('Wheel:down')).toBe('Wheel down');
    expect(inputLabel('Pad:0', 'xbox')).toBe('A');
    expect(inputLabel('Pad:0', 'playstation')).toBe('Cross');
    expect(inputLabel('Pad:0', 'nintendo')).toBe('B');
    expect(inputLabel('Pad:12')).toBe('D-pad up');
  });
  it('recognises a controller from its name, and treats an unknown one as Xbox', () => {
    expect(padStyleOf('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)')).toBe('playstation');
    expect(padStyleOf('Pro Controller (STANDARD GAMEPAD Vendor: 057e)')).toBe('nintendo');
    expect(padStyleOf('Xbox Wireless Controller')).toBe('xbox');
    expect(padStyleOf('8BitDo Something')).toBe('xbox');
  });
  it('follows rebinding, and leaves a prompt out if the action has nothing on that device', () => {
    expect(fillPrompt('{dodge} to roll', b, 'keyboard')).toBe('Space to roll');
    expect(fillPrompt('{dodge} to roll', b, 'pad', 'playstation')).toBe('Cross to roll');
    const r = rebind(b, 'keyboard', 'dodge', 'Key:KeyG');
    if (!r.ok) throw new Error(r.reason);
    expect(fillPrompt('{dodge} to roll', r.bindings, 'keyboard')).toBe('G to roll');
    expect(promptFor(b, 'moveForward', 'pad')).toBe('Left stick');
    expect(promptFor(b, 'inventory', 'pad')).toBeNull();
    expect(fillPrompt('{nothing} here', b, 'keyboard')).toBe('{nothing} here');
  });
});

describe('reading a controller', () => {
  it('a stick at rest, or drifting inside the dead zone, is still', () => {
    expect(stick(0.05, -0.08, 0.15).size).toBe(0);
    expect(readPad(padWith([0.1, 0.05, -0.1, 0.02]), sticks).active).toBe(false);
  });
  it('past the dead zone it rises smoothly from nothing to full, in the direction pushed', () => {
    expect(stick(0.16, 0, 0.15).size).toBeLessThan(0.05);
    expect(stick(1, 0, 0.15)).toMatchObject({ x: 1, y: 0, size: 1 });
    expect(stick(0.9, 0.9, 0.15).size).toBe(1);
    const half = stick(0.6, 0, 0.15, 1.8), full = stick(1, 0, 0.15, 1.8);
    expect(half.size).toBeLessThan(0.5);
    expect(full.size).toBe(1);
  });
  it('the left stick moves and the right looks; pushing up is forward and looking up', () => {
    const r = readPad(padWith([0, -1, 1, -1]), sticks);
    expect(r.move.y).toBeCloseTo(1);
    expect(r.run).toBe(true);
    expect(r.look.yaw).toBeGreaterThan(0);
    expect(r.look.pitch).toBeGreaterThan(0);
    expect(readPad(padWith([0, -0.5, 0, 0]), sticks).run).toBe(false);
  });
  it('invert and southpaw do what they say, and sensitivity scales the look', () => {
    expect(readPad(padWith([0, 0, 0, -1]), { ...sticks, invertY: true }).look.pitch).toBeLessThan(0);
    const south = readPad(padWith([1, 0, 0, -1]), { ...sticks, southpaw: true });
    expect(south.move.y).toBeCloseTo(1);
    expect(south.look.yaw).toBeGreaterThan(0);
    const slow = readPad(padWith([0, 0, 1, 0]), { ...sticks, lookSensitivity: 0.5 }).look.yaw;
    const fast = readPad(padWith([0, 0, 1, 0]), { ...sticks, lookSensitivity: 2 }).look.yaw;
    expect(fast).toBeCloseTo(slow * 4);
  });
  it('buttons become inputs the bindings understand, and the trigger gives the draw', () => {
    const r = readPad(padWith([0, 0, 0, 0], [PAD.south], { [PAD.rightTrigger]: 0.8, [PAD.leftTrigger]: 0.2 }), sticks);
    expect([...actionsDown(defaultBindings(), r.down)].sort()).toEqual(['attack', 'dodge']);
    expect(r.draw).toBeCloseTo(0.8);
    expect(r.active).toBe(true);
  });
  it('survives a controller that reports nonsense or too little', () => {
    const r = readPad({ axes: [Number.NaN], buttons: [] }, sticks);
    expect(r).toMatchObject({ move: { x: 0 }, draw: 0, active: false });
  });
  it('the device in use is whichever was touched last', () => {
    expect(deviceInUse('keyboard', false, true)).toBe('pad');
    expect(deviceInUse('pad', true, true)).toBe('keyboard');
    expect(deviceInUse('pad', false, false)).toBe('pad');
  });
});

describe('aim assist: a help, never a hand on the bow', () => {
  const look = { yaw: 1, pitch: 0 };
  it('does nothing when it is off, when no target is near, or when the stick is still', () => {
    expect(aimAssist(look, { yaw: 0.05, pitch: 0 }, 0)).toEqual(look);
    expect(aimAssist(look, null, 1)).toEqual(look);
    expect(aimAssist(look, { yaw: 0.5, pitch: 0 }, 1)).toEqual(look);
    expect(aimAssist({ yaw: 0, pitch: 0 }, { yaw: 0.01, pitch: 0 }, 1)).toEqual({ yaw: 0, pitch: 0 });
  });
  it('slows the look near a target, more the closer it is and the stronger the setting', () => {
    const near = aimAssist(look, { yaw: -0.02, pitch: 0 }, 1).yaw;
    const edge = aimAssist(look, { yaw: -0.12, pitch: 0 }, 1).yaw;
    const weak = aimAssist(look, { yaw: -0.02, pitch: 0 }, 0.3).yaw;
    expect(near).toBeLessThan(edge);
    expect(edge).toBeLessThan(1);
    expect(weak).toBeGreaterThan(near);
  });
  it('leans toward a target the player is steering at, and never toward one they are steering away from', () => {
    const toward = aimAssist(look, { yaw: 0.05, pitch: 0.03 }, 1);
    expect(toward.pitch).toBeGreaterThan(0);
    const away = aimAssist(look, { yaw: -0.05, pitch: 0.03 }, 1);
    expect(away.pitch).toBe(0);
    expect(away.yaw).toBeGreaterThan(0);
  });
});

describe('the settings as a whole', () => {
  it('every default is inside its own limits', () => {
    const s = defaultSettings();
    expect(s.display.brightness).toBe(1);
    for (const [v, r] of [[s.display.brightness, RANGES.brightness], [s.camera.mouseSensitivity, RANGES.mouseSensitivity], [s.camera.fovThirdPerson, RANGES.fov], [s.camera.fovFirstPerson, RANGES.fov], [s.controller.deadzone, RANGES.deadzone], [s.controller.aimAssist, RANGES.aimAssist]] as const) {
      expect(v).toBeGreaterThanOrEqual(r.min); expect(v).toBeLessThanOrEqual(r.max);
    }
  });
  it('comes back from a save exactly as it went in', () => {
    const s = defaultSettings();
    s.display.brightness = 1.25; s.controller.southpaw = true; s.play.difficulty = 'lantern';
    const r = rebind(s.bindings, 'keyboard', 'dodge', 'Key:KeyG');
    if (r.ok) s.bindings = r.bindings;
    expect(parseSettings(serializeSettings(s))).toEqual(s);
  });
  it('a broken save gives the defaults, and a bad value is repaired on its own without losing the rest', () => {
    for (const junk of [null, '', 'not json', '[]', '7']) expect(parseSettings(junk)).toEqual(defaultSettings());
    const p = parseSettings(JSON.stringify({ display: { brightness: 99, quality: 'ultra', frameCap: 144 }, camera: { invertY: true, fovThirdPerson: 'wide' }, controller: { deadzone: -4 }, play: { difficulty: 'easy', textSize: 'large' } }));
    expect(p.display).toMatchObject({ brightness: RANGES.brightness.max, quality: 'medium', frameCap: 60 });
    expect(p.camera).toMatchObject({ invertY: true, fovThirdPerson: 60 });
    expect(p.controller.deadzone).toBe(0);
    expect(p.play).toMatchObject({ difficulty: 'dusk', textSize: 'large' });
    expect(p.bindings).toEqual(defaultSettings().bindings);
  });
  it('brightness lifts the dark as it rises and never blacks the picture out at its lowest', () => {
    expect(brightnessCurve(1)).toEqual({ exposure: 1, shadowLift: 0 });
    expect(brightnessCurve(1.5).exposure).toBeGreaterThan(1);
    expect(brightnessCurve(1.5).shadowLift).toBeGreaterThan(0);
    // Enough range that the brightness picture changes plainly from end to end (review 032), without blacking out.
    expect(brightnessCurve(0.5).exposure).toBeGreaterThan(0.5);
    expect(brightnessCurve(0.5).exposure).toBeLessThan(0.65);
    expect(brightnessCurve(1.5).exposure).toBeGreaterThan(1.4);
    expect(brightnessCurve(-9)).toEqual(brightnessCurve(0.5));
  });
});
