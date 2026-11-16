import { describe, it, expect } from 'vitest';
import evening from '../../docs/writing/first-evening.md?raw';
import hesper from '../../docs/writing/hesper.md?raw';
import { YARD_MISS_COUNTS, YARD_PROMPTS, yardIntroPages, yardPage, yardPrompt } from './evening';
import { defaultBindings, rebind } from '../core/settings/actions';
import { yardSays, newYard, advanceYard } from '../core/tutorial/yard';

describe('item 26 yard words', () => {
  it('every line she can say in the yard is verbatim from the writing, by id', () => {
    const intro = yardIntroPages();
    expect(intro.map(p => p.id)).toEqual(['hesper.apprentice.0', 'hesper.apprentice.1', 'hesper.apprentice.2', 'evening.targets.0']);
    for (const p of intro) expect(hesper + evening).toContain(`"${p.text}"`);
    expect(YARD_MISS_COUNTS).toEqual({ targets: 3, far: 2 });
    for (const [g, n] of [['evening.targets.miss', 3], ['evening.far.miss', 2], ['evening.targets.done', 1], ['evening.far', 1],
      ['evening.far.done', 1], ['evening.arrows', 1], ['evening.arrows.done', 1]] as const)
      for (let i = 0; i < n; i++) { const p = yardPage(g, i); expect(p.id).toBe(`${g}.${i}`); expect(evening).toContain(`"${p.text}"`); }
    expect(yardPage('evening.targets.miss', 0).text).toBe('Again.');
    expect(() => yardPage('evening.far.miss', 2)).toThrow();
  });
  it('the lines the yard logic asks for all exist', () => {
    let s = advanceYard(newYard(), { type: 'yardOpened' });
    for (const e of [{ type: 'arrowMissed' }, { type: 'arrowHit', target: 'straw.0' }, { type: 'arrowHit', target: 'straw.1' },
      { type: 'arrowHit', target: 'straw.2' }, { type: 'arrowMissed' }, { type: 'arrowMissed' }, { type: 'arrowMissed' },
      { type: 'arrowHit', target: 'far' }, { type: 'arrowChanged', delta: 1 }] as const) {
      const n = advanceYard(s, e);
      for (const l of yardSays(s, n, YARD_MISS_COUNTS)) expect(() => yardPage(l.group, l.index)).not.toThrow();
      s = n;
    }
    expect(s.phase).toBe('done');
  });
  it('prompts come from interface.md and show what is bound', () => {
    expect(YARD_PROMPTS).toEqual({ bow: '{weaponBow} for the bow.', draw: 'Hold to draw. Let go to loose.', arrow: '{arrowNext} to change arrows.' });
    let b = defaultBindings();
    expect(yardPrompt('bow', b, 'keyboard')).toBe('2 for the bow.');
    expect(yardPrompt('arrow', b, 'keyboard')).toBe('Scroll to change arrows.');
    expect(yardPrompt('arrow', b, 'pad')).toBe('D-pad right to change arrows.');
    const r = rebind(b, 'keyboard', 'arrowNext', 'Key:KeyN'); if (!r.ok) throw new Error('rebind'); b = r.bindings;
    expect(yardPrompt('arrow', b, 'keyboard')).toBe('N to change arrows.');
    const r2 = rebind(b, 'keyboard', 'weaponBow', 'Key:KeyB'); if (!r2.ok) throw new Error('rebind'); b = r2.bindings;
    expect(yardPrompt('bow', b, 'keyboard')).toBe('B for the bow.');
    expect(yardPrompt('bow', { ...b, keyboard: { ...b.keyboard, weaponBow: [] } }, 'keyboard')).toBeNull();
    expect(yardPrompt('bow', b, 'pad')).toBeNull(); // the pad has no bow button by default; Switch weapon is not "for the bow"
  });
});
