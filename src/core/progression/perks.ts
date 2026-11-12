// Perks: earning, sources and fallbacks, slots, saved sets, mastery, and the ledger. Pure logic.
// Nothing is missable: every perk whose source can be lost has a fallback (see validatePerks).

import { PROGRESSION_TUNING as T } from './tuning';
import type {
  LedgerEntry, MasteryRank, PerkDef, PerkSource, ProgressionState, SkillGain, SkillId,
} from './types';

export type PerkIndex = Record<string, PerkDef>;

export function indexPerks(defs: readonly PerkDef[]): PerkIndex {
  const index: PerkIndex = {};
  for (const d of defs) {
    if (index[d.id]) throw new Error(`Duplicate perk id "${d.id}"`);
    index[d.id] = d;
  }
  return index;
}

/** True for sources the player can lose: a person can be killed or can leave. */
export function sourceCanBeLost(source: PerkSource): boolean {
  return source.kind === 'person';
}

/** Problems with a set of perk definitions. Empty when the set obeys the design rules. */
export function validatePerks(defs: readonly PerkDef[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const d of defs) {
    if (seen.has(d.id)) problems.push(`${d.id}: duplicate id`);
    seen.add(d.id);
    if (d.source.kind === 'hesper') problems.push(`${d.id}: Hesper may only be a fallback, never the primary source`);
    if (sourceCanBeLost(d.source) && d.fallback === null) problems.push(`${d.id}: source can be lost but there is no fallback`);
    if (d.fallback !== null && sourceCanBeLost(d.fallback)) problems.push(`${d.id}: the fallback can itself be lost`);
    if (d.ranks.some((r) => r.trim() === '')) problems.push(`${d.id}: a mastery rank has no description`);
    if (d.summary.trim() === '' || d.hint.trim() === '') problems.push(`${d.id}: missing summary or hint`);
  }
  return problems;
}

/** Where the perk can be earned right now, given which people are dead or gone. */
export function availableSource(def: PerkDef, lostPeople: ReadonlySet<string>): PerkSource {
  if (def.source.kind === 'person' && lostPeople.has(def.source.person)) {
    if (def.fallback === null) throw new Error(`Perk "${def.id}" has lost its source and has no fallback`);
    return def.fallback;
  }
  return def.source;
}

export function rankForMastery(mastery: number): MasteryRank {
  if (mastery >= T.masteryForRank3) return 3;
  if (mastery >= T.masteryForRank2) return 2;
  return 1;
}

export function hasPerk(state: ProgressionState, id: string): boolean {
  return state.perks[id] !== undefined;
}

/**
 * Grants a perk. Earning one twice changes nothing: a perk is never lost and never duplicated.
 * Any overflow banked for its skill is spent on it at once. Returns true if it was newly earned.
 */
export function earnPerk(state: ProgressionState, def: PerkDef, via: 'primary' | 'fallback' = 'primary'): boolean {
  if (hasPerk(state, def.id)) return false;
  state.perks[def.id] = { rank: 1, mastery: 0, via };
  const banked = state.overflowBank[def.skill];
  if (banked > 0) {
    state.overflowBank[def.skill] = 0;
    addMastery(state, def.id, banked * T.masteryPerOverflow);
  }
  return true;
}

/** Grants every level perk whose skill has reached its level. Returns the ids newly earned. */
export function grantLevelPerks(state: ProgressionState, defs: readonly PerkDef[]): string[] {
  const earned: string[] = [];
  for (const d of defs) {
    if (d.source.kind !== 'level') continue;
    if (state.skills[d.source.skill].level >= d.source.level && earnPerk(state, d)) earned.push(d.id);
  }
  return earned;
}

export function slotCount(state: ProgressionState): number {
  return T.slots[state.rank];
}

/**
 * Sets which perks are equipped. Only allowed at a rest site (a campfire, Hesper's, or home),
 * only with earned perks, and only as many as the hero's rank gives slots.
 */
export function equipPerks(state: ProgressionState, ids: readonly string[], atRestSite: boolean): void {
  if (!atRestSite) throw new Error('Perks can only be changed at a campfire, at Hesper\'s, or at home');
  const unique = [...new Set(ids)];
  if (unique.length > slotCount(state)) throw new Error(`Only ${slotCount(state)} perk slots at this rank`);
  for (const id of unique) if (!hasPerk(state, id)) throw new Error(`Perk "${id}" has not been earned`);
  state.equipped = unique;
}

export function isEquipped(state: ProgressionState, id: string): boolean {
  return state.equipped.includes(id);
}

/** Saves the equipped perks under a name, replacing a set of the same name. */
export function saveSet(state: ProgressionState, name: string): void {
  const existing = state.sets.findIndex((s) => s.name === name);
  const set = { name, perks: [...state.equipped] };
  if (existing >= 0) state.sets[existing] = set;
  else {
    if (state.sets.length >= T.maxSets) throw new Error(`Only ${T.maxSets} sets can be saved`);
    state.sets.push(set);
  }
}

/**
 * Equips a saved set. If the hero now has fewer slots than the set holds, or it names a perk
 * that is somehow not earned, the extras are skipped rather than failing.
 */
export function loadSet(state: ProgressionState, name: string, atRestSite: boolean): void {
  const set = state.sets.find((s) => s.name === name);
  if (!set) throw new Error(`No saved set named "${name}"`);
  const usable = set.perks.filter((id) => hasPerk(state, id)).slice(0, slotCount(state));
  equipPerks(state, usable, atRestSite);
}

/** Adds mastery points to an earned perk and updates its rank. Returns the new rank. */
export function addMastery(state: ProgressionState, id: string, points: number): MasteryRank {
  const p = state.perks[id];
  if (!p) throw new Error(`Perk "${id}" has not been earned`);
  p.mastery += Math.max(0, points);
  p.rank = rankForMastery(p.mastery);
  return p.rank;
}

/** Call when an equipped perk did something that mattered. Unequipped perks do not grow by use. */
export function recordPerkUse(state: ProgressionState, id: string): MasteryRank | null {
  if (!hasPerk(state, id) || !isEquipped(state, id)) return null;
  return addMastery(state, id, T.masteryPerUse);
}

/**
 * Spends overflow experience from a capped skill on that skill's perks, so it is never wasted.
 * Equipped perks of the skill share it; if none are equipped, all earned perks of the skill do;
 * if the hero has none yet, it is banked until one is earned.
 */
export function applyOverflow(state: ProgressionState, index: PerkIndex, skill: SkillId, overflow: number): void {
  if (overflow <= 0) return;
  const ofSkill = Object.keys(state.perks).filter((id) => index[id]?.skill === skill);
  const equipped = ofSkill.filter((id) => isEquipped(state, id));
  const targets = equipped.length > 0 ? equipped : ofSkill;
  if (targets.length === 0) {
    state.overflowBank[skill] += overflow;
    return;
  }
  const each = (overflow * T.masteryPerOverflow) / targets.length;
  for (const id of targets) addMastery(state, id, each);
}

/** Convenience for the caller of awardExperience: applies every gain's overflow and grants level perks. */
export function settleGains(state: ProgressionState, defs: readonly PerkDef[], index: PerkIndex, gains: readonly SkillGain[]): string[] {
  for (const g of gains) applyOverflow(state, index, g.skill, g.overflow);
  return grantLevelPerks(state, defs);
}

/** Every perk in the region, earned or not. Unearned ones show a hint, never the method. */
export function ledger(state: ProgressionState, defs: readonly PerkDef[]): LedgerEntry[] {
  return defs.map((d) => {
    const p = state.perks[d.id];
    return {
      id: d.id,
      name: d.name,
      skill: d.skill,
      earned: p !== undefined,
      rank: p?.rank,
      equipped: isEquipped(state, d.id),
      text: p ? d.summary : d.hint,
    };
  });
}

export function perksEarned(state: ProgressionState): number {
  return Object.keys(state.perks).length;
}
