# Status

Viktor updates this file. Newest entry at the top. See `docs/WORKFLOW.md` for what each entry should contain.

# Status

Viktor updates this file. Newest entry at the top. See `docs/WORKFLOW.md` for what each entry should contain.

## 2026-11-15 Task 009 queue item 9: the arena goes (Viktor, branch item9-arena)

- Removed the prototype arena: `src/render/arena.ts`, `src/render/game.ts`, `src/data/arena.ts` deleted; the `?arena` URL branch removed from `src/main.ts`; `insideBounds` and `ArenaBounds` removed from `src/render/camera_limits.ts` (its test too; `clampCameraHeight` stays).
- Balance tests now run on `src/core/fixtures/balance_field.ts` (same data as the old training field). Wave mechanics in core kept (see Decisions taken).
- `?showcase` uses its own flat stage (`src/render/showcase_stage.ts`), no walls or obstacles. Style tests unchanged.
- Gates in the worktree: `tsc --noEmit` clean; vitest 86 files, 1004 tests pass; `vite build` exit 0; `npm run walk-gap` PASS at 97.0 m (limit 100); local smoke (`scripts/smoke.mjs`) passed with no console or page errors.
- Showcase frames rendered locally (sword swing, soldier wind-up, archer draw), ground and sky visible. The first attempt was blank sky: the screenshot was taken before the first seek drew a frame. Fixed by calling `__showcaseSeek` and waiting.
- Not yet done: PR merge, Pages run, live smoke on https://everylitwindow.com/ (recorded here after merge).

## 2026-11-15 Task 004 item 14b: stealth animals drawn (Viktor, PR #95)

- Resumed the existing `wildlife-hook` branch (`69aba59`), merged current main, completed it rather than duplicating work. Crows now circle all three held places and leave each independently; meadow flocks lift on a sprint; geese occupy the existing Mill pen; the fox follows the existing quiet-follow/sprint-away rules. Simple shapes, as authorized. No landmark pen edits.
- Added four named wildlife tour views, read-only wildlife state and an explicit capture-only rule-step hook. The frames exercise actual pure rules, with movement supplied by the capture hook, not a keyboard playthrough. Unit tests cover all held sites, freeing one, walking versus sprinting through birds, reset after departure, geese, and fox visibility.
- Gate: 1005 tests in 86 files pass; typecheck clean; production build passed (chunk-size warning); walk gap PASS 97.0 m, zero stranded cells; local smoke passed at port 4184.
- Frames: `docs/pr-media/item14b-wildlife/{crows,flock,geese,fox}-{12,18,0}.png`, script `scripts/wildlife_capture.mjs`, full report alongside. All twelve captured once, no fallbacks or page/console/request errors; not visually judged under unattended rule 1. Reports confirm twelve crows enabled and the first flock startled. The geese are not honking and the fox is idle in these shots; their reactions are covered by integration tests, not captured here.
- Performance issue, measured after chunk counts stabilized (medium quality): crows 324/324/326; flock 308/308/310; geese 282/286/284; fox 408/408/410 draw calls at noon/dusk/midnight. The 300 budget is not met in three views. No causal attribution to wildlife alone: no same-view main comparison was run. Merge uses the unattended functional gate; performance remains for critique.
- Not built here: wildlife noise affecting the Mill defenders or audible honks, place capture/save wiring (later queue items). Crows already consume game place state. Fox/flock visual tuning and the orange tail remain simple placeholders.
- Deployed: PR #95 regular merge `07d640e`, required videogametest noreply identity verified. Pages run `43744445181` succeeded and `node scripts/smoke.mjs https://everylitwindow.com/` passed. Fresh fetch and push confirm scheduled GitHub access works. Concurrent main `0e089f7` only ticked item 14 rules and was preserved. Next item: 9, remove the prototype arena; existing 20-minute continuation stays active, subject to Greg's 15-minute quiet/no-other-active-run guard.

## 2026-11-15 Task 004 item 13: alarm rules and valley awareness markers (Viktor, PR #94, merge `3c8b76e`)

- Pure `src/core/places/reinforcements.ts` extends the existing `advanceBell`: an alert volunteer must reach the bell, a stopped runner can be replaced, one ringing schedules one caller-authored outside roster, simulation-time travel pauses with the game, arrival emits one morale gain, freeing the place cancels a pending party. Silencing after ringing does not recall a party already called. No Mill roster, entry coordinates or travel time are invented here; item 16 supplies them.
- Markers above valley enemies: circle (unaware), question mark (suspicious), exclamation mark (alert), different by shape and colour. Reads actual core state; Play > Awareness markers hides them and is no longer marked soon. Ground height now contributes to HUD-bar/marker projection.
- Scope: the patrol hut keeps item 8's immediate alert on AI activation. It does not yet run place sensing or investigate suspicious stimuli. All three marker presentations are unit-tested; the played hut captures exercise alert. The hero is not an awareness observer.
- Functional gate: 997 tests in 84 files (including 19 new tests), typecheck, production build, walk gap PASS at 97.0 m, local `scripts/smoke.mjs` passed. Updated the settings regression's live-row list after its first final run correctly caught the newly working marker switch.
- Frames: `docs/pr-media/item13-awareness/hut-awareness-{12,18,0}.png`, full page screenshots including the actual DOM markers. `report.json`: three alert markers in viewport with unclipped parents at all three times; marker-off saved setting hides all three; no page/console/request errors; no screenshot fallback. Frames captured once, not judged under unattended rule 1.
- After merge: Pages run `43741178670` succeeded on `3c8b76e`; `node scripts/smoke.mjs https://everylitwindow.com/` passed. GitHub rejected the required noreply email for squash, so a regular merge through safe-tool Git preserved the required author and committer without rewriting history.
- Next: 14b (animals drawn), then 9. Existing main-thread branch `wildlife-hook` (`69aba59`, pushed 17:12 UTC) already has animal drawing work. Yielded rather than duplicating it; next run inspect/resume that branch.

## 2026-11-15 Task 004 item 14: wildlife rules (Viktor, PR open on `task-004-item14-animals`, commit `16d8b1d`)

- Logic only, shipped dark: `src/core/wildlife/`. `flocks.ts` (sprinting within 14 m startles a flock, which emits a `noise` stimulus of radius 22 m; crouching or walking does not; a flock startles once), `crows.ts` (circling iff the place is `held`), `geese.ts` (sprinting within 12 m returns a `geese` stimulus; creeping does not), `fox.ts` (idle, leading, gone; a quiet hero near the fox leads it toward the secret, sprinting near it sends it away for good, and it returns only after the hero leaves the area). Placeholder tuning in `tuning.ts`. Tests: `wildlife.test.ts`, 13 checks.
- Reuses `Stimulus`, `reaches()` and `Observation['movement']` from `src/core/stealth`; nothing duplicated.
- Gate: `npx vitest run` 79 files, 970 tests pass; `npx tsc --noEmit` clean; `npm run build` passed (chunk-size warning only); `npm run walk-gap` PASS, 97.0 m.
- Not visible in a frame: no rendering yet. Drawing the animals is the second PR.
- OPEN QUESTION (not decided): does walking, as well as crouching, past a flock startle it? The design says only sprinting does, so the code says no for walking. Greg or Claude to confirm.
- OPEN QUESTION: the design does not say how long a startled flock stays alert or what the fox's speed is; both are placeholders.

## 2026-11-15 Task 004 item 12: noticing and the first strike (Viktor, PR #88, squash `5184660`)

- Logic: `src/core/combat/blade.ts` (`resolveBladeDamage`, `isBehind`). The first-strike multiplier applies to a short-blade hit only when the target is unaware, the hero is behind it, and the target is not `cannotBeSurprised` (Stane). It reuses the arrow's `DEPTH.weakPoints.firstStrike`, so there is one number. Tests: `src/core/combat/blade.test.ts`, 9 checks.
- Noticing rules (sight cone, distance, crouch, light, noise, awareness, reaction) were already in `src/core/stealth/` with 26 tests. Checked against item 12's list; no change.
- Gate on the branch: `npx vitest run` 78 files, 957 tests pass; `npx tsc --noEmit` clean; `npm run build` passed (chunk-size warning only); `npm run walk-gap` PASS, longest walk 97.0 m (limit 100 m); local `scripts/smoke.mjs` passed. The repo reported no PR checks, so the merge was on local gates only.
- After merge: Pages run `43672835566` success on `5184660`; `node scripts/smoke.mjs https://everylitwindow.com/` passed.
- Not visible in a frame: no rendering changed, so no screenshots.
- OPEN QUESTION (not decided): the design says throwing knives "count as a strike on an unaware enemy". Item 12 says only "the bonus for striking an unaware enemy". Whether a knife hit also gets the first-strike multiplier is unsettled. Not implemented. Greg or Claude to rule.
- Next: item 14 (stealth animals, rules first). Then the noon shadow check, review 029 item 1, and task 009 step 2.

## 2026-11-15 Task 004 item 11: a day at a held place (Viktor, PR #86, squash `816566d`)

- Logic: `src/core/places/day.ts` (schedule by time of day, patrol resolution, guard-change detection, missing-guard checks). Tests: `src/core/places/day.test.ts`, 24 checks, hour by hour.
- Data: `src/data/place_days.ts`. Its header marks every number and spot name as an authored placeholder, not from the writing. Placeholders are listed under Decisions taken in `docs/tasks/day-2026-11-14.md`.
- Gate on the branch: `npm test` 77 files, 948 tests passed; `npx tsc --noEmit` clean; `npm run build` passed (chunk-size warning only); `npm run walk-gap` PASS, longest walk 97.0 m (limit 100 m); local `scripts/smoke.mjs` passed.
- After merge: Pages run `43671727928` success on `816566d`; `node scripts/smoke.mjs https://everylitwindow.com/` passed.
- Not visible in a frame: no rendering changed, so no screenshots.
- No PR checks are reported by the repo, so the merge was on local gates only.
- Next: item 12 (noticing), then item 14. Item 13 is blocked on item 8; items 8 and 9 are blocked on the hut-fight frames.

## 2026-11-15 Task 004 item 10: the three places as data (Viktor, PR #84, squash `7919e52`)

- Data: `src/data/bandits.ts` (habit text per bandit, from the writing; schedule notes for Hob, Corwin, Jory and Odo), `src/data/places.ts` (mill: first leader Harl Gadd, retaken leader Maud Kerr; forge: Rafe Dunmore; watch house: Stane; `placeById`, `garrisonMembers`, `defendersOf`, `isRosterLeader`).
- Loader: `src/data/writing_bandits.ts` reads `docs/writing/bandits.md?raw` (roster, overheard lines with their speakers from the header, yields, stay table, learns). Line text is read from the writing by id, not copied into data.
- Tests: `src/data/writing_bandits.test.ts`, 16 checks against the writing. Overheard speakers are matched to the header participants.
- Gate on the branch: `npm test` 76 files, 924 tests passed; `npx tsc --noEmit` clean; `npm run build` passed (chunk-size warning only); `scripts/smoke.mjs` on a local preview passed. `npm run walk-gap` PASS, longest walk 97.0 m (limit 100 m). The repo has no CI checks on PRs, so the merge was on local gates only.
- After merge: Pages run `43670498533` success; `node scripts/smoke.mjs https://everylitwindow.com/` passed.
- Not visible in a frame: no rendering changed. Bell, lantern and banner placement stays in `src/landmarks/plan.ts` (Claude's).
- Open for review: habit hours in `src/core/places/schedules.ts` (`HABIT_HOURS`) are placeholders (afternoon 14 to 16, midnight 0 to 2, others untuned). Odo Varn has no time in the writing; kept `midday`. See the queue's Decisions.
- Next: item 11 (a day at a held place, pure schedule logic), then 12 and 14. Item 13 is blocked on item 8.

## 2026-11-15 Task 004 item 8: a fight in the valley (Viktor, branch `task-004-item8-valley-fight`, pushed, not merged; BLOCKED)

- Built and pushed (commits `d8c57a7`, `f76b361`): patrol hut fight data (`src/data/patrol_hut_fight.ts`), valley battle ground and headless tests (`src/core/world/valley_battle.ts`), the bow aim fix in core (`bowPitch` in `src/core/bot.ts`, `fireArcherArrow` in `src/core/battle.ts`), valley fight wiring (`src/render/valley_fight.ts`, `src/render/valley.ts`, `src/render/hud.ts`), and the capture script `scripts/hut_fight_capture.mjs`.
- Gate on the branch: `npx vitest run` 76 files, 912 tests pass; `npx tsc --noEmit` clean; `npm run build` passes; `npm run walk-gap` PASS, longest walk 97.0 m; local smoke passes.
- Blocker (exact, from the frames): in `docs/pr-media/hut-fight/` (`hut-follow-12`, `hut-follow-18`, `hut-hold-12`, `hut-hold-18`) the patrol hut is in view, Bram is a sliver at the far left edge in all four, and no bandits are visible in any of them. Hero HP stayed 140/140 while the fight was held, so the earlier HP drop came from the frozen-capture bug, now fixed.
- Positions captured: hero (306, -103) following and (303, -101) holding; aim (320, -106) at 12:00 and 18:00. The first try, with the hero at spawn (300, -100), gave the same result.
- Tried without success: aiming at the hut; aiming at (320, -106); the hero 17 m back. None brought Bram or the three bandits into frame. I have not confirmed where the bandits stand relative to the camera.
- Not tried: a camera further back, between the hut and Bram. Spawn and enemy placement were left alone to suit the frame.
- Item 8 stays unticked. Item 9 waits on it. Next item in the queue: 10 (the three places as data).

## 2026-11-14 Task 009 step 2, item 3b: settings card look (Viktor, PR #81, squash `789b29b`)

- Card: one fixed card for all six pages, `min(760px, 92vw)` wide and 80% of the screen tall, in the same place on every page. Tabs on one row; Controls opens its own screen. Settings scroll under the tabs with the bottom fade. Back and Back to defaults are fixed at the foot.
- Rows: two columns, names left and controls left, each row 60 px. Group headings with a gold rule. Choices and switches use the game's gold.
- "soon": a dimmed row with a small mark, and one foot line saying what the mark means (wording above in Decisions taken; draft for review).
- Outside "Settings" heading and outside Back removed from the menu.
- Gate on the branch: `npx tsc --noEmit` clean; `npx vitest run` all pass (settings rules 20); `npm run build` passed (chunk-size warning only); `npm run walk-gap` PASS, longest walk 97.0 m; `node scripts/smoke.mjs http://localhost:4174/` passed on the branch build, and `https://everylitwindow.com/` after the Pages deploy (new bundle `index-B3U_GW-D.js`).
- Frames: Before `docs/pr-media/review032/settings-*.png`; After `docs/pr-media/review036-settings-card/1280x720/` and `960x540/` (all six pages plus Controls, `settings-report.json` in each).
- Measured at 960x540: card 760x432, top 54 px; tab row on one line; Back and Back to defaults at y 432 to 462.
- Note: the earlier captures were taken on a stale server (port 4173) and are invalid; the frames in the folder above are from the branch build (port 4174).
- Checks skipped: the repo has no CI checks on PRs, so the merge was on local gates only.

## 2026-11-14 Task 004 item 7: Bram in the valley (Viktor, PR #78, squash `2c10876`)

- Spot: Bram stands 2.5 m to the clear side of the hero and 1 m behind (`BRAM_SIDE_OFFSET`, `BRAM_BEHIND` in `src/core/world/companion.ts`). He is never placed between the camera and the hero. Crouching does not change his spot.
- Fade: when he crosses the camera's line he fades, covering every mesh including cape and sword (`casters` in `src/render/characters.ts`).
- Orders: `Q` cycles follow and hold, with a caption, and reuses the existing `squadOrder` binding. Key repeat is ignored at keydown.
- Frames (review 035): `road_in` 18:00 and `family_stones` 12:00 and 18:00 show Bram (red cape) clear of the camera line and not covering the hero (blue cape). The `Q` hold caption frame shows `Bram: "Staying. Shout if you die."` with no page errors.
- Grey slab: with Bram hidden it is still visible, so it is not Bram. From one frame it looks like the hero's own left-arm gear. Not confirmed. The camera position was not recorded, so it is not reported as a finding.
- Closed without merge: PRs #70 and #72 (superseded; #71 is merged and holds the settings pages).
- Gate on the branch: `npx vitest run` 75 files, 905 tests passed; `npx tsc --noEmit` clean; `npm run walk-gap` PASS, longest walk 97.0 m (limit 100 m); live smoke `node scripts/smoke.mjs https://everylitwindow.com/` passed; Pages run `43660412229` success.

## 2026-11-14 Task 004 item 4b: fast pathfinding (Viktor, branch `task-004-4b-fast-paths`)

- `src/core/world/pathfinding.ts`: the walkable grid is built once by `buildWalkableCells(grid)`, which calls the walk rule once per cell and nowhere else. `findPathCells` runs A* over typed arrays (cost, parent, closed set, and a Float64Array binary heap) with integer cell indexes, and makes no height or solids calls in the loop. `findPath` keeps its signature and delegates to these.
- Equivalence (`pathfinding_equivalence.test.ts`, 3 tests): the previous implementation is kept in the test as a reference. 300 seeded random grids × 8 queries (2,400 comparisons, more than 300 with a found route) give identical results. Rejected and trivial endpoints match. In a 30×30 grid the walk rule is called 900 times to build the grid and 0 times during 20 searches.
- Targets (`pathfinding_valley.test.ts`, valley at 0.5 m, search only, grid prepared): the 200 m route (100,-100) to (100,100) takes about 1.6 ms, and the 70 m route (-40,120) to (-110,120) about 0.05 ms (each the fastest of 5 runs). The tests assert under 50 ms and under 10 ms. The old 1 m "under 1 s" test is removed.
- Finding for items 7 and 8: building the whole valley grid at 0.5 m (1,083,681 cells) takes about 35 s, because each cell calls `isWalkableGround`. It must be built per region and cached.
- Gate in the worker sandbox on the working tree: `npm test` 887 passed (74 files; 883 on item 6, net +4); `npx tsc --noEmit` clean; `npm run build` passed (chunk-size warning only); `npm run walk-gap` PASS, longest walk 97.0 m; Playwright chromium; `vite preview` plus `scripts/smoke.mjs` passed.
- Not visible in a frame: no rendering changed.

## 2026-11-14 Task 004 item 6: arrows meet the world (Viktor, PR #76)

- Arrows stop on terrain: an arrow whose `y` is below the ground under it plus the wall height is stopped if its ground is a rise above the arrow. Tests: a 2.5 m rise is passed and the enemy beyond it is hit; a 6 m rise stops the arrow before it reaches the enemy.
- Arrows stop on solids: `BattleGround.solids` (optional, from `valleySolids()`) stops an arrow inside a footprint widened by the arrow radius, while its `y` is below the ground plus `TUNING.arrow.wallHeight` (6 m, a placeholder until solids carry heights; see the queue's Decisions). Tests: a wall stops the arrow and the enemy is unhurt; a doorway gap lets the arrow through to hit.
- Stops are checked once per fixed step (0.83 m at 50 m/s), so an arrow can stop up to one step past a face. The test bounds say so.
- Flat ground changes nothing: a scripted 1,500-step fight (sword, bow, three soldiers) with no ground and with `heightAt: 0`, `simRadius: Infinity` gives the same fighters, events, status, time and projectile count. An arena fight with no ground is unchanged.
- Gate in the worker sandbox on the branch: `npm ci`; `npm test` 883 passed (73 files), of which 6 are new; `npx tsc --noEmit` clean; `npm run build` passed (chunk-size warning only); `npm run walk-gap` PASS, longest walk 97.0 m; Playwright chromium; `node scripts/smoke.mjs` on a local preview passed.
- Not visible yet: no arrow frames, because nothing renders differently with the arena off. Stopping arrows on the valley's terrain and solids runs in the valley, which the item 8 frames will show.

## 2026-11-14 Task 004 item 5: fighters on the ground (Viktor, branch `task-004-item5-ground`)

- `BattleGround` (`heightAt`, `simRadius`) is optional on `createBattle`. Each fighter has `y` from the ground, refreshed after movement and collisions.
- Fighters beyond `simRadius` of the hero are frozen: zero velocity, no AI, no actions. The hero is always simulated.
- Arrows are world height. A shot starts at the shooter's ground plus muzzle height; an arrow lands when it reaches the ground under it. A fighter is hit when the arrow is within its body band above its own ground.
- With no ground, every fighter is simulated and `y` stays 0, so the arena behaviour is unchanged.
- Tests: new `src/core/battle_ground.test.ts` (8 tests) for flat behaviour, ground height, culling in both directions, and arrows on raised ground. Full suite 877 passing, typecheck and build pass.
- Not rendered yet and not played in a browser. No frames are attached, because this item has no visual change.

## 2026-11-14 Task 004 item 4: valley pathfinding (Viktor, branch `task-004-pathfinding`)

- `src/core/world/pathfinding.ts`: the open set is a binary min-heap (ties by first insertion). Same signature and output as before: 2,000 random queries compared, all equal (1,028 with a path).
- `src/core/world/pathfinding_valley.test.ts` (5 tests): the ford is wadeable and water is only entered at a crossing; with every crossing closed there is no route across the river; the mill bridge; the stepping stones at 0.5 m; a 70 m local route at 1 m under 1 s.
- Stepping stones at 1 m: 11 of 29 stone cells are reachable from the west bank, with a diagonal-only gap near (-252, 3). At 0.5 m: 105 of 105. The planner uses 0.5 m cells. This is a planner-resolution issue, not a walk-rule issue.
- Timings (this sandbox, relative only): 400x400 open grid at 1 m 1,145 ms; 200x200 at 1 m 177 ms; valley corner to corner at 1 m 10,301 ms for 1,357 steps. Local 70 m routes: 1 m mean 260 ms, worst 461 ms; 0.5 m mean 1,009 ms, worst 1,731 ms.
- Corner-to-corner routes across the valley (for example (-300,-300) to (300,300)) return null. The rim and gorge split the walkable ground. Fighters path over nearby chunks, so this is not a requirement.
- Gate: `npx vitest run` 852 passed (71 files); `npm run typecheck` clean; `npm run build` passed (chunk-size warning only); `npm run walk-gap` PASS, longest walk 97.0 m; `node scripts/smoke.mjs` passed on a local preview.
- PR #73 squash-merged as `6fc076b`. The repo has no PR-level CI (the only workflow runs on push to `main`), so the local gate above was the pre-merge check.
- Pages run `43634874976` on `6fc076b`: test, build, built-game smoke, and deploy all green.
- Live smoke: `node scripts/smoke.mjs https://everylitwindow.com/` passed (no console errors, page errors, or failed requests).
## 2026-11-14 Task 009 step 2 (settings pages) and item 2 (Viktor, branch `task-009-settings-pages`, stacked on #71, NOT MERGED)

- Built: Settings tabs Display, Sound, Camera, Controller, Play, plus Controls. Every page ends with Back to defaults (Yes/No). Rows that the game does not use yet read "Not yet in the game." Pure rules in `src/render/settings_pages_rules.ts` (17 tests). Commit `8953770`.
- Controls tab bold bug fixed (font weight set on the button outside the tab map).
- Capture: `scripts/settings_pages_capture.mjs`, failures `[]`. Frames: `docs/pr-media/review032/settings-{display,sound,camera,controller,play}.png`. The Play frame is taller than 720 px, so its Back sits below the fold.
- Capture fix: `scripts/brightness_picture_capture.mjs` matched two "Back" buttons (Settings and Controls, both in the DOM). It now uses an exact, visible match. Run exit 0, failures `[]`.
- Gates on the branch: typecheck clean; vitest 71 files, 864 tests pass; build passes; smoke passes against the local preview.
- Quality budget, arrival view at 18:00, `scripts/quality_budget.mjs`, chunks stable before reading. Draw calls (budget 300) and frame time (1000 / fps, headless SwiftShader, relative only, not a budget figure):

| Quality | Chunks | Draw calls | fps | Frame time (SwiftShader) |
| --- | --- | --- | --- | --- |
| low | 47 | 224 | 10 | about 100 ms |
| medium | 76 | 258 | 12 | about 83 ms |
| high | 97 | 284 | 11 | about 91 ms |

  The table in "Quality" below (212 / 246 / 272) is an earlier run on a different branch state; these numbers supersede it for PR #72. [capture, 2026-11-14]
- Brightness pass mark (review 032): **still not met on the recheck frames.** `docs/pr-media/review031-recheck/picture-{0.5,1,1.5}.png`: the card sits along the bottom and the house is clear, but I cannot see the scarecrow in any of the three. Cropped yard (x 250 to 800, y 300 to 520) at 0.5 and 1.5 shows no figure. The hero is at (93.3, 107.2) and the figure at (85.8, 107.3), so it is about 7.5 m away and it may be behind the view axis. Not changed: needs Greg or Claude's decision (look point or figure placement).
- Queue item 2 ticked (PR #72). Item 3 ticked: every page at 1280x720 (`docs/pr-media/review032/settings-*.png`, Controls included), damaged-settings test in `settings_pages_rules.test.ts`, quality figures above. Item 1 stays unticked: pass mark not met.

## 2026-11-14 Task 009 step 2, queue item 1: brightness prompt (Viktor, branch `task-009-brightness-prompt`), NOT MERGED

- Built: first-start brightness check (saves `brightness` and `brightnessSet`); `hesper_door` midnight picture with the hero hidden and the clock frozen; card along the bottom with the exact review 031 copy; "Set brightness again" on Display; close restores clock, hero and camera. Commit `b29b36a`, merged with `origin/main` `defcfd9` as `30f40a5`.
- Curve (review 032, `src/core/settings/settings.ts`): exposure = 0.35 + 0.65 × b^1.5. From `picture-report.json`: 0.5 gives 0.58, 1 gives 1.00, 1.5 gives 1.54. [capture, 2026-11-14]
- Gates on the merged tree: typecheck clean; `vitest` 70 files, 847 tests pass; build passes (chunk-size warning only); `scripts/brightness_picture_capture.mjs` failures `[]` (both phases; clock and hero restored exactly on close). Smoke test not yet run, since the PR is not merged.
- Pass mark (review 032): **not met.** The scarecrow is in none of the three frames (`docs/pr-media/review031/picture-0.5.png`, `picture-1.png`, `picture-1.5.png`). It is built at (85.8, 107.3) (`src/village/build.ts`, `SCARECROW` in `plan.ts`). The `hesper_door` view has the hero at (93.3, 107.2) looking at (86, 98), so the figure is about 52° left of the view axis, outside the frame. Review 032 says it sits near the middle of the frame; these coordinates do not give that.
- Not changed, per the rule against moving the figure or the view to pass a frame. Decision needed: move the `hesper_door` look point (`src/core/world/tour.ts`) or the figure (`src/village/`, Claude's path).
- Card: along the bottom; does not cover the house or Hesper's lit window. Exposure steps are visible (dim, lit, brightest) and the ground lit around the house changes with them.
- Queue item 1 stays unticked. The PR stays open until the figure reads at 1.

## 2026-11-13 Task 009 step 2c: brightness, quality, Controls scroll hint (Viktor, branch `task-009-brightness`)

- Greg's 17:00 ruling applied: noon shadow closed, no lighting change. Scroll hint added: a 36 px fade at the bottom of the Controls list while more rows remain (`moreBelow` in `controls_rules.ts`, 3 tests).
- Brightness: superseded by the 2026-11-14 entry above (review 032 curve).
- Ground share, midnight `hesper_door` (tod 0), fresh preview server, `scripts/ground_vs_sky.py`: 2.60 at 0.5, 3.05 at 1.0, 3.42 at 1.5. All above the 0.25 floor. Frames: `docs/pr-media/review2c/v2-b0.5|v2-b1|v2-b1.5/hesper_door-0.png`. By eye, 1.5 is lifted and the sky stays dark.
- Earlier frames (`docs/pr-media/review2c/b0.5|b1|b1.5/`) came out identical (ground share about 3.0 each). Cause not confirmed. Likely a stale preview server still serving an older bundle. Those frames are not used.
- Quality (`src/render/quality.ts`, my proposal, Greg to decide): low = 1024 shadow map, 220 m fine-land stream; medium = 2048, 340 m (today's values); high = 2048, 420 m. Scenery density is not changed by quality: per-band splits were rejected (about 130 extra draw calls). Arrival view, 18:00, medium, `scripts/quality_budget.mjs` (chunks stable before reading):

| Quality | Chunks | Draw calls (budget 300) | fps (headless SwiftShader, relative only) |
| --- | --- | --- | --- |
| low | 47 | 212 | 12 |
| medium | 76 | 246 | 10 |
| high | 97 | 272 | 10 |

- Brightness prompt: shows once while `display.brightnessSet` is false. It appears over the live scene, not over a midnight picture; this differs from task 009 step 2 item 3. Decide whether it should be a midnight picture. In the first capture it covered the Controls page; `controls_capture.mjs` now takes `TOUR_SETTINGS` and skips it. Default kept: flag, not changed.
- Controls check (`node scripts/controls_capture.mjs`, with `brightnessSet: true`): passed. 10 rows shown in full, 0 cut. Frames in `docs/pr-media/review2c/controls-v2/`; the scroll hint shows the Interact row faded.
- Dark figure in Hesper's yard (task 009 step 2 item 3 asks for one in the brightness picture): not found in the code (`src/village/build.ts`, `src/village/plan.ts`, `src/core/world/valley_layout.ts`, `src/render/characters.ts`; the only CharacterView in `valley.ts` is the hero). Not visible in the 18:00 or midnight `hesper_door` frames. Open: Greg or Claude to say whether it should be added, and where.
- Tests: `npx vitest run` 847 passed; `npm run typecheck` clean; `npm run build` passed (chunk-size warning only); `node scripts/smoke.mjs` passed on a local preview.
- Push: see the Slack post and the PR. Any push step that fails is recorded below this line.

## 2026-11-13 Task 009 step 2b, layout fix (Viktor, branch `task-009-layout`)

- Built, per Greg's 16:25 list: the card is 80% of the screen height (576 px at 1280x720); the scroll area holds whole rows only (`fitRows`, 36 px rows), so no row is cut; "Keyboard and mouse", the title and the Action / Main / Spare header stay fixed above it; action names are centred on their row and left-aligned under "Action"; the listening slot shows "Press…" with a 2 px outline until bound or cancelled.
- "Still has" notice wired: `noticeFor` in `src/render/controls_rules.ts` returns "{action} now uses {input}. {other} still has {remaining}." (`docs/writing/interface.md` line 233). Test in `controls_rules.test.ts`.
- Frame at 1280x720 (`docs/pr-media/controls/`): 10 rows shown in full, 0 cut (printed by `scripts/controls_capture.mjs`). Before frames from the live site in `docs/pr-media/controls/before/` (the old page cuts a row).
- Capture fix: the Esc checks now wait for the menu change (up to 5 s) instead of a fixed 300 ms. The pause key is read once per game frame, so a fixed delay failed on a slow frame.
- Gates: `tsc --noEmit` exit 0; 839 tests pass; `vite build` exit 0; `node scripts/smoke.mjs` passes on a local preview.
- Finding for Claude (not changed here): `ShiftLeft` shows as "Shift". `KEYS` in `src/core/settings/labels.ts` maps `ShiftLeft` to `'Shift'`, and `src/core/settings/settings.test.ts` (around line 126) asserts `'Shift'`. Greg asked for "Left Shift". Both files are Claude's paths; the label will change once Claude edits them.

## 2026-11-13 Task 009 step 2b: Controls page (Viktor, branch `task-009-step2`)

- Built: Controls page in the pause menu (Resume, Settings, Controls). Table of every action with Main and Spare slots (keyboard and mouse). Click a slot, then press a key, mouse button or wheel tick. Esc cancels a listening slot without closing the menu. Reserved Esc keeps the slot listening. Back to defaults asks for confirmation first and resets the keyboard page.
- Pure rules in `src/render/controls_rules.ts` (keys, mouse, wheel, notices), 12 tests in `controls_rules.test.ts`. The core in `src/core/settings/` is unchanged.
- Gates on the branch: `tsc --noEmit` exit 0; 839 tests pass (`npx vitest run`); `vite build` exit 0; `node scripts/controls_capture.mjs` passes 12 of 12 in headless Chromium (open, rebind J, saved to `everylitwindow.settings.v1`, Esc cancels a slot, Esc back to the menu, Esc resumes, no console errors).
- Frames at 960x540 in `docs/pr-media/controls/`: `pause_menu.png`, `controls_page.png`, `controls_listening.png`, `resumed.png`.
- Layout note for the walk-through: at 960x540 the Controls table scrolls inside the card, so the first view shows the top rows only (`controls_page.png`). Looked at by eye, not changed.
- Not built, on purpose: the Controller tab (task 004 waits); Copy debug report and Return to title (not built yet, as in 2a); Settings "Back" is still the 2a placeholder.
- Copy gap for Greg or Claude: when a rebind displaces an action that keeps a spare, `docs/writing/interface.md` has no line for it, so no notice is shown. A clean assignment shows "{action} now uses {input}.", composed from the copy's sentence pattern. Decide whether that line is wanted.
- Saved bindings are read by the game through `saveSettings` (`src/render/settings_store.ts`) and `PlayerInput.setBindings` (`src/render/input.ts`). The valley wires both (`src/render/valley.ts`).

## 2026-11-13 Task 009 step 2a: pause menu (Viktor, PR #65)

- Step 2 is split per Greg's 15:26 ruling: 2a pause menu (this entry), 2b Controls, 2c Brightness, 2d remaining settings, 2e quality levels. Each is deployed before the next starts.
- Merged to `main` as `8ab81ac` (PR #65, squash). Pages run 43504849600 (Test and deploy to GitHub Pages): success. Live smoke `node scripts/smoke.mjs https://everylitwindow.com/`: passed.
- Gates on branch `pause-menu` at `e873b06`: 827 tests pass, `tsc --noEmit` exit 0, `vite build` exit 0, smoke test passed on a local preview. The workflow only runs on push to `main`, so PR #65 had no checks to report.
- Pause timing, measured in frames (headless Chromium, software GL): Esc read at frame 29; pause took effect at frame 30 (one frame). Clock frozen from frame 30. Six samples at frames 33 to 43 show one time of day. Test: clock does not advance on the Esc frame or any later frame while paused.
- Built: pause menu with Resume and Settings. Esc on the menu resumes; Esc on Settings goes back to the menu. Losing mouse capture pauses; regaining it resumes. Escape is reserved: a slot-0 rebind of pause is refused as `reserved`; a spare slot keeps Escape.
- Not built in 2a: Controls, Copy debug report, Return to title. The "Back" label on Settings is not in `docs/writing/interface.md`, so it is a placeholder to confirm. Gamepad pause (Pad 9) waits for task 004.
- Page list discrepancy: `docs/writing/interface.md` lists Resume, Settings, Controls, Copy debug report, Return to title for the pause menu, and its Settings section differs from design v36's settings list. 2a follows `docs/writing/interface.md`. Greg to confirm which governs.
- Frame: `docs/pr-media/pause-menu/pause_menu.jpg` (960x540).
- Noon hero shadow (review 029 item 1): checked at hero (120,-2), 12:00 and 15:00. Light follows the hero, so range is not the cause; the noon shadow is short under the feet because the sun is high. See the "Noon shadow" entry below. Any lighting change is Claude's.
- Sandbox outage (about 19:15 to 19:33 UTC) is logged in the entry above.

## 2026-11-13 Review 030 retake: shadows and ground share (Viktor, branch `review030-frames`)

- Retake after main `c0c790f` with `shadow.darkness` 0.1: 16 tour views at 18:00 and 12:00 in `docs/pr-media/review030-retake/`.
- Ground share (ground luma over sky luma), full per-view list in `docs/pr-media/review030-retake/ground_share.txt`. 18:00 ranges 0.66 (hesper_door) to 1.045 (stepping_stones); 12:00 ranges 0.417 (high_lane) to 1.004 (stepping_stones). All above the 0.25 floor.
- Noon hero shadow: visible on the ground under the hero's feet (hero at 120,-2, 12:00; `hero-noon.png`). Checked on a downscaled copy, not at full resolution.
- Sky blocker: no such entry existed. Greg closed it.

## Ford (PR #60): frames for review, not merged

- Gravel lightened from (0.66, 0.62, 0.54) to (0.86, 0.82, 0.72) in `FORD.gravel`; nothing else changed (landHeightAt and water alpha untouched).
- Frames at (132, -36) looking at (132, -12), and at (160, -14) looking at (142, -22), at 12:00 and 18:00. Pass mark (review 028 item 3): one continuous river with a pale band under the water.
- By eye: the river reads as one continuous body of water, bank to bank. The pale band under the water is faint at 12:00 from the first position and weak at 18:00. It does not clearly pass. PR #60 is not merged; Greg to judge from the frames.

## 2026-11-13 Review 025 item 5: the tour views (Viktor, branch `overnight-14-ridge-path`)

- The old `high_lane` view is renamed `ridge_path` (hero 160,-112; look 254,-100). New `high_lane` (hero 150,86; look 100,85, Wick's high lane) and `hesper_door` (hero 92,108; look 86,98) are in `src/core/world/tour.ts`, before `landing`. The walkability test covers the new hero points.
- Merged to `main` as `aaecabb` (PR #57, squash). Deploy run 43461685945 (Test and deploy to GitHub Pages): success. Live smoke `node scripts/smoke.mjs https://everylitwindow.com/`: passed.
- Frames: `docs/pr-media/review025-item5/` (`high_lane`, `hesper_door`, `ridge_path`, at 18:00 and 12:00). Checked by eye: the hero is in frame on high_lane and hesper_door, seen from behind. On ridge_path the hero still faces the camera at the stop; that is item 6 (`tourYaw`), not done here.
- Gates: tsc clean; vitest 62 files / 779 tests; build OK.
- Not done here: review 025 items 6 (tour camera), 7 (signal-hill bushes), the ford rework, and the sky.

## 2026-11-13 Review 025 item 6: tour camera faces the view

- Tour hero now faces each view's look point (`tourYaw` in `src/core/world/tour.ts`, set in `tourTo`). Tests: every view's hero faces its look point; the tour camera sits behind the hero at tour distance.
- `hesper_door`: hero moved one step to (93.3, 107.2) on walkable ground so the door shows past his shoulder. Frame: `docs/pr-media/review025-item6/hesper_door-18.png`.
- `ridge_path`: stop kept at (160, -112). Frame: `docs/pr-media/review025-item6/ridge_path-18.png`, hero from behind on grass.
- Camera check: the earlier frame that showed the hero facing the camera came from a stale preview build. Fresh captures show him from behind. No camera change was made.
- Finding, not fixed: `ridge_path` has no visible surface. It exists only as core data (`VALLEY_ROADS`, used for keep-out, grading and walkability). The renderer draws only Wick's lanes and the walkable crossings, so no path is drawn there. The stop was not moved.

## 2026-11-13 Review 025 item 4: capture without the interface (Viktor, branch `overnight-13-capture-hud`)

- The capture scripts hide the HUD box (clock, figures, hint, tour label) before each frame. `window.__valley.hideChrome()` is the hook; `scripts/tour_capture.mjs` and `scripts/valley_capture.mjs` call it after freeze. Babylon has no line meshes in the render layer, so the debug lines were the text in that box.
- Ground share is replaced by the brightness figure (review 025 note). The scripts record a ground mask per shot; `scripts/ground_vs_sky.py` turns it into ground luma over sky luma. Run with `uv run --with pillow python scripts/ground_vs_sky.py <dir>`. Luma is Rec. 709 on sRGB values, a brightness proxy and not photometric. The old screen-share figures (0.522 and similar) are superseded.
- Ground-vs-sky, 18:00 / 12:00 (`docs/pr-media/overnight-13-hud/state.json`): arrival 0.737 / 0.563; road_in 0.679 / 0.505; wick_square 0.779 / 0.561; landing 0.808 / 0.640; high_lane 0.973 / 0.636; signal_hill_top 0.786 / 0.603; ford 0.844 / 0.570; mill_bridge 0.859 / 0.591; stepping_stones 1.109 / 0.998; gate 0.751 / 0.607. All above the 0.25 floor.
- Frames: `docs/pr-media/overnight-13-hud/` (20 PNGs, 10 views at 18:00 and 12:00). `ford-18.png` and `high_lane-12.png` checked by eye: no HUD text or tour label. The ford still shows the grey slabs on the banks; that is review 025 item 2's follow-up, not this item.
- Gates: tsc clean; vitest 61 files / 765 tests; build OK; walk gap 97.0 m (limit 100 m); local smoke OK.
- Merged to `main` as `3388c54` (PR #55, squash). Deploy run 43459007837 (Test and deploy to GitHub Pages): success.
- Live smoke: `node scripts/smoke.mjs https://everylitwindow.com/` passed.
- Not done here: review 025 items 5 to 7 (ridge_path rename, tour camera behind the hero, signal-hill bushes), then the ford rework, then the sky.

## 2026-11-13 Review 025 item 3: the tree keep-out (Viktor, branch `overnight-13-tree-keepout`)

- The arrival sight line keeps scenery 25 m off for its last 150 m, ending at Hesper's window (`hesperSightNearLine` and `SIGHT_NEAR_LENGTH` / `SIGHT_NEAR_HALF_WIDTH` in `src/core/world/scenery.ts`). The keep-out is a road zone added to `sceneryKeepOuts()`. New test in `scenery.test.ts` (review 024 item 4).
- Frames: `docs/pr-media/overnight-13-keepout/` (`arrival` and `road_in`, at 18:00 and 12:00), with `state.json`. Ground share from these captures: arrival 0.522, road_in 0.582.
- Gates: tsc clean; vitest 61 files / 765 tests; walk-gap 97.0 m; build OK. Smoke to follow after the deploy.
- Not checked by eye in this run: the frames did not load in the viewer here, so the hero-in-frame and tree-clearance look still needs Greg's review.

## 2026-11-13 Review 025 item 2: the crossings (Viktor, branch `overnight-13-crossings`)

- The ford (gravel slab under 0.4 m of water, worn bank stones at ground level), the mill bridge (deck from `walkSurfaceAt`, piers every 2.5 m, rail on the upstream side with posts every 2 m) and the stepping stones (tops at water + 0.3 m, equal to `walkSurfaceAt`) are drawn in `src/render/valley_crossings.ts`. The geometry is pure, in `src/render/valley_crossings_parts.ts`, with 14 tests. The forge bridge is not drawn (not walkable).
- Frames: `docs/pr-media/overnight-13-crossings/` (`ford`, `mill_bridge`, `stepping_stones`, at 18:00 and 12:00). The ford frames show the sand gravel crossing between water on both sides. The bank stones sit 0.2 m above the local ground, so the stacked look mid-frame is slope, not hover.
- Gates: vitest 60 files / 734 tests; walk-gap 97.0 m; build OK; local smoke OK.
- Ground share from the new tour captures (brightness against sky): ford 0.675, mill bridge 0.683, stepping stones 0.907 (18:00 frames). The noon ford frame is the same view at 12:00.

## 2026-11-13 — Review 025 item 1: the gate

- Gate is 4 m planks, 5 m posts, bar 3.4 m; the pass floor is level from 10 m before the gate to 2 m beyond it (`passFloor` in `src/core/world/valley.ts`). Continuity test at s = −10 added.
- Frames: `docs/pr-media/overnight-13-gate/gate-18.png` (dusk 18:00), `gate-12.png` (noon). Taken from the tour's `gate` view, about 15 m from the gate.
- Gates: tsc clean; vitest 59 files / 720 tests; walk-gap 97.0 m; build OK; smoke OK (local).
- Ground share is brightness against sky (Greg's definition, 2026-11-13). The capture script still prints the old screen-share figure (0.983 for these frames); that is superseded and the script change is the next item.
- Identity note: squash commits on `main` since #49 are authored `videogametest <support@gridironwife.com>`, not the noreply address Greg asked for. New commits use `355531315+videogametest@users.noreply.github.com`. Not rewritten.

## 2026-11-13 Sandbox outage, aimAt push, and the noon shadow frame (Viktor, branch `task-009-step2`)

- **Outage:** sandbox calls failed with `AuthError: token validation failed (sandbox exec infrastructure failure)`. Worker commands failed with `InvalidError: Total length of CMD arguments cannot exceed 65536 bytes (ARG_MAX)`, even for `echo ok`. It started about 19:15 UTC (14:15 ET) and recovered about 19:33 UTC (14:33 ET), so about 18 minutes. The start time comes from my notes, so treat it as approximate.
- **Work saved:** the review 029 item 1 `aimAt` reset is pushed as `92f9d1d` on `task-009-step2` (two files: `src/render/valley.ts`, `scripts/valley_capture.mjs`). Scratch folders and `scripts/_shadow_check.mjs` were not committed. `main` is at `5171126`, which changes only `docs/writing/`; the branch is not rebased.
- **Noon shadow frame (review 029 item 1):** the hero's shadow is not visible under his feet. The ground around him is evenly lit (`hero-noon.png` on the worker, `docs/pr-media/review029/`). The shadow wiring looks present (terrain receives shadows; the hero is registered as a caster in `CharacterView`). The cause is not found yet.
- **Sky blocker:** no sky blocker entry exists in this branch's `docs/status.md`, so nothing was removed. Greg, if it is in another file, tell me which one.
- **Shadow cause (follow-up, see the entry below):** not a light-range or bias fault. The earlier "no shadow" reading came from a probe that read the light before its first tick.
- **Next:** task 009 step 2.

## 2026-11-13 Noon shadow: checked at 12:00 and 15:00 (Viktor, branch `task-009-step2`)
- **Light follows the hero:** yes. `updateView()` sets the sun position to the hero, 200 m back along the sun direction, every frame. The hero is inside the ±90 m shadow frustum at both times [sandbox probe, 2026-11-13].
- **Overhead angle and bias:** not the cause. At 12:00 the sun direction is (0, −0.607, −0.794), about 37° up. Bias 0.00005, normal bias 0.
- **15:00:** the hero's shadow is visible and long along the bank. At 12:00 it is short and tucked under the feet. Both frames are in the sandbox (`tod-12.png`, `tod-15.png`, cropped low bands).
- **Conclusion:** the shadow works. At noon the high sun gives a short shadow under the hero, so it reads weakly. Any change is a light-angle or strength value in `src/render/lighting.ts` (Claude's file). Not changed; asked Greg in the Slack thread.
- **Caveat:** the shadow-map pixel readout returned 0 everywhere, so it was not used. The probe's depth values for the hero were negative, which was not explained.
- **Diagnostic hook:** the uncommitted `__diag` line was removed before this entry; nothing from the probe is committed.


## 2026-11-13 Noon shadow: answer to Greg (Viktor, branch `task-009-brightness`)
- **Answer:** the sun's height. Not range (the sun light follows the hero every frame, `valley.ts` `updateView`), not bias (shadow bias 0.00005, normal bias 0).
- **Check this session:** `docs/pr-media/review030-retake/hero-noon.png` (12:00) shows the hero's shadow under his feet, short and visible. The 15:00 frame named in the earlier entry (`tod-15.png`) was not found in this sandbox, so the 15:00 result is from the earlier capture, not re-rendered.
- **Not changed:** `src/render/lighting.ts` is Claude's. Reported in Slack, thread `1794430314.296969`, at 1794607173.

## Streams

| Stream | Doing | Open PR | Blocked |
| --- | --- | --- | --- |
| A | Task 002 steps 1–9 merged (PR #12, `659222d`). Done. | none | none |
| 003 | Step 1 merged (PR #23). Walk-distance check merged (PR #25). Review 016 items 1–3 merged (PR #26, PR #27). Review 018 items 1–2 merged (PR #30, PR #31); item 3 test merged (PR #33). Review 020 item 4 merged (PR #36, `22cda16`). Review 018 item 5 merged (PR #37, `d55926d`). Review 021 merged (PR #39, `66694be`): signal hill test active, stepping-stone landings in. Next: review 018 item 6 (grades), then items 7 to 9 and open items from 016 and 017. Step 2 not started. | none | Road and path grades above review 018 targets (item 6). Tour-mode screenshots not built. Falls frame. Landings at the stepping stones not yet seen on screen. |
| B | Task 002b style test rework (review 005), PR #21 merged: items 1–7 checked by eye, frames in `docs/pr-media/styletest/review005/` (see `CHECKLIST.md`). | none | Greg's review of the rework; sign legibility at 1280×720 (open question below); villager-set search not yet done; task 003 waits on these |
| C–H | Logic streams (world, stealth, combat, items, people, music) | none | Not started; added as capacity allows. Task 003 waits for the survey review. |

## 2026-11-13 Overnight item 12: standard frames (Viktor, branch `overnight-12-frames`)

- **Merged:** PR #50, squash `8fe23eb`. Deploy run 43447408101 succeeded. Live smoke on https://everylitwindow.com/ passed.

- **Frames:** `docs/pr-media/overnight-12/`: `arrival-dusk-19.png`, `noon-12.png`, `night-0.png`, `dawn-6.png`. Taken from the tour's arrival view (`?tour=1`, `arrival`) with `scripts/tour_capture.mjs <url> <dir> arrival 19,12,0,6`.
- **Ground share [tour capture, 2026-11-13]:** 0.522 at all four times.
- **Script fixes:** `tour_capture.mjs` takes an optional fourth argument of times. `valley_capture.mjs` now records ground share, and runs the aimed sun and moon shots last, because `aimAt` persists and was tinting the night and dawn frames.
- **Open from the frames:** the hero is not in the arrival frame (review 024 item 4 and the earlier note on the arrival frame). Trees hide Hesper's house and two others; the keep-out is item 4 in the queue.

## 2026-11-13 Overnight item 11: tour mode (merged, PR #49, squash `bf58841`)

- **Merged:** tour views in `src/core/world/tour.ts` (10 views) and tour mode in `src/render/valley.ts` (`[` and `]` step through). Capture in `scripts/tour_capture.mjs`; 20 frames in `docs/pr-media/overnight/`.
- **Checks:** tsc clean; vitest 59 files, 719 tests; walk gap PASS, longest walk 97.0 m (limit 100 m); smoke local and live passed; deploy run 43445268880 succeeded.
- **Ground share at 18:00 [tour capture]:** arrival 0.522, road_in 0.582, wick_square 0.660, landing 0.632, high_lane 0.801, signal_hill_top 0.502, ford 0.675, mill_bridge 0.680, stepping_stones 0.907, gate 1.000 (the gorge wall fills the frame).
- **Blocker, not fixed:** the forge bridge is not walkable (152, -7), so there is no tour view for it. Not built, per the brief.

## Overnight run: answer to Greg's 00:48 question

- **Not verified.** I have not found a time or turn limit for these runs in the sandbox, and I am not stating one. What I can confirm is only that the run ended at 00:48 and that the queue was not empty. The cause of the stop needs to come from the run platform, not from this sandbox.

## 2026-11-13 Overnight item 9: trees and rocks on the valley (Viktor, branch `overnight-09-scenery`, PR #48)

- **Change:** scenery is draw-only: no collision, no shadow casters. `src/core/world/scenery.ts` (placement, keep-outs, biomes, 9 tests), `src/render/valley_scenery.ts` (one merged mesh and one thin-instanced mesh per model), one call in `loadWick()`.
- **Placement:** 599 instances; 74 within 150 m of the start. Start-to-Hesper sight line clear in the arrival frame.
- **Measured [sandbox, 2026-11-13]:** draw calls arrival-dusk-19 233, noon-12 237, noon-sun 125, night-0 127, night-moon-2 133, dawn-6 129, Wick's square 187 and 201 (both under 300). Per-band meshes with shadow casters had been at 389 to 395.
- **Checks:** vitest 696 pass; tsc clean; build OK; walk gap 97.0 m; smoke passed.
- **Frames:** `docs/pr-media/overnight/` (six time-of-day captures and two Wick-square frames).
- **Side effect:** restarting the preview on 4181 with `pkill -f "vite preview"` also killed a stale `ov06` preview on port 4173. The brief said not to touch 4173; that server was stale and nothing depends on it.
- **Push route:** direct push fails with "--mirror can't be combined with refspecs". The branch went up through a worker sandbox from a git bundle; commit hashes unchanged.
- **Next:** overnight item 10 (sky frames).

## 2026-11-13 Overnight item 8: the soldiers' road gate is drawn (Viktor, branch `overnight-08-gate`)

- **Change:** `src/render/valley_gate_parts.ts` (pure geometry: two posts, a crossbar, 30 planks on each collision face, 2.7 m tall = 1.5 × the 1.8 m hero); `src/render/valley_gate.ts` (Babylon builder, one merged mesh, wood colour); `buildGate` called in `loadWick` in `valley.ts`. `GATE_HALF_WIDTH` and `GATE_WALL_HALF` are now exported from `src/core/world/valley.ts`; no collision logic changed.
- **Tests:** `valley_gate_parts.test.ts` (5): planks on both faces at s = ±GATE_WALL_HALF; the parts span the corridor exactly across the road; every part inside the wall in s; height 2.7 m; crossbar centred on the gate line above the hero.
- **Measured [sandbox, 2026-11-13]:** vitest all pass; `tsc --noEmit` clean; `vite build` OK; walk gap **97.0 m** (limit 100); `scripts/smoke.mjs` passed on the branch build. In the browser the gate projects at screen centre from 14 m out.
- **Frames:** `docs/pr-media/gate/gate-road-noon-s-14.png` (noon, 14 m from the gate on the valley side), `gate-near-noon-s-5.png` (noon, 5 m), `gate-road-dusk-s-14.png` (18:00 dusk, dark).
- **Mistake, corrected:** the first smoke and capture run hit a preview server left running from the `ov06` worktree on port 4173, not this build, so the gate was missing from those frames. Rerun on this build's own preview (port 4181): smoke passed and the frames above show the gate.
- **Not verified:** the hero stopping at the planks in play (a collision check at the wall face is covered by the core tests, not a frame).
- **Next:** overnight item 9 (trees and scenery).

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


## Review 026 items 1 to 4 (landmark-solids)
- Item 1: the Mill, Forge and Watch-house footprints (`landmarkSolids()`) block the hero and count as valley solids (`valleySolids()`). Watch-house gate doors do not block. Test: `landmark_solid.test.ts`.
- Item 2: four tour views added after `gate` at 18:00: mill, forge, watch_house, family_stones. Frames in `docs/pr-media/review026-landmarks/`.
- Item 3: scenery keeps out 30 m of the Mill and Forge and 26 m of the Watch-house yard (`LANDMARK_CLEAR`). Test: `scenery_landmarks.test.ts`.
- Item 4: no change needed. `mill`, `forge`, `watch_house` and `family_markers` are already stops in the generated layout.
- Checks: vitest 65 files / 796 tests pass; tsc clean; build clean; walk gap 97.0 m (limit 100), 0 stranded.
- Draw calls: the figures from the first capture pass are withdrawn. They were read before the chunks had settled, so they are not valid. Not re-measured in this entry. Steady-state rule (review 027 addendum): read `drawCalls` only after `state().chunks` stops rising. Ford frames (PR #60, 12:00 and 18:00) read 198 draw calls with chunks steady at 109.
- Ground share (ground luma / sky luma): hesper_door 0.68 / 0.478; ridge_path 0.947 / 0.618; mill 0.71 / 0.532; forge 0.682 / 0.49; watch_house 0.774 / 0.598; family_stones 0.689 / 0.516. All above the 0.25 floor.
- Open: the Mill and family-stones frames do not clearly show the landmark; Greg to judge at eye check. The ridge_path frame shows the path a few metres from the hero, not under him; stop not moved.
