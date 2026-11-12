# 004: First five minutes and the valley finale (milestone 3)

Status: open

## Goal

A new player can start the game, learn it without being told, save their progress, and reach a real ending for the first valley. Scoped in `GAME_DESIGN.md` section 8, milestone 3. Follow section 10 for interface and section 9 for the finale.

## Do

1. **Title screen** with Continue and New Game, over a slow view of the valley.
2. **Local saves** in `localStorage` with a `version` field: autosave on capture, on resting, and every few minutes. Continue restores the hero, squad, captured places, opened chests, discovered places, and time of day.
3. **Control prompts** that appear the first time each control is needed and never again once used.
4. **A first nudge:** the Lamplighter greets the hero, points them toward the Mill, and the Mill shows as the unlabelled compass mark.
5. **The turn** (section 9): after the second place is freed, the Captain retakes the first one that night. Its lantern goes dark, its person flees to the village, its reward is lost, and stronger defenders hold it. The recovery level falls. The Lamplighter has a line for the next morning.
6. **The Captain.** A named enemy at the Watch-house with more health, a heavier telegraphed attack, and a guard of soldiers and archers. The Watch-house cannot be taken until the retaken place is freed again. Beaten, the Captain yields and speaks, and is not killed.
7. **The valley finale** in the five beats listed in section 9, ending with the hero lighting the window of the family house, then the road toward the castle opening on the map.

## Rules

- The game is called "Every Lit Window". Show it on the title screen, read from the single title constant.
- Add a headless test that plays from New Game to the finale using the bot, including the turn and the Captain, and one that saves, reloads, and checks the state matches.
- Write the Captain's and the Lamplighter's lines yourself, short and plain, and list them all in `docs/status.md` so they can be reviewed and rewritten. Do not answer the question of why the soldiers left.
- Balance target for the Captain fight: the skilled bot wins with 15 to 50% HP left; a sword-only bot that never dodges loses.

## Done when

- A fresh browser profile can go from title screen to finale with no instructions outside the game.
- Tests, typecheck, and build pass. Merged, deployed, and logged in `docs/status.md`.
- Stop after this task. Do not start milestone 4.
