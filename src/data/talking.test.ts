import { describe, it, expect } from 'vitest';
import hesper from '../../docs/writing/hesper.md?raw';
import evening from '../../docs/writing/first-evening.md?raw';
import { conversationPages, HESPER, writtenAnswers } from './talking';
import { blocksHero, insideValley, walkSurfaceAt } from '../core/world/valley';
import { UNITS } from './units';
describe('item 24 authored speech', () => {
  it('gets all three arrival lines verbatim by id, and invents no hero answer', () => {
    const pages = conversationPages({ source: 'hesper', group: HESPER.group }, HESPER.id, HESPER.name);
    expect(pages).toHaveLength(3);
    pages.forEach((p, i) => {
      expect(hesper).toContain(`"${p.text}"`); expect(p.id).toBe(`hesper.arrival.${i}`);
      expect(p.speaker).toBe('hesper'); expect(p.name).toBe('Hesper'); expect(p.answers).toBeUndefined();
    });
  });
  it('has no words for missing ids; leaves stage directions out', () => {
    expect(conversationPages({ source: 'hesper', group: 'absent' }, 'hesper', 'Hesper')).toEqual([]);
    expect(conversationPages({ source: 'hesper', group: 'hesper.lantern.first' }, 'hesper', 'Hesper')).toHaveLength(3);
  });
  it('optional tutorial answers resolve from writing, not a second copy', () => {
    const answers = writtenAnswers({ source: 'evening', group: 'evening.choice' });
    expect(answers).toHaveLength(2); for (const a of answers) expect(evening).toContain(`"${a.text}"`);
    expect(() => writtenAnswers({ source: 'hesper', group: 'hesper.show' })).toThrow('three');
  });
  it('places Hesper on usable ground outside the actual cottage, in the room-standard model', () => {
    expect(insideValley(HESPER.x, HESPER.z)).toBe(true); expect(blocksHero(HESPER.x, HESPER.z)).toBe(false);
    expect(Number.isFinite(walkSurfaceAt(HESPER.x, HESPER.z))).toBe(true);
    expect(UNITS.hesper.model).toContain('Rogue_Hooded'); expect(UNITS.hesper.weapons).toEqual([]);
  });
});
