# Review 024: the morning after the overnight run

13 November, morning. For Viktor. `main` is at `b0591a0`. Typecheck, 715 tests, build, and the walk gap (97.0 m) pass. Frames: `docs/pr-media/review024/`.

## What the night did

Merged and live: items 1, 2, 4, 6, 8, 9. Sound, all six. The scenery pass in particular changes the valley from a model to a place.

Stopped at 00:48 in the middle of item 10. Nothing was blocking: the run ended. Items 3, 5, 7 were stuck or skipped; 10 is half done on a branch that was never pushed; 11 and 12 were not started.

## Done by Claude this morning

**Item 3, the hero as designed.** You were right that the doors failed, and right that it was mine to settle. Buildings are now at scale 9.6, not 8: a 2.5 m door against a 2.16 m hero. `OPENINGS` in `src/village/build.ts` gives the height of each opening's middle, not its sill; the comment now says so. The proportions live in `src/render/proportions.ts` and `CharacterView.asDesigned` applies them, with the outline.

**Item 5, water takes the sky.** It was skipped without a note. `src/render/valley_water.ts` (Claude's): one mesh, one shader, no extra passes. Across the water you see the horizon's colour, down into it the water's own, and the bed where it is shallow; ripples move and catch the low sun.

**Item 7, the grades.** `src/core/world/grading.ts` (Claude's). Not a blend toward a target, which is what kept moving the failure from road to road. Each road's profile along its line is replaced by the nearest profile that is nowhere too steep, cutting crests and filling dips equally, and the land either side moves by the same amount over a wide shoulder. Roads are graded one after another, each on the land the earlier ones left, and pinned at crossings, in water, inside Wick, and at the gate.

| Road | Before | After | Limit | Largest cut / fill |
| --- | --- | --- | --- | --- |
| road_in | 0.55 | 0.18 | 0.2 | 0 / 10.2 m |
| mill_road | 0.46 | within | 0.2 | 2.1 / 0.5 m |
| east_road | 0.29 | within | 0.2 | 0.2 / 0.1 m |
| soldiers_road (inside the gate) | 0.38 | within | 0.2 | 1.3 / 6.5 m |
| hill_path | 0.73 | 0.40 | 0.45 | 0.8 / 14.3 m |
| ridge_path | 0.99 | 0.40 | 0.45 | 11.9 / 6.2 m |

`grading.test.ts` holds every road to its limit at half-metre steps. Three exemptions, each because another rule governs there: within 9 m of a crossing's line (the crossing's rules), inside Wick's box (the shelf's rules), and beyond the gate. None of the nine tests your attempt broke is touched: rim cap, gate, sight lines, signal hill, river depth, bank slope, ford, stepping stones all pass unchanged.

`valleyHeightAt` is now: land, then Wick's shelf (`shelvedHeightAt`), then the graded roads.

## Still open, in this order

1. **Item 11, tour mode.** Do this first: every review from here needs it.
2. **Item 12, the standard frames,** from the tour.
3. **Item 10, the sky.** Your branch was not pushed; start from `main`. The noon frame showed the hero because `aimAt` aims the camera from behind the hero: move the camera in front or hide the hero for aimed shots.
4. **A tree stands in the arrival view in front of Wick,** just left of Hesper's house. It clears the 12 m rule but hides three houses from the first view. Widen the keep-out to 25 m either side of the line from the start to Hesper's window, for its last 150 m.
5. Trees cast no shadows and have no collision. Shadows first, for the trees within 80 m of the hero only.

## On running overnight

The queue worked: no item waited on anyone. What ended the night was the run itself stopping. If your runs have a time or turn limit, say what it is in `docs/status.md`, so the queue can be cut to fit and Greg can restart you when it ends.
