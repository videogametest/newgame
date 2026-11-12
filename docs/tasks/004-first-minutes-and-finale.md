# 004: First five minutes and the valley finale (milestone 3)

Status: open

## Goal

A new player can start the game, learn it without being told, save their progress, and reach a real ending for the first valley. Scoped in `GAME_DESIGN.md` section 8, milestone 3. Follow section 10 for interface and section 9 for the finale.

## Do

1. **Title screen** with Continue and New Game, over a slow view of the valley.
2. **Local saves** in `localStorage` with a `version` field: autosave on capture, on resting, and every few minutes. Continue restores the hero, squad, captured places, opened chests, discovered places, and time of day.
3. **Control prompts** that appear the first time each control is needed and never again once used.
4. **A first nudge:** a villager at the start who points the hero toward the nearest camp, and that camp shown as the unlabelled compass mark.
5. **The valley finale:** when the last place is freed, the night festival in the village, then the road toward the castle opens and is marked on the map.

## Rules

- The game still has no title. Use the placeholder "Untitled Valley" on the title screen, read from data so it changes in one place.
- Add a headless test that plays from New Game to the finale using the bot, and one that saves, reloads, and checks the state matches.

## Done when

- A fresh browser profile can go from title screen to finale with no instructions outside the game.
- Tests, typecheck, and build pass. Merged, deployed, and logged in `docs/status.md`.
- Stop after this task. Do not start milestone 4.
