// Review 026 item 1: the landmarks' buildings, walls and tents are solid; the Watch-house gate doors stay open.
import { describe, expect, it } from 'vitest';
import { landmarkPieces, landmarkSolids } from '../../landmarks/plan';
import { WICK_SOLIDS, blocksHero, valleySolids } from './valley';

describe('landmarks are solid', () => {
  it('every landmark solid blocks the hero at its centre', () => {
    const solids = landmarkSolids();
    expect(solids.length).toBeGreaterThan(25);
    for (const s of solids) {
      expect(blocksHero(s.x, s.z), `${s.site} solid at (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`).toBe(true);
    }
  });

  it('the valley solids are Wick’s, then one footprint per landmark solid', () => {
    expect(valleySolids().length).toBe(WICK_SOLIDS.length + landmarkSolids().length);
  });

  it('the Watch-house gate doors do not block the hero', () => {
    const gates = landmarkPieces().filter((p) => p.role === 'gate_door');
    expect(gates.length).toBeGreaterThanOrEqual(2);
    for (const g of gates) expect(blocksHero(g.x, g.z), `gate at (${g.x}, ${g.z})`).toBe(false);
  });
});
