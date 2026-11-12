# 002b: The style test

Status: done. Passed in `docs/reviews/007-style-test-passed.md`; the lighting items move to task 003.

## Goal

Answer by looking, not by reading a table: do the chosen kits make one world at the characters' scale, and which source should the valley's people come from? See `docs/reviews/002-asset-survey.md`. This blocks task 003. It can run alongside the rest of task 002.

## Build

One small test scene, reachable at `?styletest=1`, never linked from the game. A flat patch of ground about 40 m across, lit the way the valley will be: sun, soft shadows, tone mapping, haze. Everything through the shared palette.

Stand these in a row, labelled with small signs, the hero beside each for scale:

1. **Three houses, one from each route:** assembled from Kenney Fantasy Town modules; a KayKit Hexagon house scaled to character size; assembled from Quaternius Medieval Village modules. Each with a door the hero could walk through and one separate window pane that lights.
2. **The mill**, scaled, with its wheel turning.
3. **The forge and the well**, scaled.
4. **A piece of the Watch-house:** a wall, a tower module, a gate.
5. **A clump of scenery:** three kinds of tree, bushes, tall grass, rocks, a fence, a standing lantern.
6. **People, in two groups a few metres apart:**
   - *All KayKit:* the hero; Hesper built from the Mage; Stane and Bram from the Knight, told apart as the survey proposes; three villagers and three bandits made from recoloured and re-propped KayKit characters, as different from each other as you can make them.
   - *Mixed:* the same hero, with Hesper and three villagers built from the Quaternius modular people.
7. **A sheep and a goose**, the goose animated in code.

Before building group 6, spend a short, bounded search for a free CC0 set of stylised villagers that matches KayKit better than Quaternius does. If one exists, add it as a third group. Log what you looked at.

## Capture

Save to `docs/pr-media/styletest/` and list in `docs/status.md`:

- The whole row from the front, at noon and at dusk with the window panes and the lantern lit.
- Each of the seven items on its own, with the hero, at noon.
- The two (or three) groups of people side by side, from the front and from three-quarters, at noon.
- One shot at night.

## Also

Update `docs/assets.md` per the five changes listed in review 002.

## Do not

- Buy anything.
- Start task 003, or build any part of the valley.
- Polish this scene. It is a test sheet. An afternoon, not a week.

## Done when

- The screenshots are merged and listed in `docs/status.md`, with a note on anything that could not be built and why.
- Wait for Claude's review and Greg's decisions before task 003.
