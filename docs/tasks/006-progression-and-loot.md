# 006: Progression, loot, and money (milestone 6)

Status: open

## Goal

Give the player things to earn, find, make, carry, keep, and spend on, as described in `GAME_DESIGN.md` section 6, everything except Companions. Scoped in section 8, milestone 6. This replaces the simple item counts from task 004.

## Build in four steps

Open a PR, merge, and deploy after each step, and log each in `docs/status.md`.

1. **Skills, perks, and inventory.** All skills in the section 6 table with every rule under Skills (accomplishment-based experience, harder feats, diminishing repetition, catch-up, the region cap of 20, overflow into perk mastery, cap keepsakes). Perks as specified under Perks: sources, the fallback so nothing is missable, slots by rank, saved sets, three mastery ranks, and the ledger with hints. The skills screen on `K` with all four tabs, including Notes. The progression logic and the 24 perks are Claude's stream (`docs/PARALLEL.md`): use what is in `src/core/progression/` and `src/data/perks/` and do not redesign it. Your part is wiring it into the game, implementing each perk's declared effect in the system it touches, and building the skills screen. If a perk's effect cannot be built as declared, say so in `docs/status.md`. The inventory, loot window, and storage screen exactly as laid out in section 10, with an icon for every item, the carry limit, the storage chest at Hesper's, equippable gear with material tiers and quality, and gear visible on the character where the models allow.
2. **Loot.** Enemies carrying what you see, strongboxes, stolen goods with their owners and the return flow, the six unique items and the keepsakes exactly as written in `docs/writing/items.md` (each unique item's property implemented in the system it touches), and the pick-up rules. Names of materials, food, and gear come from the same file; every screen and notice uses the words in `docs/writing/interface.md`. Every item, owner, and unique is a data entry.
3. **Gathering and crafting.** Foraging, hunting yields, wood, ore, and fishing, with regrowth. Fletching and cooking at campfires, and smithing at the Forge once the smith has returned, with recipes learned by doing, from notes, and from people. Money and trade as in section 6: crowns, the traders who return, prices and stock that follow recovery, the rebuilding projects for Wick with their visible results (road lanterns that keep wolves off a road at night, the well, the bridge, the stalls, the inn, the bell), and the effect of Stane's tax cart on income and stock.
4. **The apprenticeship.** Hesper's six trials as specified in section 6, the perk each one teaches, the three ranks, the cloak colours, and the perk slots each rank gives. Hesper has several different failure lines for each trial.

## Rules

- Skills, loot tables, recipes, weights, and the stolen-goods flow live in `src/core` as pure, tested logic. All numbers are in data or the tuning file.
- Quality is a small set of fixed bonuses. Do not add random stat rolls.
- **The pacing test.** A bot plays Tallowmere from the start to the finale, once rushing and once exploring, and the test asserts skill levels, perks earned, and slots at each story beat against the bands in section 6, Pacing. The exploring bot must not reach the cap in its main skills before the turn. This test must pass before the task is done, and it gates every later change to experience values.
- Add a test that proves no perk is missable: for every perk, kill or lose its primary source and check the fallback still grants it.
- Add a test that no skill gains experience from standing idle near enemies or from taking damage.
- The pacing test also checks the purse at each story beat against bands you set in data and list in `docs/status.md`: enough for the essentials, with something still worth buying at every beat.
- Companions are task 007. Do not build the roster, bond, or the other five companions here.
- Gathering spots look like what they are. Do not add glowing markers or floating icons.
- Saves must include everything added here; add to the save-and-reload test.
- Add a bot test in which the hero fletches arrows from gathered materials and uses them to clear the Mill.

## Done when

- All four steps are merged and deployed and the tests pass.
- Then continue to task 007.

## From design version 30

- **Teachers:** `src/core/progression/lessons.ts`, `GameState.lessonsTaken`. Offered in conversation with the household once they are home; lines in `docs/writing/households.md`, "Lessons".
- **No grind, either way:** nothing may require a skill level. If a step seems to need one, stop and ask.
- **Garrick's piece:** at the Forge with Garrick in the company and his wish open, pass `garrickMakes: true` to `craft`, then `fulfilWish` with `madeBy: 'garrick'`.
