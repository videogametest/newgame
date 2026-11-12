import { activePerks, type CompanionState } from './companions';

/** Signature traits and pair synergies are data, not another combat engine.
 * Integrators consume these intentions; attacks/HP/awareness remain their owning streams'.
 */
export interface TraitContext {
  markedTarget?: string;
  nearestEnemy?: string;
  placeWatched?: boolean;
  fallenCompanions?: string[];
  unnoticedEnemy?: string;
  nearbySecret?: string;
}
export function traitIntent(c: CompanionState, context: TraitContext) {
  const active = c.joined && c.travelling && !c.wounded;
  const perks = active ? activePerks(c) : [];
  return {
    canAttack: active && c.id !== 'oona' && c.id !== 'bracken',
    canBeHarmed: c.id !== 'bracken',
    target: active && (c.id === 'bram' || c.id === 'tamsin')
      ? context.markedTarget ?? context.nearestEnemy : undefined,
    drawsAttention: perks.includes('Shieldwall'),
    // §5 vs writing conflict remains open; local data follows the written bond gate.
    breaksGuard: perks.includes('Breaker'),
    revealsPatrols: perks.includes('He Knows the Drill') && !!context.placeWatched,
    fasterMoraleLoss: perks.includes('A Face They Know'),
    reviveTarget: perks.includes('On Your Feet')
      ? (context.fallenCompanions?.includes('bram') ? 'bram' : context.fallenCompanions?.[0]) : undefined,
    improvesFood: perks.includes('Proper Food'),
    staggersHeavy: perks.includes('Heavy Hand'),
    growlToward: perks.includes('Nose') ? context.unnoticedEnemy : undefined,
    leadToward: perks.includes('Finder') ? context.nearbySecret : undefined,
  };
}

export const PAIR_BEHAVIOURS = [
  { pair: ['bram', 'tamsin'], event: 'guard-broken', response: 'tamsin-shoots-target' },
  { pair: ['garrick', 'tamsin'], event: 'helmet-broken', response: 'tamsin-aims-head' },
  { pair: ['tobin', 'bracken'], event: 'tobin-reaches-held-enemy', response: 'enemy-surrenders' },
  { pair: ['oona', 'bram'], event: 'bram-falls', response: 'oona-prioritises-bram' },
] as const;
