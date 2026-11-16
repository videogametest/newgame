// The damaged-save line: shown first and alone after a save could not be read. It holds for six seconds of play
// or until a key is pressed, whichever comes first. Pure timing; the valley decides what the line says.
export const SAVE_NOTICE_SECONDS = 6;

export class SaveNotice {
  private left = 0;
  private startedAt = 0;

  /** Starts the notice at `now` (performance.now() time). Keys pressed before this moment do not dismiss it. */
  start(now: number): void {
    this.left = SAVE_NOTICE_SECONDS;
    this.startedAt = now;
  }

  /** Counts down only while play is allowed (the valley passes dt when it is). */
  tick(dt: number): void {
    this.left = Math.max(0, this.left - dt);
  }

  /** A key event ends the notice if it happened after the notice started (the key that chose New game does not count). */
  keyPressed(eventTime: number): boolean {
    if (!this.active || eventTime <= this.startedAt) return false;
    this.dismiss();
    return true;
  }

  dismiss(): void {
    this.left = 0;
  }

  get active(): boolean {
    return this.left > 0;
  }
}
