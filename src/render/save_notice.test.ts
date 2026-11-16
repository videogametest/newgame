import { describe, expect, it } from 'vitest';
import { SAVE_NOTICE_SECONDS, SaveNotice } from './save_notice';

describe('SaveNotice', () => {
  it('holds for six seconds of allowed play, then lets go', () => {
    const n = new SaveNotice();
    n.start(1000);
    expect(SAVE_NOTICE_SECONDS).toBe(6);
    n.tick(5.9);
    expect(n.active).toBe(true);
    n.tick(0.2);
    expect(n.active).toBe(false);
  });

  it('is dismissed by a key pressed after it started', () => {
    const n = new SaveNotice();
    n.start(1000);
    n.tick(1);
    expect(n.keyPressed(1500)).toBe(true);
    expect(n.active).toBe(false);
  });

  it('ignores the key that chose New game (pressed before it started)', () => {
    const n = new SaveNotice();
    n.start(1000);
    expect(n.keyPressed(990)).toBe(false);
    expect(n.keyPressed(1000)).toBe(false);
    expect(n.active).toBe(true);
  });

  it('does nothing to keys once it has ended', () => {
    const n = new SaveNotice();
    n.start(1000);
    n.tick(6);
    expect(n.keyPressed(2000)).toBe(false);
  });

  it('does not count down when no time passes', () => {
    const n = new SaveNotice();
    n.start(0);
    n.tick(0);
    expect(n.active).toBe(true);
  });
});
