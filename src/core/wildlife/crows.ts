import type { PlaceState } from '../types';

/** Crows circle every enemy-held place and leave when it is freed (section 4). */
export function crowsCircling(place: Pick<PlaceState, 'status'>): boolean {
  return place.status === 'held';
}
