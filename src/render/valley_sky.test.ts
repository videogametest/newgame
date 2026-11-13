// Star quads for the valley sky: every star is a valid triangle pair on the sky dome.
import { describe, expect, it } from 'vitest';
import { starLook, starQuads } from './valley_sky';

describe('star quads', () => {
  const count = 420;
  const { positions, indices } = starQuads(count);

  it('has four vertices and two triangles per star', () => {
    expect(positions.length).toBe(count * 4 * 3);
    expect(indices.length).toBe(count * 6);
  });

  it('every index points at a vertex of its own star', () => {
    const vertexCount = positions.length / 3;
    for (let i = 0; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThanOrEqual(0);
      expect(indices[i]).toBeLessThan(vertexCount);
    }
    for (let s = 0; s < count; s++) {
      const slice = indices.slice(s * 6, s * 6 + 6);
      const lo = Math.min(...slice);
      expect(Math.max(...slice) - lo).toBeLessThanOrEqual(3);
    }
  });

  it('every star sits above the horizon and on the sky dome', () => {
    for (let s = 0; s < count; s++) {
      for (let c = 0; c < 4; c++) {
        const k = (s * 4 + c) * 3;
        const x = positions[k];
        const y = positions[k + 1];
        const z = positions[k + 2];
        expect(Math.hypot(x, y, z)).toBeGreaterThan(600);
        expect(Math.hypot(x, y, z)).toBeLessThan(720);
        expect(y).toBeGreaterThan(0);
      }
    }
  });
});

describe('stars are round points of varied brightness (review 018 item 7)', () => {
  const count = 420;
  const d = starQuads(count);
  it('every star carries corner coordinates for the round point, and one brightness on all four corners', () => {
    expect(d.uvs.length).toBe(count * 8);
    expect(d.colors.length).toBe(count * 16);
    for (let s = 0; s < count; s++) {
      expect(d.uvs.slice(s * 8, s * 8 + 8)).toEqual([1, 1, 0, 1, 0, 0, 1, 0]);
      const a = [0, 1, 2, 3].map((c) => d.colors[(s * 4 + c) * 4 + 3]);
      expect(new Set(a).size).toBe(1);
      expect(a[0]).toBeCloseTo(starLook(s).brightness, 9);
    }
  });
  it('most stars are faint and a few are bright, and brighter stars are larger', () => {
    const looks = Array.from({ length: count }, (_, i) => starLook(i));
    const bright = looks.filter((l) => l.brightness > 0.8).length, faint = looks.filter((l) => l.brightness < 0.5).length;
    expect(bright).toBeGreaterThan(5);
    expect(bright).toBeLessThan(count * 0.2);
    expect(faint).toBeGreaterThan(count * 0.5);
    const sorted = [...looks].sort((a, b) => a.brightness - b.brightness);
    expect(sorted[sorted.length - 1].half).toBeGreaterThan(sorted[0].half);
  });
});
