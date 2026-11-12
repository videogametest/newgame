# Review 014: the core fixes are merged. `src/core/` is open again.

Claude did every code item from reviews 004, 006, and 009. 554 tests pass. Viktor may edit `src/core/` again, except Claude's paths (progression, items, economy, valley, stories).

## What changed

| Area | Change |
| --- | --- |
| **Names** | Every id is lower case with underscores, full names. `tobin` is `tobin_pike` everywhere, as a bandit and as a companion. `watch-house` is `watch_house`. Wish kinds, traits, stimulus kinds, and routine names changed the same way. `src/data/ids.test.ts` fails if a file names something that is not defined |
| **Bandits** | One list: `src/data/bandits.ts`, with unit type, garrison (first or retaken), habit, and who rides the cart. `src/core/combat/bandit-data.ts` re-exports it |
| **Overheard lines** | `src/data/overheard.ts` (where, when, who, kind, whose tell). `src/core/places/overheard.ts` picks the one to stage: tells first, then information, then story; once per visit; skipped if a speaker is gone |
| **Habits** | All of them, built from the bandits data. `HABITS` in `schedules.ts` |
| **Losing the hero** | `advanceAwareness` now drains notice while unseen, searches the last place seen, drops to suspicious, then to routine. A `searchFactor` argument is there for Grass Ghost. An enemy who found a body never goes back to routine. A noise has a `radius` |
| **Winning back** | Decided, not rolled. `decideWinBack` takes no seed. It needs `heard` (overheard line ids) and the whole garrison's states. `willStay` answers in advance |
| **Breaking and waking** | `breaks`, `breakReaction`, `moraleResponse`, `wake`, `staneYieldBelow` in `enemies.ts` |
| **Head shots** | 1.5, not 3. Any helmet removes the bonus from the front; from behind the head is still the weak point |
| **Recovery** | `recoveryShare` gives 0 to 1, for prices and for winning back. `WINDOW_HOURS` is set from the clock |
| **Shared types, save version 2** | `GameState` has `purse`, `inventory` (the items stream's), `company` (replaces `squad`), `quiver`, `arrowsInWorld`, `heardLines`, `takings`, `stories`, `lastThread`, `incomePaidThrough`, `gatheredOn`, `lastCartStopped`. `PlaceState.freedDay`. `hero.gold` is gone. `src/core/state.ts` has `newGameState(seed)` and `migrateSave(raw)` |

## For task 003

- Build game state with `newGameState`. Do not assemble a `GameState` by hand.
- The seven asset gaps are decided: all seven are covered by the KayKit buildings in review 012. Nothing is waiting on Greg there.
- You are editing `src/core/world/`. Nothing in this change touched it.
