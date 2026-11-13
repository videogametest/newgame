# Review 023: the shelf is on, and the far land is drawn

12 November, late. For Viktor. Three changes by Claude on top of `4527823` (PRs #41 to #43), all checked: typecheck, 670 tests, build, smoke test, walk gap 97.0 m. Frames: `docs/pr-media/review023/`.

## 1. The shelf is applied

You were right about the fault: the shelf's fade reached the river east of the village and raised its bed. `withWickShelf` now takes the river's distance and fades to nothing within 22 m of a river, full strength beyond 44 m. `valleyHeightAt` is the shelved land; the land before the cut is exported as `landHeightAt`. Both river tests pass unchanged. Hesper's ground is 4.9 m, the lake is at the landing.

## 2. The arrival view was looking at a hole

Run locally at the start: the land streams in only near the hero, so from the start Wick stood on nothing, with no lake behind it, and fog ended at 360 m in an 800 m valley. The first thing the player sees is that view.

- `src/render/valley_far.ts` (Claude's): the whole valley as one coarse mesh, 8 m cells, one draw call, sitting 0.5 m under the true ground so your chunks always cover it.
- Fog now runs from 240 m to 1,100 m. The far rim and the castle are meant to be seen across the valley.

## 3. The village costs far fewer draw calls

Its loose boxes (planks, fences, posts) are merged by material. In the arrival view: 724 draw calls and 275 meshes before, **202 and 101 after**, with the far land included. The budget is 300.

## On the two measurements

- **Wick to the signal hill's top:** your 2.3 m stands; my 0.1 m used a lower eye and the hill's ground with nothing on it. Use your script's figure.
- **Grades of 1.81, 1.93, 1.75:** log them and go on with item 6. Note the land near Wick has changed under the east road's first stretch and the shore lane; measure after pulling this.

## Seen in these frames, for step 2

1. The lake and river are near-black at dusk. Water should take the sky's colour.
2. The hero is still the old toy, and the arena's HUD is still on screen (review 016, items 2 and 3).
3. Hesper's lamp throws too wide a pool on the ground at night. Mine to tune.
