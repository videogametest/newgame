import type { SquadMember } from '../types';
import { homeCount, meetsTrigger, type PeopleWorld, type Trigger } from './households';

export type CompanionId = 'bram' | 'tamsin' | 'tobin_pike' | 'oona' | 'garrick' | 'bracken' | 'ketch';
export type BondStage = 1 | 2 | 3;
export interface CompanionDef {
  id: CompanionId;
  name: string;
  trait: string;
  perks: readonly string[];
  availability: Trigger;
  source: string;
  fallbackFor?: CompanionId;
}
export interface CompanionState extends Omit<SquadMember, 'name'> {
  id: CompanionId;
  joined: boolean;
  travelling: boolean;
  bond: number;
  wishFulfilled: boolean;
}
const home = (id: string): Trigger => ({ kind: 'household', id });
const def = (id: CompanionId, name: string, trait: string, perks: [string, string, string],
  availability: Trigger): CompanionDef => ({
  id, name, trait, perks, availability, source: 'docs/writing/companions.md',
});
export const COMPANIONS: readonly CompanionDef[] = [
  def('bram', 'Bram', 'holds_the_line', ['Shieldwall', 'Breaker', 'Stubborn'], { kind: 'always' }),
  def('tamsin', 'Tamsin Sedge', 'marked_target_bow', ['Second Bow', 'Covering Shot', "Her Father's Eye"], home('sedges')),
  def('tobin_pike', 'Tobin Pike', 'knows_stanes_men', ['He Knows the Drill', 'A Face They Know', 'Come Home'],
    { kind: 'bandit', id: 'tobin_pike', outcome: 'stayed' }),
  def('oona', 'Oona', 'healer_not_fighter', ['On Your Feet', 'Proper Food', "I've Seen Worse"], home('oona')),
  def('garrick', 'Garrick Aldric', 'staggers_heavy_enemies', ['Heavy Hand', 'Field Repair', 'Unmade'], home('aldrics')),
  def('bracken', 'Bracken', 'unharmable_sheepdog', ['Nose', 'Finder', 'Herder'], home('sedges')),
  { ...def('ketch', 'Ketch', 'knows_stanes_men', ['He Knows the Drill', 'A Face They Know', 'Come Home'], {
    kind: 'all', conditions: [
      { kind: 'bandit', id: 'tobin_pike', outcome: 'dead' },
      { kind: 'bandit', id: 'ketch', outcome: 'stayed' },
    ],
  }), perks: [], fallbackFor: 'tobin_pike', source: 'docs/writing/bandits.md#in-place-of-tobin' },
];
export const PEOPLE_TUNING = {
  partyLimit: 3, // design §6
  bondStageTwo: 100, // untuned placeholder
  bondTravel: 1, bondFight: 10, bondCampfire: 5, // untuned placeholder
};

/** Garrick alone returns at ten windows if the hammer was sold (households.md).
 * Pass hammerSold(inventory.soldStolen).
 */
/** Whether the smith's hammer was sold, from the inventory's record of sold stolen things. */
export const hammerSold = (soldStolen: readonly string[]): boolean => soldStolen.includes('smiths_hammer');

export function canRecruit(id: CompanionId, world: PeopleWorld, soldHammer = false): boolean {
  const d = COMPANIONS.find(x => x.id === id)!;
  return meetsTrigger(d.availability, world) ||
    (id === 'garrick' && soldHammer && homeCount(world.households) >= 10);
}

export function initialCompany(): CompanionState[] {
  return COMPANIONS.map(d => ({ id: d.id, level: 1, wounded: false, joined: d.id === 'bram',
    travelling: d.id === 'bram', bond: 0, wishFulfilled: false }));
}

/** Recruiting never takes crowns and never silently changes the chosen party. */
export function recruit(company: readonly CompanionState[], id: CompanionId, world: PeopleWorld,
  soldHammer = false): CompanionState[] {
  if (!canRecruit(id, world, soldHammer)) return company.map(c => ({ ...c }));
  return company.map(c => c.id === id ? { ...c, joined: true } : { ...c });
}

export function chooseParty(company: readonly CompanionState[], ids: readonly CompanionId[],
  location: 'hesper' | 'campfire' | 'field'): { ok: boolean; company: CompanionState[] } {
  const valid = location !== 'field' && ids.length <= PEOPLE_TUNING.partyLimit &&
    new Set(ids).size === ids.length &&
    ids.every(id => company.some(c => c.id === id && c.joined)) &&
    !(ids.includes('tobin_pike') && ids.includes('ketch'));
  return { ok: valid, company: company.map(c => valid ? { ...c, travelling: ids.includes(c.id) } : { ...c }) };
}

export function bondStage(c: CompanionState): BondStage {
  return c.wishFulfilled ? 3 : c.bond >= PEOPLE_TUNING.bondStageTwo ? 2 : 1;
}
export function activePerks(c: CompanionState): readonly string[] {
  return c.joined ? COMPANIONS.find(d => d.id === c.id)!.perks.slice(0, bondStage(c)) : [];
}
/** No decline rule exists in §6; negative amounts cannot lower bond. No wall-clock growth. */
export function growBond(c: CompanionState, event: 'travel' | 'fight' | 'campfire', amount = 1): CompanionState {
  const gain = { travel: PEOPLE_TUNING.bondTravel, fight: PEOPLE_TUNING.bondFight,
    campfire: PEOPLE_TUNING.bondCampfire }[event];
  return { ...c, bond: c.bond + (c.joined && c.travelling ? gain * Math.max(0, amount) : 0) };
}
/** Nonlethal roster state. Bracken can never be wounded. */
export function fall(c: CompanionState): CompanionState {
  return { ...c, wounded: c.id !== 'bracken' };
}
export function restCompany(company: readonly CompanionState[]): CompanionState[] {
  return company.map(c => ({ ...c, wounded: false }));
}

export type WishEvent =
  | { kind: 'inn_meal'; innRebuilt: boolean }
  | { kind: 'bow_returned_to_hale' }
  | { kind: 'pikes_door'; pikesHome: boolean }
  | { kind: 'firefly_grove' }
  | { kind: 'forge_craft'; quality: 'common' | 'fine' | 'masterwork' }
  | { kind: 'campfire'; sedgesHome: boolean; sheepVisible: boolean };
export interface WishDef {
  companion: CompanionId;
  condition: WishEvent['kind'];
  reward: { bondStage: 3; perk: string };
  source: string;
}
export const WISHES: readonly WishDef[] = [
  ['bram', 'inn_meal'], ['tamsin', 'bow_returned_to_hale'], ['tobin_pike', 'pikes_door'],
  ['oona', 'firefly_grove'], ['garrick', 'forge_craft'], ['bracken', 'campfire'],
].map(([id, condition]) => ({
  companion: id as CompanionId, condition: condition as WishEvent['kind'],
  reward: { bondStage: 3, perk: COMPANIONS.find(d => d.id === id)!.perks[2] },
  source: 'docs/writing/companions.md',
}));
/** TODO Ketch's wish is not specified; it is not inherited from Tobin's parents. */
export function fulfilWish(c: CompanionState, event: WishEvent): CompanionState {
  if (!c.joined) return { ...c };
  const matching = WISHES.some(w => w.companion === c.id && w.condition === event.kind);
  const valid = event.kind === 'bow_returned_to_hale' ||
    (c.travelling && (event.kind === 'inn_meal' ? event.innRebuilt :
      event.kind === 'pikes_door' ? event.pikesHome :
      event.kind === 'forge_craft' ? event.quality === 'masterwork' :
      event.kind === 'campfire' ? event.sedgesHome && event.sheepVisible : true));
  return { ...c, wishFulfilled: c.wishFulfilled || matching && valid };
}
