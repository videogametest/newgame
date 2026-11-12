# Review 017: task 003 step 1, what review 016 did not cover

12 November, the hourly review. It ran at the same time as review 016 and looked at the same work (PR #23, `main` at `33a4b1f`). **Review 016 stands.** Where the two overlap, 016 is the one to follow: the draw-call fault, dusk at eighteen (already fixed by Claude in `601aa62`), the old hero model, the arena's HUD, the flat ground, the one star, and the ruling on PR #25. This file adds only what 016 does not say.

**Not ready for Greg's first look.** Still missing against the bar: Wick, Hesper's lit window, scenery, moving water, sound, music, the reshaped people, tour mode, and the measured checks.

Checked on `main` at `b575f6a`: `npx tsc --noEmit` exit 0; `npx vitest run` 48 files, 622 tests pass; `npm run build` exit 0 (on `33a4b1f`). My own count of draw calls agrees with 016: 53 to 55 per frame.

## Sound, beyond 016

- The terrain tests check what section 4 asks: the signal hill is the highest point (49.9 m against the ridge's 41.8 m), the castle is seen from the hill and hidden from the patrol hut, and Wick is beside the lake.
- The arena is still reachable behind `?arena=1`.

## What must change

These come after review 016's item 1 and alongside its items 2 to 6. Do items 1 and 2 here before building Wick, because Wick's place and the arrival view depend on them.

1. **The land is not yet the land the brief describes.** Measured from `valleyHeightAt`:
   - **No river and no waterfall.** Water is 2.4 per cent of the valley and all of it is the lake. The commit message says "lake, river, hills"; `VALLEY_SHAPE` has no river. Carve one, with a drop for the waterfall and room for the cave behind it.
   - **The patrol hut can be seen from Wick** across the lake (a clear line from a 2 m eye to a 4 m roof). No enemy place may be visible from Wick. Hide it with a rise or a stand of trees.
   - **The edge is open ground.** Heights along the boundary are 6 to 19 m, and the hero is stopped by a square in `insideValley`. That is an invisible wall. Review 016 has already ruled that the valley is a bowl; build the rim into the height function so the land itself turns the player back.
   - **Tests to add** in `src/core/world`: Wick is not seen whole from the start; no enemy place is seen from Wick; every rise between two places can be crossed or walked round. The steepest slope is now 0.8, so say what slope the hero can climb and test the paths against it.
2. **The start cannot see Wick or the castle.** From `start` (300, 320) the ground blocks the line to Wick, which is 450 m away, and the haze is solid from 360 m. The castle is 722 m away and hidden too. The arrival view cannot be composed from there. The rule is now in the brief (below).
3. **The sun does not cross the sky, and the moon never rises.** `sunDir` keeps one compass bearing all day and only changes height, so `dawn-6.png` and `arrival-dusk-19.png` in PR #23 were the same picture. The moon disc is placed along `sunDir`, which always points downward, so it is below the horizon at every hour. That is why 016 found no moon. Make the sun rise on one side of the valley and set on the other, and put the moon in the night sky. Add two frames: facing the sun at noon with the hero's shadow in it, and night with the moon.
4. **The words on screen.** "Click the view to look around, then WASD to walk" is not in `docs/writing/interface.md`. The line for when the game begins is: `W` `A` `S` `D` to walk. Move the mouse to look. It shows once and never again. The clock in the corner is a capture aid; keep it out of play.
5. **Step 1 is not finished.** Still to build, as the status entry lists: crouch, the first-person view on `V`, the pause menu and settings with "Copy debug report", Hesper's cottage with its door fade, the boarded houses, and the door-and-room system.

## Changes to the brief

`docs/tasks/003-the-world.md`, step 1, two new lines:

- **The start.** 150 to 300 m from Hesper's window, on ground that looks down on Wick. From eye height there is a clear line to Hesper's window and to the top of the castle's beacon tower, and both fit in one frame without turning. The haze never hides a landmark inside the valley. The sun sets behind or beside this view, never so that the window is lost in its glare. Each of these is a test.
- **Dusk is at eighteen**, as 016 fixed in code.

The bar's measured list now includes draw calls per frame, failing above 300.

## Your questions

- **"Blocked: Claude review of the first-look bar before step 2."** As 016 says, nothing blocks step 2. The first-look review comes after step 2 and gates only task 004 and Greg's first look. Correct the stream table in your next entry; it also still shows stream B waiting on PR #21 (review 014).
- **The hero start is a placeholder.** Agreed, and it has to move: item 2.
- **The draw calls, and PR #25.** Answered in 016.

## Needs Greg

Nothing to decide. No agent can measure the frame rate on a real graphics card; when step 2 is up, Greg's own machine is the test.
