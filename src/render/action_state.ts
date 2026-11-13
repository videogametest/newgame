// What the player is doing, from the inputs that are down (task 009, step 1). Pure: no DOM, so the bindings are
// tested without a browser. input.ts feeds it; the game asks "is `dodge` down?", never which key is pressed.

import { ACTIONS, actionsDown, type Action, type Bindings, type Input } from '../core/settings/actions';

export class ActionState {
  private readonly down = new Set<Input>();
  /** Actions that were pressed since the last step (edges). */
  private readonly pressed = new Set<Action>();
  /** Actions that were let go since the last step (edges). */
  private readonly released = new Set<Action>();

  constructor(private bindings: Bindings) {}

  setBindings(bindings: Bindings): void {
    this.bindings = bindings;
  }

  /** The keyboard and mouse actions this input does. */
  actionsOn(input: Input): Action[] {
    return ACTIONS.filter((a) => this.bindings.keyboard[a].includes(input));
  }

  /** True when some action uses this input, so the browser's default for it must be cancelled. */
  isBound(input: Input): boolean {
    return this.actionsOn(input).length > 0;
  }

  /** An input went down. A repeat of a held input does nothing. Returns the actions it triggers. */
  press(input: Input): Action[] {
    if (this.down.has(input)) return [];
    this.down.add(input);
    const acts = this.actionsOn(input);
    for (const a of acts) this.pressed.add(a);
    return acts;
  }

  /** An input was let go. */
  release(input: Input): void {
    if (!this.down.delete(input)) return;
    for (const a of this.actionsOn(input)) this.released.add(a);
  }

  /** Forget a press that did not take effect, e.g. the click that only takes the pointer. */
  cancel(input: Input): void {
    this.down.delete(input);
    for (const a of this.actionsOn(input)) this.pressed.delete(a);
  }

  /** A wheel tick: pressed for one step, never held. Returns the actions it triggers. */
  tick(input: Input): Action[] {
    const acts = this.actionsOn(input);
    for (const a of acts) this.pressed.add(a);
    return acts;
  }

  /** True while any input bound to this action is down. */
  isDown(action: Action): boolean {
    return actionsDown(this.bindings, this.down).has(action);
  }

  /** Reads and clears a press edge. */
  takePressed(action: Action): boolean {
    return this.pressed.delete(action);
  }

  /** Reads and clears a release edge. */
  takeReleased(action: Action): boolean {
    return this.released.delete(action);
  }

  clearEdges(): void {
    this.pressed.clear();
    this.released.clear();
  }

  /** Everything forgotten: nothing held, no edges. Used when the pointer is released or the window loses focus. */
  clear(): void {
    this.down.clear();
    this.clearEdges();
  }
}
