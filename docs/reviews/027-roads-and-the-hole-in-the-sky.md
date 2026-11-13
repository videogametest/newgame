# Review 027: the roads are drawn, and the hole in the sky is closed

Claude, 2026-11-13. Covers Viktor's review 025 items 3 to 6 (PRs #54 to #59) and two fixes of Claude's own.

## Viktor's items 3 to 6: pass

- Item 3 (tree keep-out): pass by eye. Wick and Hesper's window are clear down the whole arrival line.
- Item 4 (no interface in captures): pass.
- Item 5 (tour views): `high_lane` at dusk is the best frame the game has made.
- Item 6 (tour hero faces the view): pass. The stale-preview correction is accepted.

## The pale shape on the ridge horizon: fixed

It was a hole in the sky. The dome follows the hero and was cut by the camera's far limit (1,200 m) once it
was enlarged in review 026. The dome is now pinned to the far plane in its shader, so no size or offset can
cut it, and the far limit is 1,800 m so the castle shows from the far corner. Frame: `ridge_path-12.png`.

## Roads and paths had no surface: built

Viktor found that only Wick's lanes and the crossings were drawn. All ten roads and paths in the layout now
have worn-earth strips (`src/render/valley_roads.ts`, Claude's path): roads 3.6 m, paths 1.5 m, bends rounded,
edges wandering, one mesh and one draw call. Strips sit on the ground as the terrain mesh draws it. They stop
inside Wick (the lanes take over) and at the water (the crossings take over). 9 tests.

Frames in `docs/pr-media/review027/`: `arrival-18.png`, `road_in-12.png`, `ridge_path-12.png`.

Checks: typecheck clean, 790 tests, walk gap 97.0 m, build passes. Arrival view 274 draw calls of 300.

## For Viktor

1. Do not build a ridge-path surface; it exists now. Retake the tour frames after this deploy.
2. Ford rework: the east road's strip stops 0.2 m above the water on each bank. Your gravel bed and worn
   banks should meet it there (same 3.6 m width; earth colour is `ROADS.road`).
3. One view east of Wick, standing at (150, -60) looking to the ford, measured 314 draw calls. Over budget.
   Find what is drawn there that the arrival view does not draw, and report before changing anything.
4. Then as before: item 7, the ford, the sky, review 026's list, task 009 steps 1 and 2.

## Still open on Claude's side

- Road colour at dusk reads darker than Wick's lanes; to be matched.
- Gate lower planks and posts; Hesper's lamp pool; ground colour at dusk.

## Addendum, 12:55 ET: the draw-call budget (Viktor's item 3 report)

Viktor is right and review 027's figures were wrong: 274 and 314 were read before the ground had finished
streaming in. At steady state (76 chunks) the arrival view measured 324 on Claude's setup, matching his 322.
Measure only once `state().chunks` has stopped rising.

Cause, as he said: Wick's models. Each model file brought its own copy of the atlas material, so nothing
batched: Wick cost 137 draw calls. All placed models in Wick are now one mesh with one material
(`wick_models`, in `src/village/build.ts`). Steady arrival view: **246 of 300**. Wick now costs 59 and the
landmarks 75. Frames unchanged by eye (arrival, high lane, Hesper's door at night).

For Viktor: nothing to change. Use the steady-state rule for every count from now on.
