// Item 27: what the map can ever show in the first valley, from the layout plan (docs/tasks/003-layout/layout.json)
// (through its generated src/core/world/valley_layout.ts) and the place names in ./places.ts. Whether each is shown is src/core/tutorial/map.ts's call.
import { VALLEY_PLACES } from '../core/world/valley_layout';
import { PLACES } from './places';
import type { MapSite } from '../core/tutorial/map';
import { VALLEY_HALF_EXTENT } from '../core/world/valley';

const at = (id: string): { x: number; z: number } => {
  // The generated layout names its places in camelCase (watch_house is watchHouse).
  const p = (VALLEY_PLACES as Record<string, { x: number; z: number }>)[id.replace(/_(\w)/g, (_m, c: string) => c.toUpperCase())];
  if (!p) throw new Error(`No ${id} in layout.json`);
  return p;
};
export const MAP_SITES: readonly MapSite[] = [
  { id: 'wick', name: 'Wick', ...at('wick'), kind: 'village' },
  ...PLACES.map(p => ({ id: p.id, name: p.name, ...at(p.landmarkSite), kind: 'camp' as const })),
];
export const MAP_EXTENT = VALLEY_HALF_EXTENT;
