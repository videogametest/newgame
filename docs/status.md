# Status

Viktor updates this file. Newest entry at the top. See `docs/WORKFLOW.md` for what each entry should contain.

## Streams

| Stream | Doing | Open PR | Blocked |
| --- | --- | --- | --- |
| A | Task 002 steps 1–9 merged (PR #12, `659222d`). Done. | none | none |
| 003 | Step 1 merged (PR #23). Walk-distance check merged (PR #25). Review 016 items 1–3 merged (PR #26, PR #27). Review 018 items 1–2 merged (PR #30, PR #31); item 3 test merged (PR #33). Review 020 item 4 merged (PR #36, `22cda16`). Review 018 item 5 merged (PR #37, `d55926d`). Review 021 merged (PR #39, `66694be`): signal hill test active, stepping-stone landings in. Next: review 018 item 6 (grades), then items 7 to 9 and open items from 016 and 017. Step 2 not started. | none | Road and path grades above review 018 targets (item 6). Tour-mode screenshots not built. Falls frame. Landings at the stepping stones not yet seen on screen. |
| B | Task 002b style test rework (review 005), PR #21 merged: items 1–7 checked by eye, frames in `docs/pr-media/styletest/review005/` (see `CHECKLIST.md`). | none | Greg's review of the rework; sign legibility at 1280×720 (open question below); villager-set search not yet done; task 003 waits on these |
| C–H | Logic streams (world, stealth, combat, items, people, music) | none | Not started; added as capacity allows. Task 003 waits for the survey review. |

## 2026-11-13 Overnight item 6: Wick's houses and the well are solid (Viktor, branch `overnight-06-solid`)

- **Change:** `src/core/world/solids.ts` (pure footprint maths: 9 m square turned by `facing`, well 2.4 m square). `VALLEY_SOLIDS` in `valley.ts` is every house from `wickHouses(VALLEY_SEED)` plus the well; `blocksHero` and `isWalkableGround` use it. Fences and gate posts are not solid.
- **Tests added:** `solids.test.ts` (footprint maths); `village_solid.test.ts` (every point inside every house and the well blocks the hero; no walkable 1 m cell lies inside a house; every lane in `WICK_LANES` has a walkable path end to end on the 1 m lattice, detour at most 1.5× lane length + 12 m).
- **Existing test changed, and why:** `valley.test.ts` "every walkable place walkable" expected each place centre to be walkable. Two place centres now sit inside a house footprint (`wick` at (64, 72) inside `wain`; `hesper` at (86, 98) is Hesper's own house). The test now requires walkable ground within 6 m for a place centre that lies inside a solid; all other places are unchanged. Place coordinates were not moved.
- **Measured [sandbox, 2026-11-13]:** vitest 54 files, 682 pass; `tsc --noEmit` clean; `vite build` OK; walk gap **97.0 m** (limit 100), longest at (304, 66), nearest stop `chest_gorge_ledge` 25.3 m, so the solids did not move it; `scripts/smoke.mjs` passed against `vite preview`.
- **Not verified:** the hero visibly stopping at a wall (no frame taken; this is a collision change, not rendering).
- **Next:** overnight item 7 (road and path grades).

## 2026-11-13 Overnight item 4: the hero starts facing Hesper's house (Viktor, merged as PR #45, `1a5b882`)

- **Merged:** `placeHeroAtStart()` in `src/render/valley.ts` sets the start yaw to the bearing to Hesper's house (`wickHouses(VALLEY_SEED)`, id `hesper`), not to Wick. Capture-only hook `window.__valley.project(name)` added. Pages run `43362287226` succeeded; `https://everylitwindow.com/` returned HTTP 200 and `scripts/smoke.mjs` passed live.
- **Measured [sandbox, 2026-11-13, 1280×720, 18:00 first frame]:** start yaw −2.36 → −2.356 rad (−135°). `hesper_window` projected x 645.5 → 636.6 px, y 477.8 px. Done criterion is the middle third, x 427–853: met.
- **Gates:** tsc clean; vitest 670 pass; `vite build` OK; walk gap PASS 97.0 m; `gen_valley_layout --check` PASS; smoke passed.
- **Frames:** `docs/pr-media/overnight/04-before-1800.png`, `docs/pr-media/overnight/04-hesper-window-1800.png`.
- **Next:** overnight item 5 (water takes the sky).

## 2026-11-12 Overnight item 2: the valley screen is clear (Viktor, branch `overnight-02-clear`)

- **Change:** `src/render/hud.ts` hides the HERO health panel and the "1 Sword / 2 Bow" tiles in the valley (`hideFightChrome()`). `src/render/valley.ts` shows the clock, frame figures and control hint only with `?debug=1`. Default route: world only.
- **Measured [this commit, sandbox, 2026-11-12]:** tsc OK; vitest 52 files, 670 tests pass; build OK; `scripts/smoke.mjs` passed against `vite preview`. In the default route `.hero` and `.weapon` compute to `display: none`, and no console or page errors.
- **Frames:** `docs/pr-media/overnight/02-clear-default.png` (world only) and `02-clear-debug.png` (clock, "10 fps · 224 draw calls" from headless swiftshader, and the hint).
- **Next:** overnight item 3, the hero as designed (`PROPORTIONS`).

## 2026-11-12 Review 022: Wick wired into the valley (Viktor, merged as PR #41, `61007c5`)

- **Wired:** `src/render/valley.ts` calls `buildWick(scene, { heightAt: valleyHeightAt, seed, shadow })` before the valley starts, calls `wick.light(L, timeOfDay)` each frame, and drives a GlowLayer at 0.3 + 0.9 × nightness. No Claude paths edited.
- **Not done: the shelf wrap (review 022 step 1).** `valleyHeightAt = withWickShelf(landHeightAt, WATER_LEVEL)` breaks two tests in `valley.test.ts`. The fade east of the village box (x 168–200, z 2–21) raises the river bed by up to 0.36 m (land 0.50 → shelf 0.86 at (184.2, 10.9)). Channel depth falls to 1.14 m (rule 1.5–2.5 m, 16 samples). Bank-edge slope rises to 0.34–0.36 (limit 0.31, 76 samples); (167, 6) reads 0.3408. The wrap was tried, measured, and reverted. Village sits on land ground for now. The switch is one line once `src/village/shelf.ts`'s fade tail is fixed.
- **Sight lines, measured after wiring:** output identical to the pre-wiring baseline (`docs/tasks/003-layout/check.ts`, CELL=2). Wick to signal-hill top reads **2.3 m** clear, not the 0.1 m in review 022. Reported as measured; the 0.1 m figure is not reproduced by this script. Other lines unchanged: start→Hesper 2.1; start→castle top 2.9; Wick hidden from Mill −4.6, Forge −3.6, Watch −7.4.
- **Measured [this run]:** walk gap **97.0 m** (limit 100), nearest stop `chest_gorge_ledge` 25.3 m; `gen_valley_layout.mjs --check` PASS; tsc OK; vitest 51 files, 668 pass.
- **Screenshots:** `docs/pr-media/wick-wired/` (default-route valley captures at six times of day). These are not tour-mode frames; tour mode is not built. Wick is at the village edge in the noon frame and was not checked close up.
- **Merged and deployed:** PR #41 squash-merged as `61007c5`. Pages run `43344264189` succeeded. `https://everylitwindow.com/` returned HTTP 200 and `scripts/smoke.mjs https://everylitwindow.com/` passed.
- **Not verified:** Wick on screen up close, and the hero colliding with houses (not built).

## 2026-11-12 Review 021: the signal hill test and the stepping-stone landings (Viktor, merged as PR #39, `66694be`)

- **Signal hill test:** active again as "all ground more than 30 m from the marker is lower than the marker's height". Highest ground outside 30 m of the marker is 60.4 m; the marker is 63.14 m. The 64.8 m summit is 13.6 m from the marker and is excluded by that rule. No reshape; the marker does not move.
- **Stepping stones:** a 6 m ramped landing at each end of `stepping_stones`, cut down to the stone top (2.30 m). The test that ground meets the stone tops within 0.3 m is un-skipped and passes.
- **Grade finding:** a 0.3 grade cannot reach the bank within 6 m, because the bank rises about 0.3 m per metre and the ramp runs parallel to it. The landing therefore uses about 0.28 near the stones, rising to about 0.58 at the 6 m mark, under MAX_WALK_SLOPE 0.7. The cut sides are about 1.7 m walls beside the path, so the hero walks the centre line.
- **Reachability caveat:** the reachability test uses a 4 m grid and can miss thin steps. Checked at 2 m: 0 of 76,863 reached cells lie beyond the gate.
- **Measured [tests and capture scripts, 2026-11-12]:** walk gap **97.0 m** (limit 100 m, 3 m margin), longest at (304, 66), nearest stop `chest_gorge_ledge` 25.3 m. `gen_valley_layout.mjs --check` PASS.
- **Gate (worker sandbox, `fix/stepping-stone-landings-and-hill-test`, then PR #39):** tsc exit 0; vitest 50 files, 657 pass, 0 skipped; build ok; `scripts/smoke.mjs` passed against a local `vite preview`.
- **Deploy and live check:** squash-merged as `66694be`. Pages run `43340016309` succeeded (test, build, smoke, deploy all success). `https://everylitwindow.com/` returned HTTP 200.
- **Not verified:** the stepping-stone landings have not been seen on screen, and no capture is attached.

## 2026-11-12 Review 018 item 5: the gorge and the rim (Viktor, merged as PR #37, `d55926d`)

- **Built:** the rim is a gorge, not a slope. `valleyHeightAt` is now `gorgeAdjust(bank, rimHold(...))`. The rim holds from r 330 m, except in the river channel and the openings. Gorge walls rise from the bank (5 m out) to the top (10 m out), plateau to 25 m, and fall to ground by 35 m. The wall top is the higher of WATER_LEVEL + 15 m and the rim top. `isGorge`, `walkSlopeAt` and `blocksHero` are exported. `render/valley.ts` uses `blocksHero` in its walk rules. Walkable ground is: inside the box, or a crossing, or dry with slope under 0.7.
- **Layout move (my decision, not in the brief):** `view_ridge_north` moved from (248, −222) to (250, −214). The old point sat on the rim: r 332.8 m, slope 1.83, not walkable, and the walk check failed there at 131.8 m. The new point is r 329.1 m, slope 0.60, walkable. A signpost could not fix it, because the stop's cell was on the rim, so this moves a place. Stop count is unchanged at 46. Say if you want it elsewhere.
- **Tests changed (please check):** added `reachableFromStart()`. The edge-closed test uses it. The signal-hill test uses the highest reached cell, because the rim is higher than the hill and not walkable. The bank-slope test skips gorge samples. A stray unused constant was removed (it failed tsc with TS6133). The stepping-stones test stays `it.skip`.
- **Measured [walk_gap and tests, 2026-11-12]:** walk gap **97.0 m** (limit 100 m), longest at (304, 66), nearest stop `chest_gorge_ledge` 25.3 m. Before the move it was 131.8 m (fail). The margin is 3 m, so small layout changes can break it.
- **Sight lines [`docs/tasks/003-layout/check.ts`, CELL=2, this run]:** start to Hesper 2.1 m clear; start to castle top 2.9 m clear; Wick hidden from Mill −4.6 m, Forge −3.6 m, Watch-house −7.4 m; patrol hut to castle −27.9 m, to signal hill −26.4 m; signal hill to castle 1.6 m, to Watch-house yard 0.7 m; highest ground 64.8 m at (−84, −308). The earlier layout entry printed Wick to Mill −3.90; this run prints −4.6. I have not worked out why, and the figures above are from this run.
- **Road and path grades (not changed here; review 018 item 6):** steepest grades are east_road 1.81, stones_path 1.93, north_bank_path 1.75, mill_road 1.13, ridge_path 0.99, hill_path 0.73, falls_path 0.51, road_in 0.55, soldiers_road 0.46, forest_path 0.22. Review 018 targets are 0.2 for roads and 0.45 for paths.
- **Gate (worker sandbox, `feat/task-003-review-018-item-5`):** tsc exit 0; vitest 50 files, 653 pass, 1 skipped (stepping stones); `src/core/world` 73 pass, 1 skipped; `gen_valley_layout.mjs --check` PASS; build ok; walk gap PASS 97.0 m; `scripts/smoke.mjs` passed against a local `vite preview`; `scripts/valley_capture.mjs` passed (six frames; Swiftshader fps 26–38 and 37–45 draw calls, which is not a GPU measurement).
- **Screenshots:** `docs/pr-media/valley-item5/` (arrival dusk, noon, noon with sun, night, night with moon, dawn). These are default-route captures. Tour mode (`?tour=1`) is not built, so there are no tour-mode screenshots. The rim and gorge are not in any of the six frames, so I have not seen the gorge from the camera.
- **Deploy and live check:** PR #37 squash-merged as `d55926d`. Pages run `43328908024` succeeded (test, build, smoke, deploy all success). `https://everylitwindow.com/` returned HTTP 200 and `scripts/smoke.mjs https://everylitwindow.com/` passed. There are no PR checks: the workflow runs on push to `main` only, so the merge relied on the local gate above.
- **Not verified:** the gorge walls have not been seen on screen, and the live check was not a visual check.
- **Open questions (not decided, for Greg):**
  - a. Patrol hut: the design says "closed by its own rim", but the prototype keeps a 60 m opening (hut at (322, −112), r 60). Which one?
  - b. Stepping-stones bank-to-bank drop of 1.75 m: still open (review 020 item 4 entry).
  - c. Signal hill test: I read the rule as "rim higher than the hill, not walkable", and the test walks only reachable cells. Please confirm.
  - d. The test edits listed above.
  - e. The pace rule (full ≤ 0.3, half by 0.7) has not been confirmed in play.
  - f. The walk-gap margin is 3 m.

## 2026-11-12 Review 020 item 4: the crossings and `walkSurfaceAt` (Viktor, merged as PR #36, `22cda16`)

- **Built:** the 11 m disc at each crossing is gone. Crossings are strips of their width from one end to the other (`crossingAt`, `isCrossing`). `walkSurfaceAt` gives the stepping stones a top at water + 0.3 m, a deck at least water + 1.0 m (`DECK_MIN`), the ford bed at water − 0.4 m, and ordinary ground everywhere else. The hero's ground height and walk rules in `render/valley.ts` use it; the camera clearance still uses `valleyHeightAt`.
- **Forge bridge:** `walkable: false` in `docs/tasks/003-layout/layout.json`. Its water is blocked and its land parts stay walkable by slope. This is my reading of the note "not walkable before then"; say if you meant the land parts blocked too.
- **Generator:** `LayoutCrossing` gained `deck`, `water_depth`, `top_above_water`, `stone_size` and `gap_between_stones`, so `valley_layout.ts` now typechecks. `gen_valley_layout.mjs --check` exit 0.
- **Measured [tests, 2026-11-12]:** walk gap **95.9 m** (limit 100 m), longest at (114, −4), nearest stop `sign_ford` 64.8 m. This is up from 91.4 m. I have not isolated the cause (the disc removal and the forge flag are the likely ones).
- **Open question (not decided):** the stepping stones do not meet the banks without a jump. Measured along the strip: stone tops at 2.30 m; the bank ground at the west end is 3.97 m and at the east end 4.00 m. Walking bank to bank drops 1.74 m and 1.75 m at the two ends. Between the stones the surface is level (no step above 0.5 m). The design says "walked without a jump". The fixes (a ramp at the ends, a different stone height, or changed bank heights) are design choices, so I have not picked one. The bank-to-bank test for the stones is `it.skip` in `valley.test.ts` until Greg decides. The ford and the mill bridge pass the bank-to-bank test with no step above 0.5 m.
- **Deck rule and the forge:** the forge deck note says "straight from ground to ground, never less than 1.0 m above the water". The forge is not walkable, so its deck height is not tested. Not checked against the rule; say if it should be.
- **Gate (worker sandbox, `feat/review-020-crossings`):** tsc exit 0; vitest 50 files, 651 pass, 1 skipped (the stones question); walk gap 95.9 m PASS; build exit 0; `gen_valley_layout.mjs --check` exit 0; `scripts/smoke.mjs` exit 0 against a local `vite preview`.
- **Deploy and live check:** PR #36 squash-merged as `22cda16`. Pages run `43323776320` succeeded (test, build, smoke, deploy jobs all success). `https://everylitwindow.com/` returned HTTP 200. `scripts/smoke.mjs https://everylitwindow.com/` exited 0.
- **Not verified:** no water is drawn yet, so the ford wade and the stepping stones have not been seen on screen. No capture is attached.

## 2026-11-12 Review 018 item 3: river out to the edge (Viktor, premise not reproduced, test added, PR #33)

- **Premise:** review 018 says the river out stops short of the edge. Measured on `7bbec02` with `valleyHeightAt`: the river out (95,-8) to (400,100) is wet end to end. Centre height is 0.50 m everywhere except 1.07–1.60 m within 15 m of the ford. Wet width is 9.5–10.5 m from the ford to the edge (400,100). The raw land there rises to about 40 m at r≈412, so the bank cut keeps the channel open. [measure, 2026-11-12]
- **Built:** no terrain change. One test, `keeps every river at least 8 m wide under water from end to end, falls and crossings excepted` in `valley.test.ts`. It measures contiguous wet width across each river sample outside 15 m of a crossing and outside the falls, and requires at least 100 samples. The minimum measured is 10.0 m.
- **Negative control:** with a 12 m bar the test fails (`expected 10.000000000000004 to be greater than or equal to 12`). The file was restored afterwards.
- **Gate (worker sandbox, `feat/review-018-river-out-test`):** tsc exit 0; vitest 50 files, 650 tests pass; build exit 0; walk gap 91.4 m (limit 100 m); `gen_valley_layout.mjs --check` exit 0; `scripts/smoke.mjs` exit 0.
- **Deploy:** squash-merged as `4e8c568`. Pages run `43304134289` succeeded. Live check: `https://everylitwindow.com/` returned HTTP 200, and `scripts/smoke.mjs https://everylitwindow.com/` exited 0.
- **Live check after PR #28 (review 018 asks for it):** PR #28 merged as `44d54e9`. Its post-merge live check is in the layout entry below. Not repeated here.
- **Not verified, said plainly:** nothing about the river's look changed, so no capture is attached to this PR. If the gorge Greg meant is a visible rim wall (a 0.3 slope up to a 40 m rim), that is the subject of item 5, not this item.
- **Question for Greg and Claude:** is the "gorge" the rim wall described above? Viktor has not assumed an answer.

## 2026-11-12 Review 018 items 1 and 2: sun bearings, rivers (Viktor, merged)

- **Item 1, sun bearings (PR #30, `0781444`):** merged. Pages run `43296956379` succeeded. `lighting.test.ts` passes (13 tests). Live check: `https://everylitwindow.com/` returned HTTP 200 and passed `scripts/smoke.mjs`. No tour-mode screenshots: tour mode is task 003 step 4 and is not built, so this PR has none.
- **Item 2, rivers (PR #31, squash `58664a8`):** merged. Pages run `43302010715` succeeded. Live check: `https://everylitwindow.com/` returned HTTP 200 and passed `scripts/smoke.mjs`. Before and after images are in the PR body.
- **Built:** rivers sit in a broad, shallow valley. The bed depressions are gone; height is `min(heightSampler, riverBankHeight)`, with banks at slope 0.3 (`RIVER_BANK_SLOPE`). The ford bed is lifted to 1.6 m. Four new tests in `valley.test.ts`: channel depth, centre line under water from the falls foot to the lake and out of the valley, bank walk slope, and the existing width test.
- **Measured [tests and walk_gap, 2026-11-12]:** channel depth 1.5 m beyond r 140 and outside 15 m of crossings; water-level width median 10.1 m (range 9.6–10.3 m); bank slope 0.28–0.30; longest walk **91.4 m** (limit 100 m).
- **Gate on `d836ddf` (worker sandbox):** tsc exit 0; vitest 50 files, 649 tests pass; build exit 0; walk gap PASS 91.4 m; `gen_valley_layout.mjs --check` exit 0; `scripts/smoke.mjs` exit 0.
- **Not verified, said plainly:** the captures do not show the river change. At the ford, mill bridge and default route frames, the changed pixels lie around the hero sprite and the terrain looks the same. The falls close-up is not usable (its stand point looks at grass), so the falls are not shown. A likely cause, not verified, is that the lowered bed sits under the water plane and cannot be seen from above.
- **Question for Greg and Claude:** the falls need a camera spot that actually looks at the falls. Should that wait for the tour-mode viewpoints in task 003 step 4, or should a hook for it be built now? Viktor will not invent a viewpoint.

## 2026-11-12 Task 003 layout: places, water, roads, stops (Viktor, PR open, road grades not met)

- **Built:** the layout in `docs/tasks/003-layout/layout.json` is generated by `scripts/gen_valley_layout.mjs` into `src/core/world/valley_layout.ts` (`--check` PASS). `valley.ts` reads `VALLEY_PLACES`, `VALLEY_ROADS`, `VALLEY_CROSSINGS` and `VALLEY_STOPS` (46 stops). Nothing was moved from the layout.
- **Crossings:** the ford (142, -12), the mill bridge (-178, 40) and the stepping stones (-250, 0) are walkable even where the river is water. Water still blocks walking everywhere else. Each crossing opens a walkable disc 11 m across. This is a change from the rule that water was never walkable; the swim rule is a separate PR.
- **Rivers, measured:** wet-centre width over 35 cross-sections, median 11.2 m, p10 8.0 m, p90 13.2 m, min 5.0 m, max 13.8 m. **10 of 35 cross-sections have a dry centre**, so the rivers are not a steady 8–12 m. The tests assert the median (8–12 m) and p10 (at least 6 m). Constants: radius 10, height -12, step 6.
- **Sight lines** (margin in metres, positive = clear; the table in the task brief matches):
  - start → Hesper's window: 2.07 clear
  - start → castle tower top (eye 35): 2.88 clear
  - Wick → Mill: -3.90 hidden; Wick → Forge: -3.62 hidden; Wick → Watch-house: -7.42 hidden
  - patrol hut → castle: -27.94 hidden; patrol hut → signal hill: -26.35 hidden
  - signal hill → castle: 1.61 clear; signal hill → Watch-house yard: 0.73 clear
  - Wick → signal hill top: 2.25 clear
  - Highest ground 64.8 m at (-84, -308), 13.4 m from the hill's marked top.
- **Walk check [walk_gap, 2026-11-12]:** longest walk to a stop **92.7 m** (limit 100 m), 2 m cells, no stranded ground. `npm run walk-gap` exits 0. Not in `npm test` or the deploy gate. No filler stops were added. The castle is beyond the north-west rim and is excluded from the walkable-places test, as the spec says it is never walked to.
- **Road grades [probe, 2026-11-12]:** each road sampled every ~2 m, slope taken as the 1 m central difference of `heightAt`, non-walkable samples counted with the same `isWalkableGround` rule (slope limit 0.7; river bank and edge ring not split out):

| Road | Length (m) | Max slope | Non-walkable samples |
| --- | --- | --- | --- |
| road_in | 192 | 0.57 | 0 / 98 |
| mill_road | 276 | 0.29 | 0 / 142 |
| east_road | 289 | 3.17 | 1 / 150 (the ford bank) |
| soldiers_road | 459 | 0.48 | 0 / 236 |
| hill_path | 131 | 0.73 | 10 / 67 |
| ridge_path | 223 | 1.02 | 29 / 115 |
| forest_path | 283 | 0.24 | 0 / 144 |
| falls_path | 120 | 0.14 | 0 / 62 |

  **Not met:** the spec requires every road to be walkable without slowing, and every path climbable. `hill_path` and `ridge_path` have stretches the hero cannot walk, and `east_road` has one spike at the ford bank. I did not reshape `VALLEY_SHAPE` in this PR, so the grading work is still open. The rule is in the brief's "What the prototype does not prove".
- **Tests:** `src/core/world/valley.test.ts` (17 tests: determinism, lake, walkable places, crossings, water blocks walking, edge ring, sight lines, highest point, castle and start inside the valley, river widths, 46 stops, walking) and `walk_gap.test.ts`.
- **Gate in the worker sandbox (`feat/task-003-layout`):** generator `--check` PASS; `npx vitest run` 50 files, 644 tests pass; `npm run typecheck` exit 0; `npm run build` exit 0; `scripts/smoke.mjs` PASS on localhost; walk gap PASS 92.7 m.
- **Live check, earlier (commit `277e75b`, before this PR):** `https://everylitwindow.com/` returned HTTP 200, title "Every Lit Window", no failed requests and no console errors (headless Chromium). Pages run `43283887127` for `277e75b` succeeded. The live check on this PR's deploy is recorded after the merge.
- **Live check, post-merge (`44d54e9`):** Pages run `43286633512` succeeded. `https://everylitwindow.com/` returned HTTP 200, title "Every Lit Window", no failed requests and no console errors (headless Chromium, 1280×720, 6 s after networkidle). The screenshot shows the valley at dusk with the placeholder hero seen from behind. **Still on screen:** the arena HUD (hero bar, "1 Sword / 2 Bow"). Review 016 item 3 is open for it. Screenshot: `/work/run_tmp_pr3/live/live_layout.png` (sandbox only).

## 2026-11-12 Review 016 items 1 to 3: sun path, moon, stars, draw calls (Viktor, PR (a))

- **Sun and moon:** the sun follows a path, rising on one side and setting on the other (`sunSky` in `lighting.ts`). The moon is opposite it, so it rises as the sun sets. Each disc is drawn only above the horizon. The ground light keeps its earlier grazing strength.
- **Stars:** quads instead of a point cloud. The point cloud drew one star in the night frame (review 016).
- **Draw calls:** now the per-frame difference across `scene.render()`. The earlier cumulative figures are withdrawn. Capture run on this branch (swiftshader, one run): noon 54, dusk 56, dawn 55, night 55.
- **Tests:** sun path, moon opposition, moon above the horizon at 0 and 23 and set by 6, stars from `nightness` (`lighting.test.ts`); star quad count, index bounds and sky placement (`valley_sky.test.ts`).
- **Verified:** typecheck exit 0; `npx vitest run` 50 files, 636 tests pass; `npm run build` exit 0; `scripts/smoke.mjs` exit 0 (worker sandbox, `feat/task-003-review-016-017`).
- **Not met, open:** the noon frame shows no sun disc and no hero shadow, and the night frame has no moon. The capture camera faces the hero, so a sun-facing or moon-facing shot needs a camera yaw hook, not yet built. The arena HUD and the old hint text still show (review 016 items 3 and 9).
- **Frame rate:** not measured here (swiftshader).

## 2026-11-12 Task 003: walk-distance check (Viktor, fails as measured)

- **Built:** `src/core/world/walk_gap.ts` (pure grid Dijkstra from the stops over 2 m cells; diagonals only when both orthogonal neighbours are walkable; reports longest walk, where, and stranded cells). `VALLEY_STOPS` and `isWalkableGround` in `valley.ts`. Stops now: wick, signalHill, ridgeCrest, patrolHut, start. Excluded: lakeCentre (water) and castle (horizon landmark on the valley edge).
- **Tests:** `src/core/world/walk_gap.test.ts`, 5 tests: straight open-ground distance (70.7 m to a corner), a wall that forces a detour, stranded islands, no diagonal cut past blocked corners, bad input.
- **Script:** `npm run walk-gap` (`scripts/walk_gap.ts`). Exits 1 over 100 m or if any walkable cell is stranded. It is not in `npm test`, so the deploy gate is unchanged.
- **Measured [walk_gap, 2026-11-12]:** longest walk **590.4 m**, to (-400, -400), the valley's north-west corner. Nearest stop by walk: patrolHut. The straight-line distance from that corner to patrolHut is 547 m, a lower bound on any walk, so the gap is over 100 m whichever measure is used. Grid walks can run up to about 8% long, so 590 is an upper estimate.
- **Not done on purpose:** no invented stops to make the number pass. Secrets, chests, campfires, signposts and road junctions are placed by later steps of this task. Until then the check fails and the report says where.
- **Verified:** `npm run typecheck` exit 0; `npx vitest run` 48 files, 622 tests pass; walk-gap script exit 1 with the measured report above.

## 2026-11-12 Task 003 step 1: ground, sky, movement (Viktor, not ready for first look)

- **Merged and deployed:** PR #23 (`1e08e40`, squash). Pages run `43272733796` succeeded. `https://everylitwindow.com/` returns HTTP 200, passes `scripts/smoke.mjs` with no failed requests, and a live screenshot at 18:09 shows the valley at dusk with the placeholder hero.
- **Verified in the worker sandbox on `21663ba` (`videogametest` author):** `tsc` exit 0, 573 tests pass, `npm run build` exit 0. PR #23 had no CI checks, so these local runs were the gate.

- **Shipped:** seeded valley terrain (`src/core/world/valley.ts`, `heightAt`, seed 1066, about 800 m, water level 2 m), walking and sprint on the terrain (`walk.ts`), a camera (`valley_camera.ts`), a day-night clock (`valley_time.ts`, dawn 6, dusk 19, 1200 s per day), chunked terrain (`src/render/valley_terrain.ts`), a sky with sun, moon, stars, and distance haze (`src/render/valley_sky.ts`), lighting (`src/render/lighting.ts`), and the hero placed by `newGameState` (timeOfDay 18, day 1). The default route is the valley; `?arena=1` keeps the combat prototype.
- **Sky defect fixed:** the dome now uses a shader material that outputs the interpolated vertex colour, so the sky is no longer flat grey or black. Stars, sun and moon keep the unlit material. Checked by eye in `docs/pr-media/valley/`: dusk orange, noon blue, night navy with a visible star, dawn orange.
- **Not built in step 1 (stays open in task 003):** first-person `V` view, pause and settings menus, crouch, Hesper's interior and its door fade, boarded houses, Wick buildings, scenery, water animation, wildlife, sound, music, tour mode, the arrival view. **The hero start is a placeholder** until Hesper's lit window is built in step 2.
- **Verified:** `npx tsc --noEmit` exit 0; `npx vitest run` 41 files, 573 tests pass; `npm run build` exit 0; `node scripts/smoke.mjs http://localhost:4173/` exit 0; `?styletest=1` and `?styletest=room` render with no console or page errors.
- **Draw calls (measured, swiftshader, not a GPU):** dusk 3438, noon 6570, night 9815, dawn 13063 (one run); an earlier run gave 4978, 10886, 16586, 22556. Both runs rise from dusk to dawn. Active meshes about 48, chunks 58. **Not attributed yet:** the probe that would split the count (shadow pass, per-chunk meshes, sky) was removed; the cause is open. **Frame rate:** swiftshader gives about 17–24 fps, which says nothing about the 60 fps target. The target is not claimed as met.
- **Open:** the first-look bar (dusk arrival view, village, lit window) is not met, so Claude has not reviewed this build for first look.

## 2026-11-12 Review 008: building scale fix on PR #22 (Viktor)

- **Done** on `feat/style-test-review-005`: scale M = 2.7 per module; house A open doorway (`wall-doorway-square`) and interior floor; row shot split into `row-west` and `row-east` frames (fog); door-height check in `scripts/styletest_capture.mjs`. Frames in `docs/pr-media/styletest/review008/`.
- **Identity:** all four branch-only commits re-authored as `videogametest <355531315+videogametest@users.noreply.github.com>` (Greg, 11:55). Branch merged with `main` at `1194347` (Design v28, review 012) as `fb9452a`.
- **Verified on `fb9452a`:** `npx tsc --noEmit` exit 0; `npm test` 521 tests pass; `npm run build` exit 0; `node scripts/smoke.mjs http://localhost:4173/` exit 0.
- **Push:** the local push fails with "--mirror can't be combined with refspecs" (bare clone config). Pushing through a worker sandbox with `--force-with-lease` against `b3c4cd8`. Result below once it lands.
- **Door check caveat:** the door check is a bounding-box proxy (shortest door 2.7 m). It is not a measured opening.
- **Open question for Greg:** review 008 says people are about 1.8 m, but the measured person bboxes are 2.17–2.66 m (tallest Hesper, Mage, 2.655 m). Which height is the target? Also the lantern basis (3.6 m = 2 × 1.8 m).
- **Flag for Claude:** `main` (`1194347`) tracks `node_modules` as a symlink blob pointing to `/home/claude/newgame/node_modules` (added in `a8875ff`). It is a stray artifact. Not removed here; needs a decision.
- **Not started:** task 003 (waits for PR #22 merge).

## 2026-11-12 Review 005: style test rework (Viktor, PR #21)

- **Done, items 1–7** (checklist with frames: `docs/pr-media/styletest/review005/CHECKLIST.md`):
  1. Warm light pools in front of lit doors and lower floors.
  2. Dusk: orange and rose sky, low gold light, windows just lit.
  3. Mill closed, wheel on the east wall, no taller than that wall.
  4. Forge (closed building, open lean-to, chimney, simple anvil), well (low stone ring, small roof on posts), watch-house (tower in a walled yard).
  5. Hero at a frame edge, side on, in all 16 item frames (8 items × 18.7 and 23). The well hero moved to z −4.4 because the default depth fell inside the watch yard.
  6. Four villager pairs beside their adventurers, front on, noon (`villagers-front-12`).
  7. Horizon shown in row frames; no plane edge in any frame.
- **Open question for Greg:** sign text is small and hard to read at 1280×720 from distance. Not changed in this PR. Do you want the sign texture enlarged?
- **Verified:** `npx tsc --noEmit` exit 0; frames captured by `scripts/styletest_capture.mjs` (23 frames, exit 0) after a fresh `vite build` (exit 0).
- **Tests:** `npm test` 29 files, 346 tests pass (exit 0). The smoke test was not re-run on this branch.

## 2026-11-12 Task 002b: style test (Viktor)

- **Scene:** `?styletest=1` (not linked from the game). Kenney Fantasy Town houses, watermill with turning wheel, forge, well and watch-house stand-ins, scenery; KayKit Adventurers people (10) with the hero beside each item; labelled signs.
- **Screenshots** (`docs/pr-media/styletest/`): `row-front-noon`, `row-front-dusk`, `row-quarter`, `row-night`, `item-house-a/b/c`, `item-mill`, `item-forge`, `item-well`, `item-watch`, `item-scenery`, `people-front`, `people-quarter`.
- **Checked by eye:** characters and mill read well at scale; house walls are loose kit panels and the roofs float above them, which is accepted for a stand-in; night shot is dark but readable.
- **Deviations:** ground 70 × 36 m (brief said about 40 m) because the row runs longer. Clip playback uses the render loop, not a fixed frame.
- **Stand-ins (labelled in scene):** forge, well (fountain), watch-house tower (stacked corner modules).
- **Survey changes** from review 002 are applied in `docs/assets.md` ("Review 002 changes").
- **Not done:** the bounded search for a CC0 stylised villager set (required before group 6). Nothing has been searched for it yet.
- **Blocked:** KayKit Hexagon free zip (0 bytes); Quaternius quota (village, people, wildlife); Castle Kit not downloaded. See `docs/assets.md`.
- **Merged:** PR #15 (`be9b543`, squash). No PR checks run (the deploy workflow runs on `main` only), so tests were run locally: `tsc --noEmit` exit 0; `npm test` 17 files, 128 tests pass; `npm run build` exit 0; smoke test passes on `vite preview`.
- **Live:** Pages run `43146924761` succeeded. `https://everylitwindow.com/` returns HTTP 200 and passes `scripts/smoke.mjs` with no failed requests.

## 2026-11-12 03:05 ET (Viktor)

- **Task 002 done.** PR #12 (`659222d`, squash) merged. Its Pages run `43144274493` **failed**, so the live site stayed on the `3e8da2d` build. Cause: `ubuntu-latest` now resolves to Ubuntu 26.04, which Playwright 1.59 does not support. Fix: PR #13 (`2a13035`, squash) pins both jobs to `ubuntu-24.04`. Pages run `43145058218` succeeded.
- **Live check:** `https://everylitwindow.com/` returns HTTP 200 and passes `scripts/smoke.mjs` with no failed requests. Verified 03:05 ET.
- **Verified on the PR #13 branch:** `tsc --noEmit` exit 0; 128 tests pass; `npm run build` exit 0; smoke test against `vite preview` passes.
- **Not verified:** the drawn-bow arm aim in a live deployed frame (checked only on the contact sheet). Greg asked for this check on PR #4 work; it still needs a live frame.
- **Blocked: KayKit Medieval Hexagon (free).** The free download saved a 0-byte file twice, from the itch free route only. The empty file is deleted. No paid option was clicked. Greg: if you can download the free zip by hand into the repo's asset folder, I'll pick it up.
- **Next:** task 002b (style test). Then logic streams C–H, shipped dark, at most four at once.

## 2026-11-11 21:50 ET (Viktor)

- **Review 001 done.** PR #10 merged (`146a73b`, squash). Pages run `43143395385` was in progress when this was written; its conclusion is not verified yet.
- **Shipped, per review 001:** `PlaceKind` is `village | camp | outpost`. `PlaceDef` (data) and `PlaceState` (`status`, `timesFreed`, `bellSilenced`, `morale`). `Household` is `{ id, home, homeSince? }`. `BanditState` union. `GameState` gains `day`, `progression`, `places`, and the missing lists from the review table. `GameState.skills` is replaced by `progression`, and `HeroState.rank` is removed. `ExperienceEvent.repeatable` added, and `awardSharedEvent` reads it from the event.
- **Decision (review 001, item 3):** `ProgressionState` and the types it uses live in `src/core/types/shared.ts`. `src/core/progression/types.ts` re-exports them.
- **Decision (review 001, settings):** settings are not in `GameState`. The own-object and own-storage-key part is not built yet; the settings stream builds it.
- **Deferred, as the review says:** items 5–6 (crowns; `ItemDef` kind, quality, owner, icon) and item 7 (squad as a company) go to the owning streams. No `HouseholdDef` yet; decided when the people stream starts.
- **Verified:** `npx tsc --noEmit` exit 0; `npm test` 11 files, 101 tests pass; `npm run build` exit 0 on the branch. The branch had no PR checks (the deploy workflow runs on pushes to `main` only), so the tests were run locally.
- **Review 002 answered:** accepted as research. Task 003 stays blocked. The five survey changes are **not yet made**; they are part of task 002b, which is in progress. Greg has not yet decided the people question or the seven gaps.

## Task 002, step 10: asset survey (stream B)

- Branch `feat/task-002-asset-survey` from `main`, docs only. No code changed, so no tests were run for this PR. Not merged yet.
- Survey: 86 rows, 43 found, 20 found but needs checking, 23 gaps. The full table, licences and fallbacks are in `docs/assets.md`, generated from the survey file.
- Seven must-have gaps: `houses_16`, `lightable_windows`, `fairlow_house`, `hesper_cottage`, `forge_anvil`, `watch_house`, `lantern_hanging`. The survey recommends fallback rung 2 for most (author from CC0 modular kits, free but costs authoring time). Nothing selected yet; Greg decides.
- Verified: licence wording for every pack, read from the pack's own licence file where one exists and from its page otherwise (table in `docs/assets.md`). Measured file sizes for the Kenney runtime set (8,686,129 bytes) plus the sheep and crow files. The survey estimates about 15.5 MB with wolves and deer added; the 25 MB first-load target is **not yet established**.
- Not verified or not done:
  - Scale screenshots beside the hero, which task 002 step 10 asks for: **not produced**. The survey did no rendering.
  - Wolves, deer, fox, stag and horse: Google Drive quota blocked the downloads, so they are unmeasured and uninspected.
  - Geese: rigged Blend file only; no animation clips confirmed.
  - Crow: CC0 on the author's page, but the creation method is undisclosed. Needs a provenance check.
  - Sheep: the original Quaternius Farm licence was read. The glTF the survey checked is a third-party threejs.org conversion.
  - Coverage against the design doc's full asset list was not re-checked in this entry.
- Nothing purchased. The five optional paid packs total USD 47.91 before tax; the survey says most are unnecessary on the free route.
- Task 003 has not started. Waiting for Claude's review of the survey and Greg's decision on the seven gaps.
- Stream A (task 002 steps 1–9) is on `feat/task-002-foundations`, five commits ahead of `main`, not merged. Its tests, typecheck, build and deploy were not re-run in this entry.

## 2026-11-11 19:30 ET (Viktor)

- **Task 001 done.** PR #5 merged (`775949d`). Pages run `43124527769` succeeded. Shipped: camera fade for fighters blocking the hero, and the camera floor clamp. Teal tint root cause: the translucent boundary wall, not the camera dropping below ground. The wall is now hidden outside arena bounds (`insideBounds` in `src/render/camera_limits.ts`). Verified: 34 tests pass, `tsc` clean, build passes, before/after frames in `docs/pr-media/001-walkback-*.png`. Not verified: a live Pages frame showing the tint gone.
- **Base change (Greg's request 1).** PR #6 merged (`10623c4`). Pages run `43125974189` succeeded. Vite `base` is `/`. README updated. No CNAME file. Verified: 34 tests pass, `tsc` clean, build passes, no `newgame` references in `dist/`.
- **Custom domain: NOT live (Greg's request 2).** `https://everylitwindow.com/` fails the TLS handshake (HTTP 000). The served certificate is the `*.github.io` wildcard, which does not match the domain. Cause: the Pages settings show `cname: null`, so the custom domain is not set on the repo. DNS already resolves to GitHub Pages IPs. Greg needs to set `everylitwindow.com` under Settings → Pages. Then re-check.
- **Legacy URL.** `https://videogametest.github.io/newgame/` returns the HTML, but its assets 404 because the base is now `/`.
- **Question for Greg.** Set the custom domain in Settings → Pages, then tell me. Should the `/newgame/` path build be kept for the old URL?
- **Risk, not verified.** A Pages deploy may clear the custom domain when no CNAME file is in the repo. Watch for this after the next deploy.
- **Next.** Task 002 (sound and showcase) starts after this entry is merged.

## 2026-11-11 18:55 ET (seeded by Claude from Viktor's last report)

- PR #4 merged (`d532b10`): balance targets, tuning panel, visual captures. Live on Pages.
- Task 001 in progress: the camera fade logic runs, but the fading fighter still renders solid. Not merged.
- Known: a teal tint appears when the camera drops below the water plane while walking backward.

## Task 003: sun and moon capture hook (review 016, PR #26 follow-up)

- Added `aimAt('sun'|'moon')` and `aimAngles`, with tests. Capture now includes `noon-sun-12` and `night-moon-2`.
- Gate in the worker sandbox: typecheck 0, vitest 638 pass, build 0, smoke pass, capture pass. No PR CI exists, so this local gate is the check.
- Viewed: the sun disc is at centre in `noon-sun-12.png`. The moon disc is at centre in `night-moon-2.png`.
- Open question: at 00:00 the moon disc is not visible under `aimAt('moon')`, while at 02:00 it is. Not yet explained. The capture uses 02:00 for now.

## 2026-11-12 Review 018 item 4: `walkSurfaceAt` is blocked on four design values (Viktor)

Measured on `main` (`9b96912`) with `valleyHeightAt`. Water level is 2.00 m.

- **Ford** (142, -12): bed 1.60 m at the centre, 0.4 m of water. Wading needs no surface, so `walkSurfaceAt` equals `heightAt` there. Its footprint width still needs the east road's width, which the data does not hold.
- **Mill bridge** (-178, 40): bed 0.50 m at the centre, 1.5 m under the water. The bed walk puts the hero under water here now.
- **Stepping stones** (-250, 0): bed 0.50 m at the centre, 1.5 m under the water. Same problem as the bridge.

`GAME_DESIGN.md` v34 says the bridge is "a deck above the water" and the stones are "walked dry", and that each is "as wide as the road or path that uses it". It does not give the numbers. No road or path in `layout.json` crosses either one, so the rule has nothing to read.

**Questions for Greg (answer in this file or in the design):**

1. Mill bridge: what is the deck height above the 2.00 m water level?
2. Stepping stones: what are the top heights above 2.00 m, and the size and spacing of the stones?
3. Footprint width and direction for the bridge and the stones. Is the strip across the river (the crossing direction), or along it? Either way, what width? The design only says "as wide as the road or path that uses it", and nothing uses them.
4. East road width, for the ford's strip. Its surface is the bed, so the width only matters for the footprint.

Until these are answered, `walkSurfaceAt` is not written for the bridge or the stones: any deck or stone height now would be a guess. The ford needs only the width. Items 5 to 9 of review 018 do not depend on these answers, and work moves on to them.
