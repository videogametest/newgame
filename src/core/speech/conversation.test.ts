import { describe, it, expect } from 'vitest';
import { Conversation, type ConversationPage } from './conversation';
const page = (id = 'one'): ConversationPage => ({ id, speaker: 'hesper', name: 'Hesper', text: 'Test line.' });
describe('non-modal conversation cursor', () => {
  it('is quiet with no content and refuses overlap', () => {
    const c = new Conversation(); expect(c.start([])).toBe(false); expect(c.interact()).toBeNull();
    expect(c.start([page()])).toBe(true); expect(c.start([page('other')])).toBe(false);
    expect(c.current?.id).toBe('one');
  });
  it('reveals then advances exactly once and records only entered lines', () => {
    const ids: string[] = []; const c = new Conversation(l => ids.push(l.id));
    c.start([page(), page('two')]); expect(ids).toEqual(['one']);
    c.interact(); expect(c.current?.id).toBe('one'); expect(c.revealed).toBe(10);
    c.interact(); expect(c.current?.id).toBe('two'); expect(ids).toEqual(['one', 'two']);
    c.reveal(1, Infinity); c.interact(); expect(c.current).toBeNull();
    c.interact(); expect(ids).toEqual(['one', 'two']);
  });
  it('honours elapsed text speed, instant text, zero/negative time and cancellation', () => {
    const c = new Conversation(); c.start([page()]); c.reveal(0, Infinity); c.reveal(-1, 5);
    expect(c.revealed).toBe(0); c.reveal(.5, 4); expect(c.revealed).toBe(2);
    c.reveal(1, Infinity); expect(c.revealed).toBe(10);
    c.stop(); expect(c.current).toBeNull(); expect(c.start([page()])).toBe(true);
  });
  it('supports zero to three authored answers, wraps selection and returns only the action id', () => {
    const c = new Conversation(); c.start([{ ...page(), answers: [
      { id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' },
    ] }]);
    c.select(-1); expect(c.selected).toBe(2); c.select(2); expect(c.selected).toBe(1);
    expect(c.interact()).toBeNull(); expect(c.interact()).toBe('b'); expect(c.current).toBeNull();
    expect(() => c.start([{ ...page(), answers: Array(4).fill({ id: 'a', text: 'A' }) }])).toThrow('three');
  });
  it('copies content rather than mutating its data source', () => {
    const p = page(); const c = new Conversation(); c.start([p]); p.text = 'Changed';
    expect(c.current?.text).toBe('Test line.');
  });
});
