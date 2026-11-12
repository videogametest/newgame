# 008: First five minutes and the valley finale (milestone 8)

Status: open

## Goal

A new player can start the game, learn it without being told, save their progress, and reach a real ending for the first valley. Scoped in `GAME_DESIGN.md` section 8, milestone 8. It is built last so that the opening, the Stane fight, and the pacing are tuned once, against the finished systems. Follow section 10 for interface and section 9 for the finale.

## Do

1. **Title screen** with Continue and New Game, over a slow view of the valley.
2. **Local saves** in `localStorage` with a `version` field: autosave on capture, on resting, and every few minutes. Continue restores everything in the game state: the hero, skills, perks and their mastery, inventory, storage, squad, freed places, bandits won back, opened chests, stolen goods returned, discovered places, and time of day.
3. **Control prompts** that appear the first time each control is needed and never again once used.
4. **A first nudge:** Hesper greets the hero and Bram, takes the hero on as an apprentice, and sends them to watch the Mill before attacking it. The Mill shows as the unlabelled compass mark. The control prompts teach crouch, marking, and the first arrow there.
5. **The turn** (section 9): after the second place is freed, Stane retakes the first one that night. Its lantern goes dark, its person flees to the village, its reward is lost, and stronger defenders hold it. The recovery level falls. Hesper has a line for the next morning.
6. **The Captain.** Stane is a heavy enemy at the Watch-house with more health, two or three distinct telegraphed attacks, and a guard drawn from every unit type. He cannot be broken by morale and is not staggered by ordinary hits; a perfect dodge opens him. The Watch-house cannot be taken until the retaken place is freed again. Beaten, the Captain yields and speaks, and is not killed.
7. **The valley finale** in the five beats listed in section 9, ending with the hero lighting the window of the Fairlow house while the wren sings, then the road toward the castle opening on the map.

## Rules

- The game is called "Every Lit Window". Show it on the title screen, read from the single title constant.
- Add a headless test that plays from New Game to the finale using the bot, including the turn and the Captain, and one that saves, reloads, and checks the state matches.
- Use `docs/writing/hesper.md`, `stane.md`, and `bram.md` exactly as written. If one of them is still marked not yet written when you reach this task, stop and say so in `docs/status.md` rather than drafting the story's key lines yourself. For anything else you draft, including at least six campfire exchanges, and list them all in `docs/status.md` so they can be reviewed and rewritten. Reveal only what section 9 says the first valley reveals; never state or imply "The answer". Never use a pronoun for Wren.
- Balance target for the Captain fight: the skilled bot wins with 15 to 50% HP left; a sword-only bot that never dodges loses.

## Done when

- A fresh browser profile can go from title screen to finale with no instructions outside the game.
- Tests, typecheck, and build pass. Merged, deployed, and logged in `docs/status.md`.
- The pacing test from task 006 must still pass with the turn and the Stane fight in place.
- Stop after this task. Do not start milestone 9.
