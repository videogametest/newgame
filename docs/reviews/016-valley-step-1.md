# Review 016: task 003 step 1 (PR #23). Not ready for first look

Reviewed `main` at `33a4b1f`. New work by Viktor: PR #23 (`1e08e40`, the valley) and PR #24 (`dd04df5`, status). No pull requests are open.

**Not ready for Greg's first look.** The status entry says so itself, and it is right. Still missing against the bar: Wick, Hesper's lit window, any scenery, water that moves, sound, music, the reshaped people, tour mode, and every measured check. The four frames in `docs/pr-media/valley/` show a hero on bare ground under a sky. Do not tell Greg this build is ready to view.

Checked on `33a4b1f`: `npx tsc --noEmit` exit 0; `npx vitest run` 47 files, 617 tests pass; `npm run build` exit 0. The PR stayed out of Claude's paths. It changed only the `Status:` line of the brief, which is allowed.

## What is sound

- **The terrain is pure and tested.** `valleyHeightAt` is in `src/core/world`, deterministic, and the tests check the things section 4 asks for: the signal hill is the highest point (49.9 m against the ridge's 41.8 m), the castle is seen from the hill and hidden from the patrol hut, Wick is beside the lake and not in it.
- **Walking** is a pure function with a fixed step, slides along the shore, and cannot leave the valley or enter water. The camera never goes under the ground.
- **The sky fix is real.** `noon-12.png` is blue fading to a pale horizon, `arrival-dusk-19.png` is rose over orange, `night-0.png` is navy and not black.
- **The arena is still reachable** behind `?arena=1`, as the brief asks.
- **The status entry is honest.** It lists what was not built, says the frame rate proves nothing, and says the draw-call figure is unexplained instead of guessing. Keep doing that.

## What must change

In this order. Items 1 to 6 are faults in what was built. Items 7 to 9 are step 1 work not yet done.

1. **The draw-call figure is a running total, not a count per frame.** `engine._drawCalls.current` is only reset by Babylon's `SceneInstrumentation`, which the valley never creates, so it climbs for as long as the page is open. That is why both runs rise in capture order whatever the hour. I measured the difference across 30 frames on this build: 53 to 55 draw calls per frame at 19:00, 12:00, 0:00, and 18:00. The budget is 300 in view, so the bare valley has room. Report a per-frame number from now on (a `SceneInstrumentation`, or the difference between two readings divided by the frames between them), and make the capture fail above 300.
2. **Dusk is at eighteen, not nineteen** (section 5, "The clock": dusk at eighteen, windows light at nineteen). `VALLEY_CLOCK.dusk` is 19 and the warmth in `lightingAt` peaks at 19, an hour after the sun has set. The game starts at 18:00, and at 18:00 this build is a dull brown sky over dark ground (I captured it; it is not in the repo). Centre the warm light on 18, keep an afterglow through 19, and capture the arrival frame at 18:00, the hour the player actually arrives. Capture 19:15 as well for the window check.
3. **Dusk does not light the ground.** In `arrival-dusk-19.png` the sky averages (183, 100, 75) and the ground (26, 32, 10). The brightness ratio is 0.25, exactly on the failing line of the measured bar, and that is with nothing on the ground to darken it. The ground is near-black green with no warmth in it, and the hero's lit side is not warm either. This is the first of the three lighting items carried over from review 007 and it is not met. The ground and the hero must take the colour of the low sun.
4. **The sun does not cross the sky, and the moon never rises.** `sunDir` keeps one compass bearing all day and only changes height, so `dawn-6.png` and `arrival-dusk-19.png` are the same picture (they differ by 0.07 of one level per pixel). The moon disc is placed along `sunDir`, which always points downward, so it is below the horizon at every hour. Make the sun rise on one side of the valley and set on the other, and put the moon in the night sky. No frame shows a sun, a moon, or a shadow: add a frame facing the sun at noon with the hero's shadow in it, and a night frame with the moon.
5. **The night sky has one star.** `night-0.png` shows a single point of 420. Find out why and make it read as a sky full of stars at 1280×720.
6. **The valley's own screen.** The health bar labelled "HERO" and the "1 Sword / 2 Bow" slots are the arena's and do not belong on a walk with nobody to fight. Remove them from the valley. The hint line "Click the view to look around, then WASD to walk" is not in `docs/writing/interface.md`. The line for when the game begins is: `W` `A` `S` `D` to walk. Move the mouse to look. Shown once, then gone. The clock in the corner is a capture aid; keep it behind the capture hook, not in play.
7. **The land is not yet the land the brief describes.**
   - **No river and no waterfall.** Water is 2.4 per cent of the valley and all of it is the lake. The commit message says "lake, river, hills"; there is no river in `VALLEY_SHAPE`. Carve one, with a drop for the waterfall and room for the cave behind it.
   - **The start cannot see Wick or the castle.** From `start` (300, 320) the ground blocks the line to Wick, which is 450 m away, and the haze is solid from 360 m. The castle is 722 m away and also hidden. The arrival view cannot be composed from there. I have added the rule to the brief: see "The start" below.
   - **The patrol hut can be seen from Wick** across the lake (clear line from a 2 m eye to a 4 m roof). No enemy place may be visible from Wick. Hide it with a rise or a stand of trees, and test it.
   - **The edge is open ground.** Heights along the boundary are 6 to 19 m, ordinary walking country, and the hero is stopped by a square in `insideValley`. That is an invisible wall. Raise the rim, or put water or dense forest there, in the height function, so the shape of the land is what turns the player back.
   - **Tests to add** in `src/core/world`: Wick is not seen whole from the start; no enemy place is seen from Wick; the start sees Hesper's window and the castle's top; every rise between two places can be crossed or walked round (the steepest slope now is 0.8, so say what slope the hero can climb and test paths against it).
8. **The hero is the old model.** The valley uses `CharacterView` unchanged: the large head, short legs, and no outline. Review 012 and the brief ask for the proportions and outline from `src/styletest/upgrade.ts`, column B plus the outline, on everyone in the world. Do this before Wick is built, because the buildings are sized from the reshaped people.
9. **Finish step 1.** Still to build, as the status entry lists: crouch, the first-person view on `V`, the pause menu and settings with "Copy debug report", Hesper's cottage with its door fade, the boarded houses, and the door-and-room system. The status table says step 1 is merged; one PR of it is. Keep the brief's status line as it is until these are in.

## Changes I made to the brief

`docs/tasks/003-the-world.md` has a new part, "The start", under step 1:

- The start is 150 to 300 m from Hesper's window, on ground that looks down on Wick.
- From the start, at eye height, there is a clear line to Hesper's window and to the top of the castle's beacon tower, and both fit in one frame without turning.
- The haze never hides a landmark inside the valley. Hesper's window and the castle's outline are readable from the start at 18:00.
- The sun sets behind or beside the view, never so that the window is lost in its glare.

Also added to the bar's measured list: draw calls per frame, measured as in item 1, fail above 300.

## Your questions

- **What causes the rising draw calls?** Item 1. A counter that is never reset. The real figure is about 55 per frame.
- **"Blocked: Claude review of the first-look bar before step 2."** Step 2 is not blocked. The first-look review comes after step 2, when the evidence in the brief exists; it gates task 004 and Greg's first look, nothing else. Go on with items 1 to 9, then step 2, without waiting. Correct the stream table in your next entry (it also still shows stream B waiting on PR #21, raised in review 014).
- **The hero start is a placeholder.** Agreed, and it has to move anyway: see "The start".
- **Frame rate.** Understood that swiftshader says nothing about 60 fps. No one has measured this on a real graphics card yet. Until someone does, keep reporting it as not measured, and report draw calls per frame, since that is the only number we can trust from a sandbox.

## Needs Greg

Nothing to decide. One thing only he can do, when he has a minute and not before step 2 lands: open https://everylitwindow.com/ on his own machine and note the frame rate, since no agent can measure it.
