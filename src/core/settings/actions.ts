// Every thing the player can do, and what is pressed to do it (GAME_DESIGN.md sections 5 and 10). Claude's. Pure.
// The game asks "is `dodge` down?", never "is Space down?". Keyboard and mouse have one set of bindings, a
// controller another; both can be changed by the player and both are saved with the settings.

export const ACTIONS = [
  'moveForward', 'moveBack', 'moveLeft', 'moveRight',
  'sprint', 'dodge', 'crouch', 'attack', 'aim', 'interact',
  'weaponBlade', 'weaponBow', 'weaponSwap', 'arrowNext', 'arrowPrev', 'knife', 'lockOn', 'eat',
  'squadOrder', 'takeAlive', 'view', 'map', 'inventory', 'skills', 'pause',
] as const;
export type Action = (typeof ACTIONS)[number];

export type Device = 'keyboard' | 'pad';

/**
 * One input, as a string that can be saved:
 * `Key:<KeyboardEvent.code>`, `Mouse:<button>`, `Wheel:up|down`, or `Pad:<standard button index>`.
 */
export type Input = string;

export type Bindings = Record<Device, Record<Action, Input[]>>;

/** How many inputs one action may have on one device: a main one and a spare. */
export const MAX_PER_ACTION = 2;

/** What each action is called on the Controls screen. */
export const ACTION_NAMES: Record<Action, string> = {
  moveForward: 'Move forward', moveBack: 'Move back', moveLeft: 'Move left', moveRight: 'Move right',
  sprint: 'Sprint', dodge: 'Dodge', crouch: 'Crouch', attack: 'Attack / draw', aim: 'Aim / mark', interact: 'Interact',
  weaponBlade: 'Short blade', weaponBow: 'Bow', weaponSwap: 'Switch weapon', arrowNext: 'Next arrow type', arrowPrev: 'Previous arrow type',
  knife: 'Throw a knife', lockOn: 'Lock on', eat: 'Eat', squadOrder: 'Follow me / hold here', takeAlive: 'Take them alive',
  view: 'Change view', map: 'Map', inventory: 'Inventory', skills: 'Skills', pause: 'Pause',
};

/** The standard controller's buttons, by index (the browser's "standard" mapping). */
export const PAD = {
  south: 0, east: 1, west: 2, north: 3, leftBumper: 4, rightBumper: 5, leftTrigger: 6, rightTrigger: 7,
  view: 8, menu: 9, leftStick: 10, rightStick: 11, up: 12, down: 13, left: 14, right: 15,
} as const;
const pad = (b: number): Input => `Pad:${b}`;

export function defaultBindings(): Bindings {
  return {
    keyboard: {
      moveForward: ['Key:KeyW', 'Key:ArrowUp'], moveBack: ['Key:KeyS', 'Key:ArrowDown'], moveLeft: ['Key:KeyA', 'Key:ArrowLeft'], moveRight: ['Key:KeyD', 'Key:ArrowRight'],
      sprint: ['Key:ShiftLeft'], dodge: ['Key:Space'], crouch: ['Key:KeyC'], attack: ['Mouse:0'], aim: ['Mouse:2'], interact: ['Key:KeyE'],
      weaponBlade: ['Key:Digit1'], weaponBow: ['Key:Digit2'], weaponSwap: [], arrowNext: ['Wheel:down'], arrowPrev: ['Wheel:up'],
      knife: ['Key:KeyR'], lockOn: ['Key:Tab'], eat: ['Key:KeyF'], squadOrder: ['Key:KeyQ'], takeAlive: ['Key:KeyT'],
      view: ['Key:KeyV'], map: ['Key:KeyM'], inventory: ['Key:KeyI'], skills: ['Key:KeyK'], pause: ['Key:Escape'],
    },
    pad: {
      // The left stick moves and the right stick looks; those are axes, set by the stick options, not bound here.
      moveForward: [], moveBack: [], moveLeft: [], moveRight: [],
      sprint: [pad(PAD.leftStick)], dodge: [pad(PAD.south)], crouch: [pad(PAD.east)], attack: [pad(PAD.rightTrigger)], aim: [pad(PAD.leftTrigger)], interact: [pad(PAD.west)],
      weaponBlade: [], weaponBow: [], weaponSwap: [pad(PAD.north)], arrowNext: [pad(PAD.right)], arrowPrev: [],
      knife: [pad(PAD.leftBumper)], lockOn: [pad(PAD.rightBumper)], eat: [pad(PAD.up)], squadOrder: [pad(PAD.down)], takeAlive: [pad(PAD.left)],
      view: [pad(PAD.rightStick)], map: [pad(PAD.view)], inventory: [], skills: [], pause: [pad(PAD.menu)],
    },
  };
}

/** Inputs that always pause and can never be given to anything else: the way out must always work. */
export const RESERVED: Record<Device, Input> = { keyboard: 'Key:Escape', pad: pad(PAD.menu) };

/**
 * Actions the game cannot be played without, per device. They can be moved to another input, never left with none.
 * On a controller, moving is the stick's job. Inventory and Skills are reached from the map's tabs, so a controller
 * need not bind them.
 */
export const ESSENTIAL: Record<Device, readonly Action[]> = {
  keyboard: ['moveForward', 'moveBack', 'moveLeft', 'moveRight', 'attack', 'interact', 'pause', 'dodge', 'map'],
  pad: ['attack', 'interact', 'pause', 'dodge', 'weaponSwap', 'map'],
};

export type RebindResult =
  | { ok: true; bindings: Bindings; /** The action that had this input and has now lost it. */ displaced: Action | null }
  | { ok: false; reason: 'reserved' | 'wrong_device' | 'would_strand'; stranded?: Action };

const deviceOf = (input: Input): Device => (input.startsWith('Pad:') ? 'pad' : 'keyboard');
const clone = (b: Bindings): Bindings => ({
  keyboard: Object.fromEntries(ACTIONS.map((a) => [a, [...b.keyboard[a]]])) as Record<Action, Input[]>,
  pad: Object.fromEntries(ACTIONS.map((a) => [a, [...b.pad[a]]])) as Record<Action, Input[]>,
});

/** Who has this input now, on its device. */
export function boundTo(b: Bindings, input: Input): Action | null {
  const d = deviceOf(input);
  return ACTIONS.find((a) => b[d][a].includes(input)) ?? null;
}

/**
 * Give `input` to `action`, in its main slot or its spare. One input does one thing: whoever had it loses it, and
 * if that would leave an essential action with nothing, they are given what this action is giving up; if there is
 * nothing to give, the change is refused and nothing moves.
 */
export function rebind(b: Bindings, device: Device, action: Action, input: Input, slot = 0): RebindResult {
  if (deviceOf(input) !== device) return { ok: false, reason: 'wrong_device' };
  if (input === RESERVED[device] && action !== 'pause') return { ok: false, reason: 'reserved' };
  const next = clone(b);
  const mine = next[device][action];
  if (action === 'pause' && !mine.includes(RESERVED[device]) ) mine.unshift(RESERVED[device]);
  const giving = mine[slot] ?? null;
  const holder = boundTo(next, input);
  if (holder === action) {
    // Already theirs: only move it to the asked slot.
    mine.splice(mine.indexOf(input), 1);
    mine.splice(Math.min(slot, mine.length), 0, input);
    return { ok: true, bindings: next, displaced: null };
  }
  if (action === 'pause' && giving === RESERVED[device]) return { ok: false, reason: 'reserved' };
  if (holder) {
    const theirs = next[device][holder];
    theirs.splice(theirs.indexOf(input), 1);
    if (theirs.length === 0 && ESSENTIAL[device].includes(holder)) {
      if (giving === null || giving === RESERVED[device]) return { ok: false, reason: 'would_strand', stranded: holder };
      theirs.push(giving);
    }
  }
  if (slot < mine.length) mine[slot] = input; else mine.push(input);
  next[device][action] = [...new Set(mine)].slice(0, MAX_PER_ACTION);
  return { ok: true, bindings: next, displaced: holder };
}

/** Take one input away from an action. Refused if it is the reserved one or the last one an essential action has. */
export function unbind(b: Bindings, device: Device, action: Action, slot: number): RebindResult {
  const input = b[device][action][slot];
  if (input === undefined) return { ok: true, bindings: clone(b), displaced: null };
  if (input === RESERVED[device]) return { ok: false, reason: 'reserved' };
  if (b[device][action].length === 1 && ESSENTIAL[device].includes(action)) return { ok: false, reason: 'would_strand', stranded: action };
  const next = clone(b);
  next[device][action].splice(slot, 1);
  return { ok: true, bindings: next, displaced: null };
}

/** Put one device's bindings back as they shipped, leaving the other alone. */
export function resetDevice(b: Bindings, device: Device): Bindings {
  return { ...clone(b), [device]: defaultBindings()[device] };
}

/** Which actions are down, given the inputs that are down. */
export function actionsDown(b: Bindings, down: ReadonlySet<Input>): Set<Action> {
  const out = new Set<Action>();
  for (const d of ['keyboard', 'pad'] as const) for (const a of ACTIONS) if (b[d][a].some((i) => down.has(i))) out.add(a);
  return out;
}

/**
 * Read saved bindings. Anything missing, unknown, duplicated, or broken falls back to the default for that action,
 * so a bad save can never leave the game unplayable: the reserved inputs always pause, and no essential action is empty.
 */
export function parseBindings(raw: unknown): Bindings {
  const def = defaultBindings();
  const out = defaultBindings();
  if (typeof raw !== 'object' || raw === null) return out;
  for (const d of ['keyboard', 'pad'] as const) {
    const saved = (raw as Record<string, unknown>)[d];
    if (typeof saved !== 'object' || saved === null) continue;
    const seen = new Set<Input>();
    for (const a of ACTIONS) {
      const list = (saved as Record<string, unknown>)[a];
      if (!Array.isArray(list)) continue;
      const good = list.filter((i): i is Input => typeof i === 'string' && /^(Key:\w+|Mouse:[0-4]|Wheel:(up|down)|Pad:(1[0-6]|\d))$/.test(i) && deviceOf(i) === d);
      out[d][a] = [];
      for (const i of good.slice(0, MAX_PER_ACTION)) {
        if (seen.has(i) || (i === RESERVED[d] && a !== 'pause')) continue;
        seen.add(i);
        out[d][a].push(i);
      }
    }
    if (!out[d].pause.includes(RESERVED[d])) out[d].pause = [RESERVED[d], ...out[d].pause].slice(0, MAX_PER_ACTION);
    for (const a of ESSENTIAL[d]) {
      if (out[d][a].length > 0) continue;
      // Give it back its default if that is free; if not, the whole device goes back to defaults.
      const free = def[d][a].filter((i) => !ACTIONS.some((o) => out[d][o].includes(i)));
      if (free.length) out[d][a] = [free[0]]; else { out[d] = def[d]; break; }
    }
  }
  return out;
}
