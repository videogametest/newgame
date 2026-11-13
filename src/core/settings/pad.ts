// Reading a controller (GAME_DESIGN.md section 5, "On a controller"). Claude's. Pure: takes the numbers the
// browser reports for a standard-layout pad and gives back what the game needs. Any Bluetooth or wired controller
// the browser lists with the standard mapping works; others can be bound by hand.
import type { Input } from './actions';

export interface PadSnapshot {
  /** Left stick x, y, right stick x, y: each -1 to 1, y positive downward, as the browser gives them. */
  axes: readonly number[];
  /** Each button's value, 0 to 1. Triggers are analogue. */
  buttons: readonly number[];
}

export interface StickOptions {
  /** Inside this, a stick reads as centred. 0 to 0.5. */
  deadzone: number;
  /** Look speed on the right stick, 0.2 to 3. */
  lookSensitivity: number;
  invertY: boolean;
  /** Swap the sticks: the right one moves and the left one looks. */
  southpaw: boolean;
}

export const PAD_TUNING = {
  /** A trigger or button counts as pressed past this. */
  press: 0.5,
  /** Look speed at full tilt, radians a second, before sensitivity. */
  lookRate: 2.6,
  /** The stick's response is curved by this power, so small tilts aim finely. */
  curve: 1.8,
  /** Moving the left stick this far is a run; less is a walk. */
  runAt: 0.75,
} as const;

/** A stick with a round dead zone, rescaled so it still reaches 1, and curved. */
export function stick(x: number, y: number, deadzone: number, curve = 1): { x: number; y: number; size: number } {
  const size = Math.hypot(x, y);
  const dz = Math.min(0.5, Math.max(0, deadzone));
  if (!Number.isFinite(size) || size <= dz) return { x: 0, y: 0, size: 0 };
  const out = Math.min(1, (size - dz) / (1 - dz)) ** curve;
  return { x: (x / size) * out, y: (y / size) * out, size: out };
}

export interface PadRead {
  /** Movement, -1 to 1 on each axis: x right, y forward. */
  move: { x: number; y: number };
  /** Whether the tilt is far enough to run. */
  run: boolean;
  /** Look, in radians a second: yaw right and pitch up are positive. */
  look: { yaw: number; pitch: number };
  /** The buttons that are down, as inputs for the bindings. */
  down: Set<Input>;
  /** How far the draw trigger is pulled, 0 to 1. */
  draw: number;
  /** Whether anything on the pad is being touched: used to tell which device the player is on. */
  active: boolean;
}

export function readPad(p: PadSnapshot, o: StickOptions, t = PAD_TUNING): PadRead {
  const ax = (i: number) => (Number.isFinite(p.axes[i]) ? p.axes[i] : 0);
  const [mx, my, lx, ly] = o.southpaw ? [ax(2), ax(3), ax(0), ax(1)] : [ax(0), ax(1), ax(2), ax(3)];
  const m = stick(mx, my, o.deadzone);
  const l = stick(lx, ly, o.deadzone, t.curve);
  const down = new Set<Input>();
  p.buttons.forEach((v, i) => { if (v >= t.press) down.add(`Pad:${i}`); });
  const rate = t.lookRate * Math.min(3, Math.max(0.2, o.lookSensitivity));
  return {
    move: { x: m.x, y: -m.y },
    run: m.size >= t.runAt,
    look: { yaw: l.x * rate, pitch: -l.y * rate * (o.invertY ? -1 : 1) },
    down,
    draw: Math.min(1, Math.max(0, p.buttons[7] ?? 0)),
    active: m.size > 0 || l.size > 0 || down.size > 0,
  };
}

/** Which device the player is on: whichever they touched last. Prompts follow it at once, in both directions. */
export function deviceInUse(current: 'keyboard' | 'pad', keyboardTouched: boolean, padActive: boolean): 'keyboard' | 'pad' {
  if (keyboardTouched) return 'keyboard';
  if (padActive) return 'pad';
  return current;
}

// ---------- Aim assist ----------

export const AIM_ASSIST = {
  /** Within this angle of a target (radians), the look slows. */
  slowWithin: 0.14,
  /** How much it slows at the centre, at full strength: the look runs at this share of its speed. */
  slowTo: 0.45,
  /** How fast the aim is drawn toward a target the player is already moving toward, radians a second at full strength. */
  pull: 0.5,
} as const;

/**
 * Aim assist, for a stick only and only while aiming the bow. It slows the look as the crosshair nears a target
 * and leans toward one the player is already steering at. It never moves the aim on its own, never bends an
 * arrow, and never picks a target the player is steering away from. `strength` is 0 (off) to 1.
 * `target` is the nearest target's offset from the crosshair in radians, or null if none is in view.
 */
export function aimAssist(look: { yaw: number; pitch: number }, target: { yaw: number; pitch: number } | null, strength: number, t = AIM_ASSIST): { yaw: number; pitch: number } {
  const s = Math.min(1, Math.max(0, strength));
  if (!target || s === 0) return look;
  const speed = Math.hypot(look.yaw, look.pitch);
  if (speed === 0) return look;
  const off = Math.hypot(target.yaw, target.pitch);
  if (off >= t.slowWithin) return look;
  const near = 1 - off / t.slowWithin;
  const slow = 1 - (1 - t.slowTo) * near * s;
  let yaw = look.yaw * slow, pitch = look.pitch * slow;
  // Lean toward the target only if the stick is already heading that way.
  const toward = off > 0 ? (look.yaw * target.yaw + look.pitch * target.pitch) / (speed * off) : 0;
  if (toward > 0) { yaw += (target.yaw / off) * t.pull * s * near * toward; pitch += (target.pitch / off) * t.pull * s * near * toward; }
  return { yaw, pitch };
}
