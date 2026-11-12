# 008: First five minutes and the valley finale (milestone 8)

Status: open

## Goal

A new player can start the game, learn it without being told, save their progress, and reach a real ending for the first valley. Scoped in `GAME_DESIGN.md` section 8, milestone 8. It is built last so that the opening, the Stane fight, and the pacing are tuned once, against the finished systems. Follow section 10 for interface and section 9 for the finale.

## Do

1. **Title screen** with Continue and New Game, over a slow view of the valley.
2. **Local saves** in `localStorage` with a `version` field: autosave on capture, on resting, and every few minutes. Continue restores everything in the game state: the hero, skills, perks and their mastery, inventory, storage, squad, freed places, bandits won back, opened chests, stolen goods returned, discovered places, and time of day.
3. **Control prompts** exactly as listed in `docs/writing/interface.md`: each appears the first time it is relevant and never again once the player has done the thing. The title screen, the notices, and what is shown when the hero falls come from the same file.
4. **A first nudge:** Hesper greets the hero and Bram, takes the hero on as an apprentice, and sends them to watch the Mill before attacking it. The Mill shows as the unlabelled compass mark. The control prompts teach crouch, marking, and the first arrow there.
5. **The turn** (section 9): after the second place is freed, Stane retakes the first one that night. Its lantern goes dark, its person flees to the village, its reward is lost, and stronger defenders hold it. The recovery level falls. Hesper has a line for the next morning.
6. **The Stane fight** exactly as specified in section 9: scouting and thinning beforehand, the three phases, the bell and who answers it, the yield, and resuming from the phase reached. His attacks, commands, and phase thresholds are data and tuning.
7. **The valley finale** in the eight beats listed in section 9, from Hesper's arrival through Stane leaving for the castle, the festival, the Fairlow window with the wren singing the first phrase of the melody, and the road opening on the map.

## Rules

- The game is called "Every Lit Window". Show it on the title screen, read from the single title constant.
- Add a headless test that plays from New Game to the finale using the bot, including the turn and the Captain, and one that saves, reloads, and checks the state matches.
- Use `docs/writing/hesper.md`, `stane.md`, and `bram.md` exactly as written. If one of them is still marked not yet written when you reach this task, stop and say so in `docs/status.md` rather than drafting the story's key lines yourself. For anything else you draft, including at least six campfire exchanges, and list them all in `docs/status.md` so they can be reviewed and rewritten. Reveal only what section 9 says the first valley reveals; never state or imply "The answer". Never use a pronoun for Wren.
- Balance for the Stane fight, on Dusk: the skilled bot wins with 15 to 50% HP left; a blade-only bot that never dodges loses in phase 2. On Lantern that blade-only bot can win. A bot that thinned the guard by stealth beforehand finishes phase 1 faster than one that did not.
- Test the bell: with no bandits won back the gate stays empty, and with some won back that many appear.

## Done when

- A fresh browser profile can go from title screen to finale with no instructions outside the game.
- Tests, typecheck, and build pass. Merged, deployed, and logged in `docs/status.md`.
- The pacing test from task 006 must still pass with the turn and the Stane fight in place.
- Stop after this task. Do not start milestone 9.

## From design version 30

- **Where you left off:** on Continue, `showCatchUp` and `whereYouLeftOff` (`src/core/notes/notes.ts`); words in `docs/writing/interface.md`. Store the last-played time with settings, not in the save.
- **The title's small line:** time one whole playthrough and put the measured hours in it. Until then it stays out of the build.
- **Five new first-time prompts** in `docs/writing/interface.md`: Notes, holding aim, the pommel, binding, Hesper's loose thread.
- **Standing watch (design v31):** `src/core/valley/watch.ts`, `GameState.watch`. Offered at freed lanterns at dusk once `stane_yields` is reached; lines in `hesper.md` and `interface.md`. The raid uses `raidTonight`'s party and difficulty, with the valley's answers applied. No place is ever retaken by it.
