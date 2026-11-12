# 006: Progression, loot, and crafting (milestone 6)

Status: open

## Goal

Give the player things to earn, find, make, carry, and keep, as described in `GAME_DESIGN.md` section 6. Scoped in section 8, milestone 6. This replaces the simple item counts from task 004.

## Build in four steps

Open a PR, merge, and deploy after each step, and log each in `docs/status.md`.

1. **Skills, perks, and inventory.** All skills in the section 6 table with every rule under Skills (accomplishment-based experience, harder feats, diminishing repetition, catch-up, the region cap of 20, overflow into perk mastery, cap keepsakes). Perks as specified under Perks: sources, the fallback so nothing is missable, slots by rank, saved sets, three mastery ranks, and the ledger with hints. The skills screen on `K`. Design the 24 perks for Tallowmere yourself, each obeying the rule that a perk changes how the hero plays, and list them all with their sources, fallbacks, and three ranks in `docs/status.md` for review before building them. The inventory, loot window, and storage screen exactly as laid out in section 10, with an icon for every item, the carry limit, the storage chest at Hesper's, equippable gear with material tiers and quality, and gear visible on the character where the models allow.
2. **Loot.** Enemies carrying what you see, strongboxes, stolen goods with their owners and the return flow, unique items starting with Wren's bow, and the pick-up rules. Every item, owner, and unique is a data entry.
3. **Gathering and crafting.** Foraging, hunting yields, wood, ore, and fishing, with regrowth. Fletching and cooking at campfires, and smithing at the Forge once the smith has returned, with recipes learned by doing, from notes, and from people. Trade as in section 6: the traders who return, and prices and stock that follow the valley recovery level.
4. **The apprenticeship.** Hesper's six trials as specified in section 6, the perk each one teaches, the three ranks, the cloak colours, and the perk slots each rank gives. Hesper has several different failure lines for each trial.

## Rules

- Skills, loot tables, recipes, weights, and the stolen-goods flow live in `src/core` as pure, tested logic. All numbers are in data or the tuning file.
- Quality is a small set of fixed bonuses. Do not add random stat rolls.
- **The pacing test.** A bot plays Tallowmere from the start to the finale, once rushing and once exploring, and the test asserts skill levels, perks earned, and slots at each story beat against the bands in section 6, Pacing. The exploring bot must not reach the cap in its main skills before the turn. This test must pass before the task is done, and it gates every later change to experience values.
- Add a test that proves no perk is missable: for every perk, kill or lose its primary source and check the fallback still grants it.
- Add a test that no skill gains experience from standing idle near enemies or from taking damage.
- Gathering spots look like what they are. Do not add glowing markers or floating icons.
- Saves must include everything added here; add to the save-and-reload test.
- Add a bot test in which the hero fletches arrows from gathered materials and uses them to clear the Mill.

## Done when

- All four steps are merged and deployed and the tests pass.
- Then continue to task 007.
