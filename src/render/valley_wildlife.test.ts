import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NullEngine, Scene } from '@babylonjs/core';
import { ValleyWildlife } from './valley_wildlife';
import { FLOCKS, FOX_START, GEESE_PEN } from '../data/wildlife';

describe('valley wildlife integration', () => {
  let engine: NullEngine;
  let scene: Scene;
  let wildlife: ValleyWildlife;
  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
    wildlife = new ValleyWildlife(scene);
  });
  afterEach(() => { scene.dispose(); engine.dispose(); });
  const frame = { dt: 0.1, hero: { x: 226, z: 238 }, movement: 'still' as const, heldPlaces: ['mill', 'forge', 'watch_house'] };
  it('circles every held site and hides only a freed site', () => {
    wildlife.update(frame);
    expect(wildlife.snapshot().crows.filter(c => c.shown)).toHaveLength(12);
    wildlife.update({ ...frame, heldPlaces: ['forge', 'watch_house'] });
    expect(wildlife.snapshot().crows.filter(c => c.shown)).toHaveLength(8);
    expect(wildlife.snapshot().crows.filter(c => c.name.startsWith('crow_mill')).every(c => !c.shown)).toBe(true);
  });
  it('walkers leave birds grounded; a sprint lifts them and leaving resets them', () => {
    const hero = FLOCKS[0].position;
    wildlife.update({ ...frame, hero, movement: 'walking' });
    expect(wildlife.snapshot().flocks[0].startled).toBe(false);
    wildlife.update({ ...frame, hero, movement: 'sprinting' });
    wildlife.update({ ...frame, hero, dt: 1 });
    expect(wildlife.snapshot().flocks[0]).toMatchObject({ startled: true, lifted: 1 });
    expect(scene.meshes.filter(m => m.name === 'bird').some(m => m.position.y > 1)).toBe(true);
    wildlife.update({ ...frame, hero: { x: -300, z: -300 } });
    expect(wildlife.snapshot().flocks[0].startled).toBe(false);
  });
  it('geese react to running but not creeping', () => {
    wildlife.update({ ...frame, hero: GEESE_PEN, movement: 'crouched' });
    expect(wildlife.snapshot().geeseHonking).toBe(false);
    wildlife.update({ ...frame, hero: GEESE_PEN, movement: 'sprinting' });
    expect(wildlife.snapshot().geeseHonking).toBe(true);
  });
  it('the fox leads quietly, vanishes on sprint and returns only after departure', () => {
    wildlife.update({ ...frame, hero: FOX_START, movement: 'crouched' });
    expect(wildlife.snapshot().fox.mode).toBe('leading');
    wildlife.update({ ...frame, hero: FOX_START, movement: 'sprinting' });
    expect(wildlife.snapshot().fox.mode).toBe('gone');
    expect(scene.getMeshByName('fox')!.isEnabled()).toBe(false);
    wildlife.update(frame);
    expect(wildlife.snapshot().fox.mode).toBe('idle');
  });
});
