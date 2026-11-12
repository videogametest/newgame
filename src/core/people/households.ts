import type { GameState, Household } from '../types';

export type PeopleWorld = Pick<GameState,
  'day' | 'places' | 'households' | 'bandits' | 'stolenGoodsReturned' | 'projectsBuilt' | 'storyMoments'>;

export type Trigger =
  | { kind: 'always' }
  | { kind: 'place'; id: string }
  | { kind: 'returned'; id: string }
  | { kind: 'household'; id: string }
  | { kind: 'project'; id: string }
  | { kind: 'windows'; count: number }
  | { kind: 'bandit'; id: string; outcome: 'stayed' | 'dead' }
  | { kind: 'any' | 'all'; conditions: readonly Trigger[] };

export interface HouseholdDef {
  id: string;
  villageId: string;
  name: string;
  trade: string;
  /** Exact descriptions, including unnamed relatives, live in this source. */
  source: string;
  members: readonly string[];
  /** House identity, not invented map coordinates. */
  houseId: string;
  /** Maren is physically present before her window becomes progress. */
  presentFromStart: boolean;
  trigger: Trigger;
}

const place = (id: string): Trigger => ({ kind: 'place', id });
const returned = (id: string): Trigger => ({ kind: 'returned', id });
const project = (id: string): Trigger => ({ kind: 'project', id });
const windows = (count: number): Trigger => ({ kind: 'windows', count });

function household(id: string, name: string, trade: string, members: string[],
  trigger: Trigger, presentFromStart = false): HouseholdDef {
  return { id, villageId: 'wick', name, trade, members, houseId: `${id}_house`,
    source: 'docs/writing/households.md', presentFromStart, trigger };
}

/** §9. IDs are local integration keys, not names added to the writing.
 * House positions and unnamed members: TODO not in design; no fabricated coordinates or names.
 */
export const HOUSEHOLDS: readonly HouseholdDef[] = [
  household('hesper', 'Hesper', 'Lamplighter', ['Hesper'], { kind: 'always' }, true),
  household('maren', 'Old Maren', 'None now', ['Old Maren'], {
    kind: 'any', conditions: [place('mill'), place('forge'), place('watch_house')],
  }, true),
  household('marrins', 'The Marrins', 'Millers', ['Ansa Marrin', 'Corin'], place('mill')),
  household('aldrics', 'The Aldrics', 'Smiths', ['Bertram Aldric', 'Garrick'], returned('aldrics')),
  household('sedges', 'The Sedges', 'Shepherds', ['Hale Sedge', 'Tamsin', 'Bracken'], {
    kind: 'any', conditions: [place('forge'), project('east_road_lanterns')],
  }),
  household('pikes', 'The Pikes', 'Farmers', ['Ned Pike', 'Orla Pike', 'Tobin Pike'], {
    kind: 'any', conditions: [
      { kind: 'bandit', id: 'tobin_pike', outcome: 'stayed' },
      { kind: 'all', conditions: [{ kind: 'bandit', id: 'tobin_pike', outcome: 'dead' }, windows(14)] },
    ],
  }),
  household('wains', 'The Wains', 'Carters', ['Joss Wain', 'Merry Wain'], project('inn')),
  household('kettles', 'The Kettles', 'Peddlers', ['Wat Kettle', 'Nan'], windows(3)),
  household('brands', 'The Brands', 'Charcoal burners', ['Old Tam Brand'], place('forge')),
  household('oona', 'Oona', 'Herbwife', ['Oona'], windows(6)),
  household('hollins', 'The Hollins', 'Innkeeper', ['Bess Hollin'], windows(8)),
  household('tolleys', 'The Tolleys', 'Bowyer and fletcher', ['Giles Tolley', 'Ada'], returned('tolleys')),
  household('ashbys', 'The Ashbys', 'Beekeepers', ['Marta Ashby', 'Col'], windows(10)),
  household('loomises', 'The Loomises', 'Weavers', ['Edda Loomis', 'Pell'], returned('loomises')),
  household('dunns', 'The Dunns', 'Farmers', ['Rob Dunn', 'Sal Dunn'], windows(12)),
  household('rudds', 'The Rudds', 'Bell ringer', ['Amos Rudd'], project('village_bell')),
];

export function homeCount(households: readonly Household[], villageId = 'wick',
  definitions = HOUSEHOLDS): number {
  const ids = new Set(definitions.filter(d => d.villageId === villageId).map(d => d.id));
  return new Set(households.filter(h => h.home && ids.has(h.id)).map(h => h.id)).size;
}

export function meetsTrigger(trigger: Trigger, world: PeopleWorld): boolean {
  switch (trigger.kind) {
    case 'always': return true;
    case 'place': return world.places.some(p => p.id === trigger.id && p.status === 'freed');
    case 'returned': return world.stolenGoodsReturned.includes(trigger.id);
    case 'household': return world.households.some(h => h.id === trigger.id && h.home);
    case 'project': return world.projectsBuilt.includes(trigger.id);
    case 'windows': return homeCount(world.households) >= trigger.count;
    case 'bandit': return world.bandits[trigger.id] === trigger.outcome;
    case 'any': return trigger.conditions.some(t => meetsTrigger(t, world));
    case 'all': return trigger.conditions.every(t => meetsTrigger(t, world));
  }
}

/** One simultaneous pass, not an order-dependent cascade. Recheck after the returned change. */
export function updateHouseholds(world: PeopleWorld): Household[] {
  const existing = new Map(world.households.map(h => [h.id, h]));
  const result = HOUSEHOLDS.map(def => {
    const old = existing.get(def.id) ?? { id: def.id, home: false };
    return !old.home && meetsTrigger(def.trigger, world)
      ? { ...old, home: true, homeSince: world.day } : { ...old };
  });
  return [...result, ...world.households.filter(h => !HOUSEHOLDS.some(d => d.id === h.id)).map(h => ({ ...h }))];
}

/** Caller supplies clock boundaries: §9 gives no exact hours. No guessed defaults. */
export interface WindowHours {
  dusk: number;
  dawn: number;
  smallHours: number; // not in design; coordinator must tune
}

/** Section 5, "The clock": windows light at nineteen and go dark at one, except Hesper's, which stays lit until dawn. */
export const WINDOW_HOURS: WindowHours = { dusk: 19, dawn: 6, smallHours: 1 };

const within = (hour: number, start: number, end: number): boolean =>
  start > end ? hour >= start || hour < end : hour >= start && hour < end;

/** Fairlow is separate from the sixteen; never enables a household trigger. */
export function windowCount(households: readonly Household[], hour: number, hours: WindowHours,
  fairlowLit = false, villageId = 'wick', definitions = HOUSEHOLDS) {
  const h = ((hour % 24) + 24) % 24;
  const night = within(h, hours.dusk, hours.dawn);
  const homes = new Set(households.filter(x => x.home).map(x => x.id));
  const village = definitions.filter(d => d.villageId === villageId);
  const lit = village.filter(d => homes.has(d.id) &&
    (d.id === 'hesper' ? night : night && within(h, hours.dusk, hours.smallHours))).length;
  return { lit, total: village.length, fairlow: villageId === 'wick' && fairlowLit && night };
}

export interface RecoveryWeights {
  places: number; households: number; bandits: number; returned: number; projects: number;
}
export const RECOVERY_WEIGHTS: RecoveryWeights = {
  places: 1, households: 1, bandits: 1, returned: 1, projects: 1, // untuned placeholder
};

/** §9, The world tells the story. Derived every call; retaken places cease contributing. */
export function recoveryLevel(world: PeopleWorld, weights = RECOVERY_WEIGHTS): number {
  const unique = (ids: string[]) => new Set(ids).size;
  return unique(world.places.filter(p => p.status === 'freed').map(p => p.id)) * weights.places
    + homeCount(world.households) * weights.households
    + Object.values(world.bandits).filter(b => b === 'stayed').length * weights.bandits
    + unique(world.stolenGoodsReturned) * weights.returned
    + unique(world.projectsBuilt) * weights.projects;
}

/** What a fully recovered valley adds up to, for turning the level into a share. Bandits: about ten can be won back. */
export const RECOVERY_FULL = { places: 3, households: 16, bandits: 10, returned: 7, projects: 7 } as const;

/** The recovery level as a share, 0 to 1, for prices, stock, and winning bandits back. */
export function recoveryShare(world: PeopleWorld, weights = RECOVERY_WEIGHTS): number {
  const full = RECOVERY_FULL.places * weights.places + RECOVERY_FULL.households * weights.households
    + RECOVERY_FULL.bandits * weights.bandits + RECOVERY_FULL.returned * weights.returned + RECOVERY_FULL.projects * weights.projects;
  return full <= 0 ? 0 : Math.min(1, Math.max(0, recoveryLevel(world, weights) / full));
}
