# Review 018: the layout in code, and the sky (PRs #26, #27, #28)

12 November, the hourly review. `main` at `44d54e9`.

**Not ready for Greg's first look.** Still missing against the bar: Wick, Hesper's lit window, scenery, moving water, sound, music, the reshaped people, tour mode, and the measured checks. There is also no frame yet taken from the new start, so the arrival view has not been seen by anyone.

Checked here: `npx tsc --noEmit` exit 0; `npx vitest run` 50 files, 644 tests pass; the generator's `--check` passes; `npm run walk-gap` passes at 92.7 m. Not checked: the build, the smoke test, and the live site.

## Sound

- The layout is generated from `layout.json` and nothing was moved. The sight lines match the brief's table to the centimetre and are tests.
- The status entry says plainly that the road grades are not met and gives the table. My own measurement agrees with it.
- Draw calls are now counted per frame: 54 to 56 with the hero in view. Review 016 item 1 is closed.
- The stars are a field and the moon rises. The sun and the moon move.
- Leaving the castle out of the walkable-places test is right.

## What must change, in this order

1. **The sun sets in the wrong part of the sky.** Measured from `lightingAt`: it rises at bearing 333 (north-north-west) and sets at 115 (east-south-east), which is behind the hero at the start. This was written before the layout fixed the compass. It rises at 90, stands in the south at noon, and sets at 270, so the last light falls across Wick from the left of the arrival view (`003-layout.md`, item 5). Test the three bearings.
2. **The rivers are trenches.** The bed is 14 to 17 m under the surface, the banks are cliffs (the slope of 2.9 on the east road is one of them), and the "walkable" crossings put the hero on that bed: at the ford the hero would walk 17 m under water. The cause is the ground, not the carving: the land beside the rivers stands 5 to 9 m above the water, so a narrow river can only be a ravine. Lower the land along each river into a broad, gentle valley, and cut a shallow channel in it. Design version 34, section 4, "Banks and beds" and "The crossings", gives the figures. The sight-line tests say whether a rise has been lowered too far.
3. **The river out runs dry.** Its last 81 m climb the rim to 23 m. Cut the gorge through to the map's edge. The 28 m dry at the head of the river in is the falls and is fine. Test that each river's centre line is under water from end to end, apart from the falls.
4. **Crossings are walked on a surface, not on the bed.** Add a pure `walkSurfaceAt(x, z)` in `src/core/world`: the bridge deck or the stone tops inside a crossing's footprint, and `heightAt` everywhere else. The footprint is a strip as wide as the road, not an 11 m disc. The ford needs no surface of its own once its bed is 0.4 m down.
5. **The edge is still an invisible wall.** In play the hero is stopped by `insideValley`, the 800 m square; `isWalkableGround` is used only by the walk-gap script. And the rim would not stop anyone: 5 m past the edge radius, 349 of 360 bearings are gentle enough to walk. Make the rim steeper than 0.7 outside the two openings, and make the walking rule use slope. Keep the radius as a test of the land (nothing walkable beyond it), not as a rule in the walk. Version 34, "The edge is the land".
6. **Grade the roads and paths.** Limits are now in the design: roads 0.2 along their line, paths 0.45. As built: road in 0.55, east road fine apart from the ford, hill path 0.73 with 20 m blocked, ridge path 0.99 with 58 m blocked. Do it by shaping the hills (a shoulder under each path, a lower saddle on the ridge), then a light smoothing along the line. No embankments. The hill path climbs 51 m in about 100 m, so it has to be longer: you may bend it and the ridge path (`003-layout.md`, item 4). Test every road against its limit.
7. **The sky frames.**
   - The noon sun is a dull beige disc on plain blue, with no glow and no hero shadow in the frame. Review 017 asked for the shadow: take the frame from the ground with the sun in the upper part and the shadow in the lower.
   - The stars read as grey squares, worst at 19:00, where five large ones show. Make them round or a single pixel, and vary their brightness.
   - `aimAt` leaves the camera pointing up, so `night-0` and `dawn-6` in `review016-b` show only sky. Reset the aim after each aimed shot.
   - The moon is a flat blue disc. It can wait for step 2.
8. **Take the four standard frames again from the new start** once items 1 to 6 are in, and add the measured ground-against-sky figure for each.
9. Still open from reviews 016 and 017: the arena's HUD, the hint text, the clock in the corner, the hero's proportions, the flat ground, and the rest of step 1.

## Design changes made here

`GAME_DESIGN.md` is version 34. Section 4 gains four rules: slopes, banks and beds, the crossings, and the edge. `docs/DECISIONS.md` has the reason. `docs/tasks/003-layout.md` gains items 4 and 5 under "For Viktor".

## Your questions

- **Who grades the roads?** You do; `src/core/world` is yours. Item 6 says how, and what you may move.
- **Is 0.7 the slope the hero can climb?** Yes. It is now in the design, with full pace up to 0.3.
- **"Blocked: Claude review of the first-look bar before step 2."** Not blocked, as review 017 said. Step 2 may start as soon as the land is right. Correct the stream table, which also still lists the layout PR as open.
- **The river bank that the hero "does not walk" (the 6 m corridor).** Remove it with item 2. Banks are walked, and the water is waded and then swum.
- **The live check after PR #28** is not in the status file yet. Record it.

## Needs Greg

Nothing to decide. One thing to know: I closed the north-west pass with a barred gate across the soldiers' road (version 34). It is a small piece of the story's furniture; say if you would rather it were something else.
