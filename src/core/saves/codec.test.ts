import { describe, expect, it } from 'vitest';
import { checkedState, decodeSave, encodeSave } from './codec';
import { newGameState } from '../state';
import { populatedGame } from './fixture';
import { SAVE_VERSION } from '../types';

describe('versioned save boundary', () => {
  it('round-trips the complete populated GameState, including lit places and speech', () => {
    const g = populatedGame(); expect(decodeSave(encodeSave(g), 1066)).toEqual({ state: g, status: 'loaded' });
  });
  it('new game and missing save are distinct from a damaged save', () => {
    expect(decodeSave(null, 3)).toEqual({ state: newGameState(3), status: 'new' });
    for (const text of ['', '{', 'null', '[]', '42', '{}', '{"version":999,"seed":1}'])
      expect(decodeSave(text, 3)).toEqual({ state: newGameState(3), status: 'damaged' });
  });
  it('rejects invalid nested shapes, not just broken JSON', () => {
    const mutations = [
      (g: any) => g.hero = null, (g: any) => g.hero.position.x = null, (g: any) => g.hero.hp = -1,
      (g: any) => g.hero.hp = 1000, (g: any) => g.timeOfDay = 24, (g: any) => g.day = 1.5,
      (g: any) => g.places[0].status = 'lit', (g: any) => g.places.pop(), (g: any) => g.places.push(g.places[0]),
      (g: any) => g.inventory.carried = [null], (g: any) => g.progression.skills.archery = {},
      (g: any) => g.speech.lines = [], (g: any) => g.speech.lines.x = 'yesterday',
      (g: any) => g.notes[0].speakers = null, (g: any) => g.bandits.x = 'nope',
      (g: any) => g.watch = null, (g: any) => g.stories = {}, (g: any) => delete g.heardLines,
      (g: any) => g.quiver.arrows.blunt = -1, (g: any) => g.company[0].travelling = 'yes',
    ];
    for (const mutate of mutations) { const g = populatedGame(); mutate(g); expect(decodeSave(JSON.stringify(g), 2).status).toBe('damaged'); }
  });
  it('refuses nonfinite numbers and invalid state before overwriting a good save', () => {
    const g = populatedGame(); g.hero.hp = NaN; expect(checkedState(g)).toBeNull(); expect(() => encodeSave(g)).toThrow();
    g.hero.hp = Infinity; expect(() => encodeSave(g)).toThrow();
  });
  it('migrates version 1 crowns/items and version 2 speech defaults', () => {
    const v1 = { version: 1, seed: 9, hero: { gold: 85, position: { x: 3, z: 4 }, hp: 60 } };
    const a = decodeSave(JSON.stringify(v1), 9); expect(a.status).toBe('loaded'); expect(a.state.purse.carried).toBe(85);
    const v2: any = populatedGame(); v2.version = 2; delete v2.notes; delete v2.speech; delete v2.watch;
    const b = decodeSave(JSON.stringify(v2), 9); expect(b.status).toBe('loaded'); expect(b.state.version).toBe(SAVE_VERSION);
    expect(b.state.notes).toEqual([]); expect(b.state.inventory).toEqual(v2.inventory);
  });
  it('settings and generated scenery are not serialized', () => {
    const g = Object.assign(populatedGame(), { settings: { brightness: 0 }, terrain: [1, 2] });
    expect(JSON.parse(encodeSave(g))).not.toHaveProperty('settings'); expect(JSON.parse(encodeSave(g))).not.toHaveProperty('terrain');
  });
});
