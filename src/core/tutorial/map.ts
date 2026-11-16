// The map (GAME_DESIGN.md section 4, "Map"): the region as drawn, the hero, the places found and which are freed.
// No marker for anything the player has not found. Pure: no engine, DOM or storage. The first one the player sees is
// the one Hesper opens on the first evening (task 010 step 6), pointing to the nearest held place.
import type { GameState, Vec2 } from '../types';

export interface MapSite { id: string; name: string; x: number; z: number; kind: 'village' | 'camp' }
export interface MapEntry extends MapSite { status: 'home' | 'held' | 'cleared' | 'freed' }
export interface MapView { hero: Vec2; entries: MapEntry[]; pointed: string | null; extent: number }

/**
 * Which sites the map shows. A camp only once its id is in `discoveredPlaces`. Wick is where the evening is spent: it
 * is on the map once the hero has reached Hesper's door (any lesson step past the road), or if it was discovered.
 */
export function mapEntries(game: Pick<GameState, 'discoveredPlaces' | 'places' | 'tutorial'>, sites: readonly MapSite[]): MapEntry[] {
  const out: MapEntry[] = [];
  for (const s of sites) {
    if (s.kind === 'village') {
      if (game.discoveredPlaces.includes(s.id) || game.tutorial.step !== 'road') out.push({ ...s, status: 'home' });
      continue;
    }
    if (!game.discoveredPlaces.includes(s.id)) continue;
    out.push({ ...s, status: game.places.find(p => p.id === s.id)?.status ?? 'held' });
  }
  return out;
}
/** The nearest camp still held, measured from a point (her gate): the one she points to. */
export function nearestHeld(from: Vec2, game: Pick<GameState, 'places'>, sites: readonly MapSite[]): MapSite | null {
  let best: MapSite | null = null, bestD = Infinity;
  for (const s of sites) {
    if (s.kind !== 'camp' || game.places.find(p => p.id === s.id)?.status !== 'held') continue;
    const d = Math.hypot(s.x - from.x, s.z - from.z);
    if (d < bestD) { best = s; bestD = d; }
  }
  return best;
}
/** Map coordinates, 0 to 1 across, for a world point inside a square valley of half-size `extent`. */
export const toMap = (p: Vec2, extent: number): { u: number; v: number } =>
  ({ u: (p.x + extent) / (2 * extent), v: (p.z + extent) / (2 * extent) });
