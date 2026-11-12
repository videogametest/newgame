# Review 004: logic streams C, D, E, G (12 Nov)

Covers PRs #17 to #20. Reviewed at `6ca34af`. 346 tests pass, typecheck clean.

All four are accepted. They are careful, they invent nothing, and they list what they left out. The lists below are what each needs before its task wires it in. None of it blocks the style test rework; do these between captures.

## Your questions, answered

Every question raised in the stream READMEs is now settled in `GAME_DESIGN.md` version 22, section 5, "Settled details". In short:

| Question | Answer |
| --- | --- |
| Search and awareness reset | Alert, then search the last seen position, then suspicious, then routine. Times are tuning. |
| Knives against heavy enemies | Heavy enemies are not interrupted. Your precedence is right. |
| Who breaks, and flee or surrender | Threshold from loyalty. Low loyalty or an enemy close: surrender. Otherwise run. |
| Win-back curve inputs | Mercy is spared and knocked out over all beaten at that place. Decided at the first dawn after the lantern, once. |
| Waking a knocked-out enemy | A few seconds, half health, alert. |
| Stane's yield | A quarter health. Tuning. |
| Bram's Breaker, and "always active" | The writing is right. Perks come at joining, bond two, bond three. Design doc corrected. |
| Bond decline | Never. |
| Ketch | Tobin's trait and perks. Third stage when the Sedges are home. |
| Companion gear and level | Two slots: weapon and armour. Level follows the hero's Leadership. |
| Dusk, dawn, small hours | Dawn 6, dusk 18, windows lit 19 to 1, Hesper's until dawn. |
| Maren | No new saved field. `presentFromStart` in data is enough. |

## Must fix: one set of names

Combat uses `tobin_pike` and `watch_house`. People uses `tobin` and `watch-house`. These will not join.

- Every id is lower case with underscores and uses the full name.
- Move the definitions to `src/data/`: `places.ts`, `bandits.ts`, `households.ts`. Both streams import from there. Delete the local copies.
- Project ids are the ones in `src/core/economy/projects.ts`.
- Add a test that every id one file refers to exists in the file that defines it.

## Shared types: one PR, coordinator's

Make these changes to `src/core/types/shared.ts` together and raise `SAVE_VERSION` to 2 with a migration.

| Change | For |
| --- | --- |
| `HeroState.gold` removed. `GameState.purse: Purse` (`src/core/economy/purse.ts`) | F2 |
| `GameState.inventory` becomes `InventoryState` (`src/core/items/types.ts`). Remove the provisional `ItemDef` and `ItemStack` | F2 |
| `GameState.incomePaidThrough: number`, `gatheredOn: Record<string, number>`, `lastCartStopped: boolean` | F2 |
| `PlaceState.freedDay?: number` and a pending win-back record | E |
| The quiver and arrows lying in the world | E |
| Companion fields: joined, travelling, bond, wish done. Replace `SquadMember` | G |

## Stream D (stealth and places)

- Add the search and decay rule above. Grass Ghost rank 3 halves the search time, so the time must be an input.
- Give `noise` a radius.
- Only four habits are in `HABITS`. `docs/writing/bandits.md` gives one for nearly every defender. Add them all, as data, in the same file as the bandits.
- Overheard lines have no data model. Add one: id, place, kind, time of day, speakers, and the rule "once per visit, skipped if a speaker is gone". The lines themselves are read from the writing file.

## Stream E (combat)

- Implement the breaking rule and the wake rule now that they are settled.
- `resolveDefeat` and the old `applyHit` both exist. Say in the README which one task 005 keeps.

## Stream G (people)

- Rename ids as above.
- Read `InventoryState.soldStolen` for sold lines and Garrick's fallback, in place of the "explicit fact" input.
- Set the window hours from the clock ruling.

## Stream C (world)

- Nothing to change. The valley layout comes with task 003.

## Stream F2 (Claude's, merged today)

`src/core/items/` and `src/core/economy/`: 60 tests. See `src/core/items/README.md`. Viktor does not edit these paths.
