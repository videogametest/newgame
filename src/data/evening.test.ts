import { describe, it, expect } from 'vitest';
import evening from '../../docs/writing/first-evening.md?raw';
import screen from '../../docs/writing/interface.md?raw';
import { EVENING_OPEN, EVENING_CHOICE, ROAD_PROMPTS, eveningSkipPages, roadPrompt } from './evening';
import { defaultBindings, rebind } from '../core/settings/actions';
describe('item 25 first-evening words', () => {
  it('opening, choice and skip are verbatim from first-evening.md', () => {
    expect(evening).toContain(`"${EVENING_OPEN}"`);
    expect(EVENING_CHOICE.map(a => a.id)).toEqual(['evening.choice.0', 'evening.choice.1']);
    for (const a of EVENING_CHOICE) expect(evening).toContain(`"${a.text}"`);
    const skip = eveningSkipPages(); expect(skip).toHaveLength(1);
    expect(evening).toContain(`"${skip[0].text}"`); expect(skip[0]).toMatchObject({ id: 'evening.skip.0', speaker: 'hesper', name: 'Hesper' });
  });
  it('road prompts come from interface.md as action templates', () => {
    expect(ROAD_PROMPTS.move).toBe('{moveForward} {moveLeft} {moveBack} {moveRight} to walk.');
    expect(ROAD_PROMPTS.look).toBe('Move the mouse to look.');
    expect(ROAD_PROMPTS.sprint).toBe('Hold {sprint} to run.');
    expect(screen).toContain('Move the mouse to look.');
  });
  it('prompts show the actual bindings, and drop unbound actions', () => {
    let b = defaultBindings();
    expect(roadPrompt('move', b, 'keyboard')).toBe('W A S D to walk.');
    expect(roadPrompt('sprint', b, 'keyboard')).toBe('Hold Left Shift to run.');
    const r = rebind(b, 'keyboard', 'sprint', 'Key:KeyL'); if (!r.ok) throw new Error('rebind'); b = r.bindings;
    expect(roadPrompt('sprint', b, 'keyboard')).toBe('Hold L to run.');
    const u = { ...b, keyboard: { ...b.keyboard, sprint: [] } };
    expect(roadPrompt('sprint', u, 'keyboard')).toBeNull();
  });
});
