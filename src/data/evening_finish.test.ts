// Item 27: every line steps 4 to 6 can say is the writing's, by id; every prompt is interface.md's, from the bindings.
import { describe, expect, it } from 'vitest';
import evening from '../../docs/writing/first-evening.md?raw';
import hesper from '../../docs/writing/hesper.md?raw';
import interfaceMd from '../../docs/writing/interface.md?raw';
import { bramEveningLine, eveningPage, LESSON_LINE_COUNTS, LESSON_PROMPTS, lessonPrompt } from './evening';
import { defaultBindings, rebind, type Action, type Bindings } from '../core/settings/actions';
import { MAP_SITES } from './map_sites';

const re = (b: Bindings, a: Action, i: string): Bindings => { const r = rebind(b, 'keyboard', a, i); if (!r.ok) throw new Error(`rebind ${a}`); return r.bindings; };
describe('item 27 words', () => {
  it('her lines for the fence, the post, the lantern, the map and walking away are verbatim, by id', () => {
    expect(LESSON_LINE_COUNTS).toEqual({ fenceSeen: 3, postHit: 2, back: 2, lanternFirst: 3 });
    for (const [g, n] of [['evening.fence', 2], ['evening.fence.seen', 3], ['evening.fence.mark', 1], ['evening.fence.done', 1],
      ['evening.post', 1], ['evening.post.dodge', 1], ['evening.post.hit', 2], ['evening.post.lock', 1], ['evening.post.done', 1],
      ['evening.lantern', 1], ['evening.map', 1], ['evening.left', 1], ['evening.back', 2]] as const)
      for (let i = 0; i < n; i++) { const p = eveningPage(g, i); expect(p.id).toBe(`${g}.${i}`); expect(evening).toContain(`"${p.text}"`); }
    for (let i = 0; i < 3; i++) expect(hesper).toContain(`"${eveningPage('hesper.lantern.first', i).text}"`);
    expect(eveningPage('evening.map', 0).text).toMatch(/^Here's the valley/);
    expect(() => eveningPage('evening.post.hit', 2)).toThrow();
    for (const s of ['fence', 'post'] as const) expect(evening).toContain(`"${bramEveningLine(s)}"`);
    expect(bramEveningLine('fence')).not.toBe(bramEveningLine('post'));
  });
  it('prompts are interface.md first-time rows with the keys turned into actions', () => {
    expect(LESSON_PROMPTS).toEqual({
      crouch: '{crouch} to crouch. Crouched and still, you are hard to see.',
      mark: 'Hold {aim} to look closer. Keep it on someone to mark them.',
      blade: '{weaponBlade} for the blade.', dodge: '{dodge} to dodge.', lock: '{lockOn} to keep your eyes on one of them.', map: '{map} for the map.',
    });
    expect(interfaceMd).toContain('Hold the right mouse button to look closer. Keep it on someone to mark them.');
  });
  it('filled from the actual bindings, and changed when they are', () => {
    let b = defaultBindings();
    expect(lessonPrompt('crouch', b, 'keyboard')).toBe('C to crouch. Crouched and still, you are hard to see.');
    expect(lessonPrompt('mark', b, 'keyboard')).toBe('Hold the right mouse button to look closer. Keep it on someone to mark them.');
    expect(lessonPrompt('blade', b, 'keyboard')).toBe('1 for the blade.');
    expect(lessonPrompt('dodge', b, 'keyboard')).toBe('Space to dodge.');
    expect(lessonPrompt('lock', b, 'keyboard')).toBe('Tab to keep your eyes on one of them.');
    expect(lessonPrompt('map', b, 'keyboard')).toBe('M for the map.');
    b = re(re(re(re(re(re(b, 'crouch', 'Key:KeyZ'), 'dodge', 'Key:KeyG'), 'lockOn', 'Key:KeyL'), 'map', 'Key:KeyP'), 'weaponBlade', 'Key:KeyU'), 'aim', 'Key:KeyO');
    expect(lessonPrompt('crouch', b, 'keyboard')).toBe('Z to crouch. Crouched and still, you are hard to see.');
    expect(lessonPrompt('dodge', b, 'keyboard')).toBe('G to dodge.');
    expect(lessonPrompt('lock', b, 'keyboard')).toBe('L to keep your eyes on one of them.');
    expect(lessonPrompt('map', b, 'keyboard')).toBe('P for the map.');
    expect(lessonPrompt('blade', b, 'keyboard')).toBe('U for the blade.');
    expect(lessonPrompt('mark', b, 'keyboard')).toBe('Hold O to look closer. Keep it on someone to mark them.');
    expect(lessonPrompt('dodge', { ...b, keyboard: { ...b.keyboard, dodge: [] } }, 'keyboard')).toBeNull();
  });
  it('map sites are Wick and the three places, from the layout plan', () => {
    expect(MAP_SITES.map(s => s.id)).toEqual(['wick', 'mill', 'forge', 'watch_house']);
    expect(MAP_SITES.find(s => s.id === 'mill')).toMatchObject({ name: 'The Mill', x: -176, z: 50, kind: 'camp' });
  });
});
