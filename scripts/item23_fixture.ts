// Explicit stub for queue 18's absent cleared-state producer. This is synthetic progress, not a played fight.
import { newGameState } from '../src/core/state';
import { MILL_LANTERN, MILL_WINDOW_HOUSE } from '../src/data/mill_lantern';
import { garrisonOf } from '../src/data/bandits';
import { wickHouses } from '../src/village/plan';
import { VALLEY_SEED } from '../src/core/world/valley';
const game = newGameState(VALLEY_SEED);
game.hero.position = { ...MILL_LANTERN }; game.timeOfDay = 22;
game.places[0].status = 'cleared';
for (const b of garrisonOf('mill', false)) game.bandits[b.id] = 'dead';
console.log(JSON.stringify({ game, house: wickHouses(VALLEY_SEED).find(h => h.id === MILL_WINDOW_HOUSE) }));
