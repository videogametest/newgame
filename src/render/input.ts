// Keyboard and mouse to BattleInput. The game asks for actions (dodge, attack, sprint), never for keys: the key
// that does each one comes from the player's bindings (task 009). Edge flags are handed to exactly one sim step.

import { TUNING } from '../config/tuning';
import type { Action } from '../core/settings/actions';
import type { BattleInput, WeaponId } from '../core/types';
import { clamp } from '../core/vec';
import { ActionState } from './action_state';
import { hasModifier, isSuppressedKey, isSuppressedMouseButton } from './input_rules';
import { currentSettings } from './settings_store';

export class PlayerInput {
  camYaw = 0;
  aimPitch = 0;
  weapon: WeaponId = 'sword';
  private readonly actions = new ActionState(currentSettings().bindings);
  private locked = false;
  private windowFocused = document.hasFocus();
  private readonly listeners: [EventTarget, string, (e: Event) => void, AddEventListenerOptions?][] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onLockChange: (locked: boolean) => void,
  ) {
    this.on(window, 'keydown', (e) => this.onKeyDown(e as KeyboardEvent));
    this.on(window, 'keyup', (e) => this.actions.release(`Key:${(e as KeyboardEvent).code}`));
    this.on(window, 'blur', () => {
      this.windowFocused = false;
      this.clearHeld();
    });
    this.on(window, 'focus', () => {
      this.windowFocused = true;
    });
    this.on(canvas, 'mousedown', (e) => this.onMouseDown(e as MouseEvent));
    this.on(window, 'mouseup', (e) => this.actions.release(`Mouse:${(e as MouseEvent).button}`));
    // Right and middle mouse defaults (context menu, autoscroll) are cancelled across the whole page.
    this.on(window, 'mousedown', (e) => {
      if (isSuppressedMouseButton((e as MouseEvent).button)) e.preventDefault();
    });
    this.on(window, 'contextmenu', (e) => e.preventDefault());
    // The wheel scrolls the page unless cancelled, so it needs a non-passive listener.
    this.on(
      window,
      'wheel',
      (e) => {
        e.preventDefault();
        const dy = (e as WheelEvent).deltaY;
        if (dy !== 0) this.actions.tick(dy > 0 ? 'Wheel:down' : 'Wheel:up');
      },
      { passive: false },
    );
    this.on(document, 'mousemove', (e) => this.onMouseMove(e as MouseEvent));
    this.on(document, 'pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.clearHeld();
      this.onLockChange(this.locked);
    });
  }

  private on(target: EventTarget, type: string, fn: (e: Event) => void, options?: AddEventListenerOptions): void {
    target.addEventListener(type, fn, options);
    this.listeners.push([target, type, fn, options]);
  }

  get isLocked(): boolean {
    return this.locked;
  }

  /** False while the browser window is in the background; the sim pauses then. */
  get isWindowFocused(): boolean {
    return this.windowFocused;
  }

  /** True while an input bound to this action is held. */
  isDown(action: Action): boolean {
    return this.actions.isDown(action);
  }

  /** True while the bow is equipped and the zoom action is held. */
  get isZooming(): boolean {
    return this.actions.isDown('aim') && this.weapon === 'bow';
  }

  /** True once for each press of the pause key. Read before takeInput, which clears the edges. */
  takePause(): boolean {
    return this.actions.takePressed('pause');
  }

  /** Builds this step's input and consumes the edge flags. */
  takeInput(): BattleInput {
    const a = this.actions;
    const input: BattleInput = {
      moveX: axis(a.isDown('moveRight'), a.isDown('moveLeft')),
      moveZ: axis(a.isDown('moveForward'), a.isDown('moveBack')),
      camYaw: this.camYaw,
      aimPitch: this.aimPitch,
      sprint: a.isDown('sprint'),
      weapon: this.weapon,
      attackPressed: a.takePressed('attack'),
      attackHeld: a.isDown('attack'),
      attackReleased: a.takeReleased('attack'),
      dodgePressed: a.takePressed('dodge'),
    };
    a.clearEdges();
    return input;
  }

  /** Drops any queued edges, e.g. while the battle is over. */
  consumeEdges(): void {
    this.actions.clearEdges();
  }

  reset(): void {
    this.camYaw = 0;
    this.aimPitch = 0;
    this.weapon = 'sword';
    this.clearHeld();
  }

  requestLock(): void {
    this.canvas.requestPointerLock();
  }

  releaseLock(): void {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  private clearHeld(): void {
    this.actions.clear();
  }

  private onKeyDown(e: KeyboardEvent): void {
    const input = `Key:${e.code}`;
    if (isSuppressedKey(e.code) || this.actions.isBound(input)) e.preventDefault();
    // Ctrl, Alt and Cmd chords belong to the browser or OS; they never reach the game.
    if (hasModifier(e)) return;
    if (e.repeat) return;
    this.applyPress(this.actions.press(input));
  }

  private onMouseDown(e: MouseEvent): void {
    const input = `Mouse:${e.button}`;
    const acts = this.actions.press(input);
    // A click on the view first takes the pointer; the attack it would make is not played.
    if (!this.locked && acts.includes('attack')) {
      this.actions.cancel(input);
      this.requestLock();
      return;
    }
    this.applyPress(acts);
  }

  /** Weapon choice takes effect at once, even while the sim is paused. Other actions wait for the sim step. */
  private applyPress(acts: Action[]): void {
    for (const a of acts) {
      if (a === 'weaponBlade') this.weapon = 'sword';
      if (a === 'weaponBow') this.weapon = 'bow';
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.locked) return;
    const s = TUNING.camera.mouseSensitivity;
    this.camYaw += e.movementX * s;
    this.aimPitch = clamp(this.aimPitch - e.movementY * s, TUNING.camera.pitchMin, TUNING.camera.pitchMax);
  }

  dispose(): void {
    for (const [t, type, fn, options] of this.listeners) t.removeEventListener(type, fn, options);
    this.listeners.length = 0;
  }
}

function axis(plus: boolean, minus: boolean): -1 | 0 | 1 {
  if (plus === minus) return 0;
  return plus ? 1 : -1;
}
