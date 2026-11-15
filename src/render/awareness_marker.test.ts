import { describe, expect, it } from 'vitest';
import { awarenessMarker } from './awareness_marker';
describe('awareness marker presentation', () => {
  it('distinguishes all three states by shape as well as colour', () => {
    const states = ['unaware', 'suspicious', 'alert'] as const;
    const markers = states.map(s => awarenessMarker(s, true, true)!);
    expect(markers.map(m => m.label)).toEqual(states);
    expect(new Set(markers.map(m => m.symbol)).size).toBe(3);
    expect(new Set(markers.map(m => m.colour)).size).toBe(3);
  });
  it('hides untracked, dead and disabled markers', () => {
    expect(awarenessMarker(undefined, true, true)).toBeNull();
    expect(awarenessMarker('alert', false, true)).toBeNull();
    expect(awarenessMarker('alert', true, false)).toBeNull();
  });
});
