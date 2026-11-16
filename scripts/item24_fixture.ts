// Synthetic doorstep save only. No walked tutorial or combat progress is claimed.
import { newGameState } from '../src/core/state';
import { VALLEY_SEED, blocksHero } from '../src/core/world/valley';
import { HESPER } from '../src/data/talking';
const game = newGameState(VALLEY_SEED);
game.hero.position = { x: HESPER.x + 2, z: HESPER.z + 1 };
if (blocksHero(game.hero.position.x, game.hero.position.z)) throw new Error('Fixture approach blocked');
game.timeOfDay = 18;
console.log(JSON.stringify({ game, hesper: HESPER }));
