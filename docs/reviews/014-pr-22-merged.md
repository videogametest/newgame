# Review 014: PR #22 merged; the style test is closed; task 003 starts

Reviewed `main` at `6c03bbb`. The only new work by Viktor is PR #22 (`e694b90`): the review 005 rework and the review 008 scale fix. No pull requests are open.

Checked on `6c03bbb`: `npx tsc --noEmit` exit 0; `npx vitest run` 36 files, 523 tests pass; `npm run build` exit 0. The PR touched only `src/styletest/styletest.ts`, the capture script, `docs/pr-media/`, and `docs/status.md`. Nothing in Claude's paths.

**Not a first-look item.** This is the style test, and its buildings are retired (review 012). Nothing here goes to Greg. The first-look bar applies from task 003.

## What is sound

- **Scale (review 008).** `scale-doorway-12.png`: the hero and the brute stand in house A's doorway with the lintel above both heads. In `item-house-a-18.7.png`, `item-watch-18.7.png`, and `item-mill-23.png` a storey is a little over a person, the well ring is at the hip, and the mill wheel is taller than a person and below the eaves. The rule was met before it was replaced.
- **Lighting.** Dusk is orange and rose with the windows just lit (`row-west-18.7.png`); night has warm windows, door pools, and one lantern against a cold blue ground (`row-east-23.png`, `item-mill-23.png`). This is what task 003 carries over.
- **Villagers.** `villagers-front-12.png`: four adventurers each beside the same model with hat, mask, hood, or cape removed. Each reads as an ordinary person. Review 007's decision stands.
- **The door check** in `scripts/styletest_capture.mjs` fails the capture if a door is shorter than the tallest character, and the status entry says plainly that it measures the door module's box, not the clear opening. That honesty is what I want in every entry.

## What must change

1. **Start task 003 now.** It was waiting only on this merge. Read the current brief: it was rewritten for design versions 26 to 29 (KayKit Medieval Hexagon buildings at `BUILDING_SCALE` 8, the people's proportions and outline from `src/styletest/upgrade.ts`, rooms entered by a fade, Hesper's cottage from `?styletest=room`, hearths as campfires). Log each step as "not ready for first look" until the bar is met.
2. **Carry the door check into task 003 as a measured opening.** In Wick the test is the door's clear opening against the tallest person plus a head, not a bounding box. The brief already asks for the frame of the hero and the brute at a house door.
3. **Do no more work on the Kenney panel buildings** in `src/styletest/styletest.ts`. Reuse its time-of-day function, sky, window glow, and door pools. Leave the rest as it is.
4. **Bring the stream table in `docs/status.md` up to date** in your next entry. Stream B still shows PR #21 as open and lists a villager-set search and a sign question as blockers. PRs #21 and #22 are merged, the search was cancelled in review 007, and nothing blocks task 003.

Task 002b is now marked done (I changed its status line, since its "one fix left" pointed at a retired rule).

## Your questions

- **Which height is the target, 1.8 m or the measured 2.17 to 2.66 m?** Answered in review 012: your measurement is right. People are about 2.2 m as modelled, more with a hat. Do not rescale them. Everything else is sized from them.
- **The lantern basis.** Review 012: about 4.4 m, twice a person.
- **Sign text at 1280×720.** Review 007: leave it. Signs are labels for the test and are not in the game.
- **The `node_modules` link on `main`.** My mistake, removed in `51dca0a` and ignored from now on (review 013). If packages go missing after a pull, run `npm ci`.
- **The push that failed with "--mirror can't be combined with refspecs".** The merge landed, so nothing is outstanding. If it recurs, write the exact command and error in `docs/status.md` and keep working on the branch.
