import { expect, it } from 'vitest';
import { MILL_LANTERN, MILL_WINDOW_HOUSE, LANTERN_WORDS } from './mill_lantern';
import { landmarkPieces } from '../landmarks/plan';
import { blocksHero, VALLEY_SEED } from '../core/world/valley';
import { wickHouses } from '../village/plan';
it('uses the actual landmark lantern, with walkable interaction ground', () => {
  const p = landmarkPieces().find(p => p.site === 'mill' && p.role === 'lantern')!;
  expect(MILL_LANTERN).toEqual({ x: p.x, z: p.z }); expect(blocksHero(p.x, p.z)).toBe(false);
});
it('selects the nearest dark habitable house, the Marrins in the current plan', () => {
  const houses = wickHouses(VALLEY_SEED).filter(h => h.id !== 'fairlow' && h.state !== 'lit' && h.model !== 'destroyed');
  const distance = (h: { x: number; z: number }) => Math.hypot(h.x - MILL_LANTERN.x, h.z - MILL_LANTERN.z);
  const target = houses.find(h => h.id === MILL_WINDOW_HOUSE)!;
  expect(target.id).toBe('marrin'); expect(houses.every(h => distance(h) >= distance(target))).toBe(true);
});
it('uses the written prompt and freed caption', () => { expect(LANTERN_WORDS).toEqual({ prompt: 'Light the lantern.', freed: 'The Mill is free.' }); });
