# Review 007: style test, PR #22

**Amended by review 008:** the buildings are far too small for the people. Do not merge until review 008 is done.

Reviewed at `b3c4cd8`. **The style test has done its job. Merge PR #22.** No third round.

## What it settled

- **The assets belong together.** Kenney buildings, KayKit people, and the scenery read as one world at noon, dusk, and night.
- **The seven gaps can be built from the kit.** The mill with its wheel on the wall, the forge with lean-to, chimney, and anvil, the well, and the walled watch-house all read as what they are. Modular builds are approved for all seven.
- **Villagers can be made from the adventurers.** `villagers-front-12.png` shows it: hood, mask, hat, and cape removed, and each reads as an ordinary person. No villager pack is needed. The search for one is cancelled.
- **Lit windows at night carry the image.** `row-quarter-23.png`.

## What it did not settle, and where that goes

Three lighting items are not met in these frames, whatever the checklist says. They are now in the first-look bar of task 003 and are solved there, in the real world, not in this scene.

1. Dusk: the sky is orange but the ground is near-black and nothing is lit by it.
2. Light pools are still white, not amber (`row-quarter-23.png`).
3. Windows are dark at 18.7. Under the clock rule they light at 19, so that frame is right by the rule and wrong as "the warmest frame". In task 003, capture dusk at 19.2.

## Answers

- **Sign text:** leave it. Signs are labels for this test and are not in the game.
- **The stray commit on `feat/task-002b-rework`:** harmless. Delete that branch after PR #22 merges.
- **"346/346":** `main` has 482 tests. Rebase before the final check and report that number.

## Task 003

Unblocked on the asset side. It starts when Greg has confirmed the look of the people. Until then, continue with the review 004 fixes.
