import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PICTURE_AGAIN, PICTURE_BUTTON, PICTURE_TEXT, PICTURE_TITLE, PICTURE_VIEW, PICTURE_HOUR, promptDue } from './brightness_picture';

const WRITING = readFileSync(new URL('../../docs/writing/interface.md', import.meta.url), 'utf8');

describe('brightness picture copy', () => {
  it('uses the words in docs/writing/interface.md exactly', () => {
    for (const text of [PICTURE_TITLE, PICTURE_TEXT, PICTURE_BUTTON, PICTURE_AGAIN]) {
      expect(WRITING).toContain(`"${text}"`);
    }
  });

  it('shows Hesper’s yard at midnight', () => {
    expect(PICTURE_VIEW).toBe('hesper_door');
    expect(PICTURE_HOUR).toBe(0);
  });
});

describe('promptDue', () => {
  it('opens at first start and never again once brightness is set', () => {
    expect(promptDue({ brightnessSet: false })).toBe(true);
    expect(promptDue({ brightnessSet: true })).toBe(false);
  });
});
