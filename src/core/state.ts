// A new game, and bringing an older save up to date. Pure: no storage here.
import { emptyQuiver } from './combat/quiver';
import { emptyPurse } from './economy/purse';
import { emptyInventory } from './items/inventory';
import { startingRecipes } from './items/recipes';
import { HOUSEHOLDS } from './people/households';
import { createProgression } from './progression/skills';
import { newStories } from './stories/stories';
import { emptySpeechLog } from './speech/said';
import { SAVE_VERSION, type GameState } from './types';

/** The valley as the hero first walks into it, at dusk: every place held, one window lit. */
export function newGameState(seed: number): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    timeOfDay: 18,
    day: 1,
    hero: { position: { x: 0, z: 0 }, hp: 100, maxHp: 100, regionId: 'tallowmere' },
    progression: createProgression(),
    inventory: { ...emptyInventory(), recipes: startingRecipes() },
    purse: emptyPurse(),
    incomePaidThrough: 1,
    gatheredOn: {},
    lastCartStopped: false,
    quiver: emptyQuiver(),
    arrowsInWorld: [],
    company: [],
    places: ['mill', 'forge', 'watch_house'].map(id => ({ id, status: 'held' as const, timesFreed: 0, bellSilenced: false, morale: 1 })),
    households: HOUSEHOLDS.map(h => ({ id: h.id, home: h.id === 'hesper', ...(h.id === 'hesper' ? { homeSince: 0 } : {}) })),
    openedChests: [],
    discoveredPlaces: [],
    fragmentsFound: [],
    bandits: {},
    lostPeople: [],
    trialsPassed: [],
    stolenGoodsReturned: [],
    projectsBuilt: [],
    campfiresFound: [],
    storyMoments: [],
    heardLines: [],
    takings: [],
    stories: newStories(),
    lastThread: null,
    notes: [],
    speech: emptySpeechLog(),
    boundBandits: [],
    lessonsTaken: [],
  };
}

/**
 * Bring a saved game of any earlier version up to this one. Fields a version added are filled from a new game,
 * so nothing the player had is lost and nothing new is missing. Returns null if it is not a save at all.
 */
export function migrateSave(raw: unknown): GameState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const old = raw as Record<string, unknown> & { version?: unknown; seed?: unknown; hero?: Record<string, unknown> };
  if (typeof old.version !== 'number' || typeof old.seed !== 'number') return null;
  if (old.version > SAVE_VERSION) return null;
  const fresh = newGameState(old.seed);
  const next = { ...fresh, ...old, version: SAVE_VERSION } as GameState & { squad?: unknown };
  if (old.version < 2) {
    // Version 1 kept crowns on the hero as `gold`, items as a flat list, and a `squad`.
    const gold = typeof old.hero?.gold === 'number' ? Math.max(0, Math.floor(old.hero.gold)) : 0;
    next.purse = { carried: gold, stored: 0 };
    const { gold: _gold, ...hero } = (old.hero ?? {}) as Record<string, unknown>;
    next.hero = { ...fresh.hero, ...hero } as GameState['hero'];
    const flat = Array.isArray(old.inventory) ? (old.inventory as { itemId: string; count: number }[]) : [];
    next.inventory = { ...fresh.inventory, carried: flat.filter(s => typeof s?.itemId === 'string' && s.count > 0).map(s => ({ itemId: s.itemId, count: s.count })) };
    next.company = fresh.company;
    delete next.squad;
  }
  return next;
}
