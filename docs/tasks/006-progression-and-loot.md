# 006: Progression and loot (milestone 5)

Status: open

## Goal

Give the player things to earn, find, make, carry, and keep, as described in `GAME_DESIGN.md` section 6. Scoped in section 8, milestone 5.

## Build in four steps

Open a PR, merge, and deploy after each step, and log each in `docs/status.md`.

1. **Skills and inventory.** All skills in the section 6 table levelling by use, with perks every 10 levels. The inventory, loot window, and storage screen exactly as laid out in section 10, with an icon for every item, the carry limit, the storage chest at Hesper's, equippable gear with material tiers and quality, and gear visible on the character where the models allow.
2. **Loot.** Enemies carrying what you see, strongboxes, stolen goods with their owners and the return flow, unique items starting with Wren's bow, and the pick-up rules. Every item, owner, and unique is a data entry.
3. **Gathering and crafting.** Foraging, hunting yields, wood, ore, and fishing, with regrowth. Fletching and cooking at campfires, with recipes learned by doing, from notes, and from people. Do not build smithing; it belongs to milestone 6.
4. **The apprenticeship.** Hesper's six trials as specified in section 6, the three ranks, the cloak colours, and the perk tiers each rank unlocks. Hesper has several different failure lines for each trial.

## Rules

- Skills, loot tables, recipes, weights, and the stolen-goods flow live in `src/core` as pure, tested logic. All numbers are in data or the tuning file.
- Quality is a small set of fixed bonuses. Do not add random stat rolls.
- Gathering spots look like what they are. Do not add glowing markers or floating icons.
- Saves must include everything added here; add to the save-and-reload test.
- Add a bot test in which the hero fletches arrows from gathered materials and uses them to clear the Mill.

## Done when

- All four steps are merged and deployed and the tests pass.
- Stop after this task. Do not start milestone 6.
