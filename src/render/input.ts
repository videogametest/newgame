// Keyboard and mouse to BattleInput. Edge flags (pressed, released, dodge) are handed to exactly one sim step.

import { TUNING } from '../config/tuning';
import type { BattleInput, WeaponId } from '../core/types';
import { clamp } from '../core/vec';

export class PlayerInput {
  camYaw = 0;
  aimPitch = 0;
  weapon: WeaponId = 'sword';
  private readonly keys = new Set<string>();
  private attackHeld = false;
  private rmbHeld = false;
  private pendingAttack = false;
  private pendingRelease = false;
  private pendingDodge = false;
  private locked = false;
  private readonly listeners: [EventTarget, string, (e: Event) => void][] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onLockChange: (locked: boolean) => void,
  ) {
    this.on(window, 'keydown', (e) => this.onKeyDown(e as KeyboardEvent));
    this.on(window, 'keyup', (e) => this.keys.delete((e as KeyboardEvent).code));
    this.on(window, 'blur', () => this.clearHeld());
    this.on(canvas, 'mousedown', (e) => this.onMouseDown(e as MouseEvent));
    this.on(window, 'mouseup', (e) => this.onMouseUp(e as MouseEvent));
    this.on(canvas, 'contextmenu', (e) => e.preventDefault());
    this.on(document, 'mousemove', (e) => this.onMouseMove(e as MouseEvent));
    this.on(document, 'pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.clearHeld();
      this.onLockChange(this.locked);
    });
  }

  private on(target: EventTarget, type: string, fn: (e: Event) => void): void {
    target.addEventListener(type, fn);
    this.listeners.push([target, type, fn]);
  }

  get isLocked(): boolean {
    return this.locked;
  }

  /** True while the key with this KeyboardEvent.code is held. */
  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** True while the bow is equipped and the right button is held. */
  get isZooming(): boolean {
    return this.rmbHeld && this.weapon === 'bow';
  }

  /** Builds this step's input and consumes the edge flags. */
  takeInput(sprint: boolean): BattleInput {
    const input: BattleInput = {
      moveX: axis(this.keys.has('KeyD'), this.keys.has('KeyA')),
      moveZ: axis(this.keys.has('KeyW'), this.keys.has('KeyS')),
      camYaw: this.camYaw,
      aimPitch: this.aimPitch,
      sprint,
      weapon: this.weapon,
      attackPressed: this.pendingAttack,
      attackHeld: this.attackHeld,
      attackReleased: this.pendingRelease,
      dodgePressed: this.pendingDodge,
    };
    this.pendingAttack = false;
    this.pendingRelease = false;
    this.pendingDodge = false;
    return input;
  }

  /** Drops any queued edges, e.g. while the battle is over. */
  consumeEdges(): void {
    this.pendingAttack = false;
    this.pendingRelease = false;
    this.pendingDodge = false;
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
    this.keys.clear();
    this.attackHeld = false;
    this.rmbHeld = false;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === 'Space') this.pendingDodge = true;
    if (e.code === 'Digit1') this.weapon = 'sword';
    if (e.code === 'Digit2') this.weapon = 'bow';
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 2) {
      this.rmbHeld = true;
      return;
    }
    if (e.button !== 0) return;
    if (!this.locked) {
      this.requestLock();
      return;
    }
    this.attackHeld = true;
    this.pendingAttack = true;
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 2) this.rmbHeld = false;
    if (e.button === 0 && this.attackHeld) {
      this.attackHeld = false;
      this.pendingRelease = true;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.locked) return;
    const s = TUNING.camera.mouseSensitivity;
    this.camYaw += e.movementX * s;
    this.aimPitch = clamp(this.aimPitch - e.movementY * s, TUNING.camera.pitchMin, TUNING.camera.pitchMax);
  }

  dispose(): void {
    for (const [t, type, fn] of this.listeners) t.removeEventListener(type, fn);
    this.listeners.length = 0;
  }
}

function axis(plus: boolean, minus: boolean): -1 | 0 | 1 {
  if (plus === minus) return 0;
  return plus ? 1 : -1;
}
