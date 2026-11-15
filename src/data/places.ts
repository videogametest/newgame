// The three bandit-held places (task 004). Who holds each place, and who leads it.
// Defenders are the garrison minus its leader. Bell, lantern and banner are placed
// by src/landmarks/plan.ts from the site; they are not duplicated here.
import { BANDITS, garrisonOf, type BanditDef, type PlaceId } from './bandits';

export type Garrison = 'first' | 'retaken';

export interface PlaceGarrison {
  retaken: boolean;
  /** Bandit id of the leader. Stane is listed in the writing but has no roster row. */
  leaderId: string;
}

export interface PlaceDef {
  id: PlaceId;
  name: string;
  /** Matches PLACE_SITES in src/landmarks/plan.ts. */
  landmarkSite: 'mill' | 'forge' | 'watch_house';
  garrisons: PlaceGarrison[];
}

export const PLACES: readonly PlaceDef[] = [
  {
    id: 'mill',
    name: 'The Mill',
    landmarkSite: 'mill',
    garrisons: [
      { retaken: false, leaderId: 'harl_gadd' },
      { retaken: true, leaderId: 'maud_kerr' },
    ],
  },
  {
    id: 'forge',
    name: 'The Forge',
    landmarkSite: 'forge',
    garrisons: [{ retaken: false, leaderId: 'rafe_dunmore' }],
  },
  {
    id: 'watch_house',
    name: 'The Watch-house',
    landmarkSite: 'watch_house',
    garrisons: [{ retaken: false, leaderId: 'stane' }],
  },
];

export function placeById(id: PlaceId): PlaceDef {
  const p = PLACES.find(x => x.id === id);
  if (!p) throw new Error(`Unknown place: ${id}`);
  return p;
}

/** Everyone who holds the place in that garrison, leader included. */
export function garrisonMembers(placeId: PlaceId, retaken = false): BanditDef[] {
  return garrisonOf(placeId, retaken);
}

/** The garrison's defenders: members minus the leader. */
export function defendersOf(placeId: PlaceId, retaken = false): BanditDef[] {
  const g = PLACES.find(x => x.id === placeId)?.garrisons.find(x => x.retaken === retaken);
  if (!g) return [];
  return garrisonMembers(placeId, retaken).filter(x => x.id !== g.leaderId);
}

/** True for every bandit id that is a leader in the roster. */
export function isRosterLeader(id: string): boolean {
  return BANDITS.some(x => x.id === id && x.leader === true);
}
