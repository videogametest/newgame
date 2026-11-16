import writing from '../../docs/writing/interface.md?raw';
import { placeById } from './places';
// Integration coordinates come from the actual landmark and seeded village plan, never copied offsets.
import { landmarkPieces } from '../landmarks/plan';
import { wickHouses } from '../village/plan';
import { VALLEY_SEED } from '../core/world/valley';
const piece = landmarkPieces().find(p => p.site === 'mill' && p.role === 'lantern');
if (!piece) throw new Error('Mill lantern missing from landmark plan');
export const MILL_LANTERN = { x: piece.x, z: piece.z };
// Nearest still-dark habitable window; Fairlow remains the finale. Current plan selects the Marrins.
export const MILL_WINDOW_HOUSE = wickHouses(VALLEY_SEED)
  .filter(h => h.id !== 'fairlow' && h.state !== 'lit' && h.model !== 'destroyed')
  .sort((a, b) => Math.hypot(a.x - piece.x, a.z - piece.z) - Math.hypot(b.x - piece.x, b.z - piece.z) || a.id.localeCompare(b.id))[0].id;

function written(label: string): string {
  const line = writing.split('\n').find(l => l.startsWith(`- ${label}: `));
  const text = line?.match(/"([^"]+)"/)?.[1];
  if (!text) throw new Error(`Missing interface words: ${label}`);
  return text;
}
export const LANTERN_WORDS = {
  prompt: written('The defenders are beaten'),
  freed: written('The lantern is lit').replace('{place}', placeById('mill').name),
};
