# Overnight run, 12 to 13 November

For Viktor. Greg is away until morning and nobody will answer before then. This is a queue, in order. Work down it until it is empty or the night is over. Nothing in it needs a decision from anyone: where a choice comes up, the default is written here, and if it is not, choose the option closest to `GAME_DESIGN.md`, write what you chose in `docs/status.md`, and carry on.

## How to run the night

1. **Never stop.** Not for a review, a question, a failing check you cannot fix, or a gate from outside this repo. If an item is stuck for more than 30 minutes, write what is stuck and the exact error in `docs/status.md`, leave the branch pushed, and start the next item. Come back to it once at the end.
2. **One item, one PR.** Branch from the latest `main`, pull before you start each item, merge when typecheck, tests, build, and the smoke test pass, then deploy and check the live URL. Do not batch items.
3. **A failing check you cannot fix is not a reason to wait.** Do not merge that item. Move on.
4. **Claude's paths are read-only:** `src/village/`, `src/render/valley_far.ts`, `src/render/lighting.ts`, `src/core/company/`, `src/core/speech/`, `src/core/notes/`, and the rest in `docs/PARALLEL.md`. Import from them freely. If one of them is in your way, log it and move on; do not edit it and do not work round it by copying it.
5. **Measure, never estimate.** Every figure in `docs/status.md` comes from a script or a test you ran on the commit you name.
6. Commits as `videogametest`. Buy nothing. Add no asset that is not already in `public/assets/`.
7. **After each merge,** add three lines to `docs/status.md`: what merged, the measured figures, what you are starting next.
8. **When the queue is empty or you stop,** write "Overnight run ended" at the top of `docs/status.md` with: items merged, items stuck and why, and the frames to look at.

## The queue

Each item says what "done" is. Frames go in `docs/pr-media/overnight/`.

**1. Deploy `main` as it stands** (`7bca4bc` or later: the shelf, the far land, the merged village). Confirm the live URL and the smoke test. No code.

**2. Clear the screen.** In the valley, remove the arena's "HERO" health bar and the "1 Sword / 2 Bow" tiles, the hint text, and the clock in the corner. Default: the clock and frame figures show only with `?debug=1`. The health bar belongs to fights and returns in task 004. Done: the default route shows nothing but the world.

**3. The hero as designed.** Apply the proportions and outline from `src/styletest/upgrade.ts` (`PROPORTIONS`, review 011) to the hero in the valley. Done: a frame of the hero beside a Wick door at noon; the door is taller than the hero.

**4. The hero starts facing the lit window.** At the start, the camera looks at Hesper's house (`wickHouses(VALLEY_SEED)`, id `hesper`). Done: the first frame at 18:00 has the window within the middle third of the screen.

**5. Water takes the sky.** The lake and rivers are near-black at dusk. Make the water's colour follow `lightingAt(tod).sky` and `.zenith`, lighter toward the far shore, with a slow moving surface. Default: no reflections or refraction passes; a material and a little vertex movement are enough. Done: at 18:00 the lake is the second-brightest thing in the arrival view after the sky, measured from the frame; 60 fps is not harmed.

**6. Houses and fences are solid.** The hero walks through Wick's houses. Block the footprint of every house (9 m square, turned by its `facing`, from `wickHouses`) and the well. Fences and gate posts: default is not solid, since the gaps are meant to be walked through. Done: a test that no walkable cell lies inside a house, and that every lane in `WICK_LANES` can still be walked end to end.

**7. Review 018 item 6: grade the roads and paths.** Measure every road and path first on the current land and log the figures; the land under the east road's first stretch and the shore lane changed with the shelf. Then shape the hills as the review says. Limits: roads 0.2, paths 0.45. Done: a test of every road against its limit, the walk gap still under 100 m, and Wick's tests in `src/village/village.test.ts` still pass. If a road cannot meet its limit without breaking another test, log the best figure you reached and move on.

**8. The gate on the soldiers' road.** Draw the wall from PR #38: a barred timber gate between the cliffs, two heavy posts, a crossbar, planks, taller than the hero by half. Built from boxes in the wood colours used in `src/village/build.ts`, merged into one mesh. Done: a frame from the road, and no invisible wall anywhere a player can reach.

**9. Trees and scenery, first pass.** Use the trees, bushes, and rocks already in `public/assets/kaykit_medieval_hexagon/nature/` at about scale 12 for trees (review 012), as thin instances. Seeded. Forest thick on the rim and the hills' north sides, thin on the valley floor, none on roads, lanes, in water, inside Wick's box, or within 12 m of the line from the start to Hesper's window (`003-wick.md`, rule 6). Done: at least three kinds of tree; draw calls under 300 in the arrival view and in Wick's square, measured per frame; the start still sees the window.

**10. CLOSED 2026-11-13 (reviews 029 and 030): stars, sun glow, noon shadow and `aimAt` reset are all done. Do not reopen.** ~~Review 018 item 7: the sky frames.~~ Round stars of varied brightness, the noon sun with a glow, the hero's shadow in the noon frame, and `aimAt` reset after each aimed shot.

**11. Tour mode, `?tour=1`.** A fixed list of named views, each `{ x, z, look, tod }`, stepped with a key and reachable from the capture script by name. Start with: the arrival, the road in, Wick's square, the landing, the high lane, Hesper's door, the signal hill's top, each bridge, the gate. Done: the capture script writes one frame per view at 18:00 and at 12:00.

**12. Review 018 item 8: the four standard frames again,** from the tour, with the measured ground-against-sky figure for each.

## If the queue runs out

In this order: tests for anything in `src/core/world` that has none; the walk gap's missing stops from `docs/tasks/003-layout.md` (real places only, never fillers); the family marker stones along the road in; a contact sheet of every tour view at four hours of the day.

## What to leave alone

Wick's look (the lamp's pool, the weeds, the plank positions) is Claude's to tune. People, animals, sound, and music are not for tonight. Nothing in tasks 004 and later is to be started.
