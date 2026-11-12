# Stream E: dark combat rules

Implements `GAME_DESIGN.md` **v21** §§3, 5, 9, 10, not the older
section numbers in the stream brief. Import these modules explicitly by path:
`../combat` still resolves to the existing `src/core/combat.ts`. No scene,
AI, battle, tuning panel, or main entry point imports this directory.

`archery.ts` reuses the existing `bowDamage` and `bowSpeed` functions from
`src/core/combat.ts`; it does not replace `applyHit` or its death semantics.
The coordinator must use `resolveDefeat` when integrating nonlethal damage.

Numbers are isolated in `data.ts`. Non-design numbers are marked
`// untuned placeholder`; they are not balance claims. Fold them into the
single shared tuning file at integration; path ownership forbids that here.
Functions accept explicit policy/tuning where the design is incomplete.
Preset fields exclude XP, loot quality and story, but end-to-end identity
of rewards across settings must be tested after integration.

## Integration contract

- Inputs are valid finite simulation values; quiver counts are nonnegative
  integers and within capacity. Use the quiver constructors/transitions to
  preserve this invariant. Return values are new data, not mutations.
- `landArrow` resolves breakage once, consuming explicit seed state only for
  hits. Persist its record and pass the returned seed forward.
- `recoverArrow` is a time-indexed physical pickup rule, not regeneration.
  Supply simulation seconds, pickup proximity/interaction, and fallen state.
  There is no automatic refill and no invented pickup delay.
- Collision code supplies head/body, helmet and front/back classification.
  `resolveArrowDamage` reports an instant blunt headshot knockout; pass that
  to `resolveDefeat`. Whistling cannot cause damage or an instant knockout.
- Draw windows are `[fullDraw, fullDraw + window)`; dodge windows include the
  earliest eligible moment but exclude the impact itself. Store the opened
  enemy id after a perfect dodge; consume on the next damaging hit on that
  enemy, not on a miss or zero-damage whistling arrow.
- Attack-turn reservations must be updated sequentially as actions start;
  count wind-up/draw as active. The caller supplies live hero-targeting
  attackers only. Commanded guard status must apply only to Stane's guard.
  Repositioning, target selection and fairness remain the AI's responsibility.
- Morale is place-wide. A beaten leader incurs both `defenderBeaten` and
  `leaderBeaten`; each event is applied once. Breaking threshold and
  flee/surrender choice come from enemy data, not a hidden lottery.
- Surrenderers use shared state `spared`, even before the place is freed.
  Attacking one is allowed but `rewardsAllowed` is false.
- `wakeBandit` only changes the lifecycle state. Wake-up HP and delay have
  no design values yet; the integrating caller must obtain those decisions.
- Snapshot win-back inputs on liberation: other defeated defenders at that
  same place, including killed ones, and the derived recovery value normalized
  by the caller. Resolve on a subsequent morning only at that freed place.
  Apply each result once, storing `BanditState`, and carry the seed forward.
  A recruit destination means recruitment eligibility, not forced party entry.
- `BANDITS` includes both Mill garrisons; never spawn them together. The tax
  cart members reuse the Watch-house people, not duplicate bandit identities.
  Place and bandit IDs are local data keys pending cross-stream reconciliation.
- Region health/damage are fixed data; player level is never an input.
  Unknown later regions have no fabricated fallback. Preset multipliers
  apply on top; they never change experience, loot quality or story.

## Deferred / design questions

- §5: numeric head geometry, front-angle cutoff, damage/helmet values, quiver
  size, breakage rate, draw/dodge windows, fatigue strength, and critical
  multiplier are not specified. Classification remains caller-supplied;
  numeric examples in data are untuned, and fatigue is only a returned flag.
- §5: throwing knives interrupt a wind-up, but heavy enemies resist ordinary
  hits. This module gives heavy immunity precedence; confirm the exception.
- §5: morale losses, individual loyalty-to-break thresholds, and choosing
  fleeing versus surrender have no values/algorithm. Event deltas are untuned;
  caller supplies the threshold and reaction.
- §5/§9: win-back curve, recovery normalization, loyal-return cutoff, and
  mercy denominator are unspecified. The provisional monotonic curve counts
  defeated fellows only; approving that policy and tuning is still required.
  The exact morning boundary and treatment after a missed morning or retake
  need integration policy. No calendar progression is invented here.
- §5: HP and timing for waking knocked-out allies are unspecified.
- §3: only the first region exists; later-region multipliers are deferred.
- §9: Stane's low-health yield threshold is unspecified; caller may provide
  it. Lethal damage always yields instead of killing even without a threshold.
  His phase transitions, bell scene, guard checkpoint/retry state are deferred.
- §10: nonidentity preset numbers are untuned.
- Integration/rendering, physical hit-zone detection, fire spreading, enemy
  unit models, combo, knives inventory, Bram AI/traits, effects, UI, perk
  effects and new bot/balance targets belong to numbered task integration,
  not this logic-only stream.

## Shared-type requests (for integration, not blocking these pure functions)

Persist a place's liberation day / pending bandit-decision snapshot and quiver
plus recoverable projectile records. Current shared `PlaceState` has no
`freedDay`; `GameState` has bandit outcomes but no pending win-back record or
quiver. Keep those changes with the coordinator; no shared types changed here.
