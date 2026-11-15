import { newGameState } from '../state';
import { initialCompany } from '../people/companions';
export function populatedGame() {
  const g = newGameState(1066);
  g.hero = { position: { x: 120, z: -2 }, hp: 61, maxHp: 140, regionId: 'tallowmere' };
  g.day = 7; g.timeOfDay = 22.25;
  g.places[0] = { ...g.places[0], status: 'freed', timesFreed: 1, freedDay: 6, bellSilenced: true };
  g.households[0].home = true;
  g.progression.skills.archery = { level: 7, xp: 52 };
  g.progression.perks.long_shot = { rank: 2, mastery: 35, via: 'primary' };
  g.progression.equipped = ['long_shot']; g.progression.sets = [{ name: 'Quiet', perks: ['long_shot'] }];
  g.inventory.carried = [{ itemId: 'apple', count: 3 }]; g.inventory.stored = [{ itemId: 'iron', count: 8 }];
  g.purse = { carried: 22, stored: 85 }; g.company = initialCompany();
  g.bandits.dob_finch = 'stayed'; g.openedChests = ['mill_box']; g.stolenGoodsReturned = ['marrins'];
  g.discoveredPlaces = ['mill']; g.storyMoments = ['first_lantern']; g.boundBandits = ['odo_varn'];
  g.speech = { lines: { 'overheard.mill.3.0#0': 130 }, speakers: { dob_finch: 130 }, last: 130 };
  g.heardLines = ['overheard.mill.3']; g.notes = [{ lineId: 'overheard.mill.3', kind: 'overheard', speakers: ['dob_finch', 'odo_varn'], place: 'mill', day: 6 }];
  g.quiver.arrows.blunt = 3; g.arrowsInWorld = [{ id: 'a', type: 'standard', location: 'ground', landedAt: 3, broken: false, pickedUp: false }];
  return g;
}
