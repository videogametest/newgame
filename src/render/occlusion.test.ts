import { describe, expect, it } from 'vitest';
import { blocksView, type Body } from './occlusion';

// Camera 4.6 m behind the hero, looking along +z. The hero stands at the origin.
const cam = { x: 0, y: 1.5, z: -4.6 };
const hero = { x: 0, z: 0 };
const body = (x: number, z: number): Body => ({ x, z, radius: 0.45, height: 1.8 });

describe('blocksView', () => {
  it('fades a fighter standing on the line between the camera and the hero', () => {
    expect(blocksView(cam, hero, body(0, -2))).toBe(true);
  });

  it('fades a fighter that only clips the edge of that line', () => {
    expect(blocksView(cam, hero, body(0.6, -2))).toBe(true);
  });

  it('keeps a fighter well to the side of the line solid', () => {
    expect(blocksView(cam, hero, body(1.5, -2))).toBe(false);
  });

  it('keeps a fighter behind the hero solid', () => {
    expect(blocksView(cam, hero, body(0, 2))).toBe(false);
  });

  it('keeps a fighter in front of the hero, away from the camera line, solid', () => {
    expect(blocksView(cam, hero, body(0, 0.9))).toBe(false);
  });

  it('fades a fighter within 1.5 m of the camera even off the line', () => {
    expect(blocksView(cam, hero, body(0.9, -4.0))).toBe(true);
  });

  it('keeps a fighter beside the camera, outside 1.5 m, solid', () => {
    expect(blocksView(cam, hero, body(2.2, -4.6))).toBe(false);
  });
});
