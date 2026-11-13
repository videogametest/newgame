# Review 026: the landmarks are built, and the far valley was behind the sky

13 November. For Viktor. A hand-over, like review 022. Typecheck, 778 tests, build, and the walk gap (97.0 m) pass. Frames: `docs/pr-media/review026/`.

## The sky was hiding the far half of the valley

`DOME_DIAMETER` in `src/render/valley_sky.ts` was 1,700, so the sky was a shell 850 m from the camera, and it writes depth. From the start, everything past 850 m was drawn behind it: the far rim, its forest, and the castle. It is now 2,300. Compare `arrival-18.png` with any earlier arrival frame: the valley now has a far side.

## What is built: `src/landmarks/` (Claude's)

One call, already wired in `loadWick()`: `buildLandmarks(scene, { heightAt, shadow })`, and `landmarks.update(dt, lighting)` each frame.

| Place | What stands there |
| --- | --- |
| The Mill | The watermill at the bank with its wheel toward the river, the grain store, a camp of three tents east of the road, Bran's woodpile, the goose pen, the yard fence, the bell, the lantern, two banners |
| The Forge | The smithy, the stone strongroom, the coal heap and the hatch behind, the anvil outside, the east fence with its loose rail, tents, bell, lantern, banners |
| The Watch-house | A walled yard 40 m by 32 m with the soldiers' road running through it, a gate where the road comes in and one where it leaves, the tower, the barracks, tents, targets, racks, bell, lantern, three banners |
| The castle | Beyond the rim: one dark shape against the sky at every hour, never lit and never hazed away |
| Elsewhere | The patrol hut; the cold brazier on the signal hill; seventeen family stones along the road in; a cold fire at each of the five campfire stops; a signpost with arms at each of the four junctions |

- **State:** `landmarks.setPlace('mill', 'freed')` takes the banners down, lights the lantern, turns the wheel, and lights the forge. Every place starts held. Task 004 calls it.
- **Cost:** everything that never moves is merged into one mesh. Arrival view: 268 draw calls with all of it in. The budget is 300, so there is little room: say so in `docs/status.md` if anything you add takes it over.
- `window.__valley.meshCounts()` now lists what is being drawn, by name. Use it when a draw-call figure surprises you.
- `src/landmarks/landmarks.test.ts` holds the plan: each place has its bell, lantern, fire, and banners; nothing but a gate stands on a road; everything is on dry ground; the Mill's wheel reaches the water.

## For you, after review 025's list

1. **Make them solid.** `landmarkSolids()` in `src/landmarks/plan.ts` gives every building, wall, and tent as a turned square. Add them to `VALLEY_SOLIDS` beside Wick's houses. The Watch-house's two gates stay open for now.
2. **Add the tour views:** `mill` from (-160, 82) looking at (-182, 58); `forge` from (62, -154) looking at (38, -176); `watch_house` from (-124, -170) looking at (-170, -192); `family_stones` from (196, 210) looking at (110, 124).
3. **Trees inside the places.** Keep scenery out of a 30 m circle round the Mill and the Forge and out of the Watch-house's yard.
4. **Add each place to `VALLEY_STOPS`** and measure the walk gap again.

## Not done

Nobody stands in any of it, the geese are not there, the gates do not open, and the supper table is not laid. Those are task 004.
