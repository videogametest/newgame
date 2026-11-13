# Review 021: the hill's summit, and the open questions

12 November, evening. `main` at `980e80e` (PR #38). Answers only; nothing here is a first-look review. Measured here with `valleyHeightAt`; the tests and build were not re-run.

## The 64.8 m ground is the signal hill

It is not a separate ridge, and nothing is reshaped. The marker at (-78, -296) stands at 63.1 m on the hill's south side. The ground rises smoothly from it, 1.7 m over 13.6 m, to the hill's own summit at (-82, -309), 64.8 m, where the slope is level. `docs/tasks/003-layout.md` already records this: "Highest ground: 64.8 m, 13 m from the hill's marked top."

Measured: everywhere more than 30 m from the marker, the highest ground on the whole map is 60.4 m. More than 40 m away it is 58.8 m, on the east ridge.

1. **Un-skip the test and compare against the hill, not the marker.** "All ground more than 30 m from the signal hill's marker is lower than the marker's own height." It passes today with 2.7 m to spare.
2. **The marker does not move.** The brazier, the hill path's end, and every sight line were measured from it, and the walk gap has 3 m of margin. The summit behind it is simply the top of the hill.

## PR #38

- **The gate wall is sound as a rule,** and the test that nothing beyond it is reachable is the right one. The second opening you found and closed is exactly what that test is for.
- **It must be drawn before anyone sees it.** The design (section 4, "The edge is the land") says a barred timber gate across the soldiers' road, between cliffs. An invisible wall is the one thing the edge may never be. This goes on step 2's list; it does not block the items in hand.
- **The rim capped at 58 m** is right, and is what the layout asks for.

## Your open questions from PR #37

**a. The patrol hut: "closed by its own rim", or a 60 m opening?** Both, and they do not conflict. The opening is in the valley's main rim, so the hero can walk into the hollow. The hollow is then closed on its far side by its own rim, steeper than 0.7 all the way round. If the edge-closed test passes with the hollow reachable, it is built as designed. Keep it.

**b. The stepping stones, 1.75 m below the banks.** Cut a landing at each end. Along `stones_path`, for the last 6 m before each end of the stones, the ground ramps down from the bank's height to the stone top (2.3 m): a worn cut in the bank, the path's width plus a metre each side, at a grade of about 0.3. Then un-skip the bank-to-bank test. The stones do not rise and the banks elsewhere do not change.

**c. The signal hill test walking only reachable cells.** Confirmed, and now that the rim is capped the stronger test in item 1 holds as well. Keep both.

**d. Your test edits** (`reachableFromStart`, the gorge samples skipped in the bank-slope test, the unused constant). Accepted.

**e. The pace rule not confirmed in play.** Mine to check: I will walk it when step 2 is up for review. Nothing for you to do.

**f. The walk gap's 3 m margin.** Leave it. Do not tune stops to widen it. Step 2 adds what closes it for real.

**`view_ridge_north` moved 8 m** to (250, -214). Accepted; `layout.json` already has it.

**The forge bridge:** your reading is right. Only the water under it is blocked.

## Next

Go on to review 018 items 6 to 9. Nothing is waiting on Greg.
