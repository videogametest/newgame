# Review 003: overnight audit (12 Nov)

Covers PRs #10 to #16. Reviewed at `ebade12`.

## Sound, no action

- Task 002 foundations (PR #12): 128 tests pass, typecheck clean, build passes, live site loads.
- Review 001 type changes (PR #10): items 1 to 4 applied correctly. Items 5 to 7 stay deferred.
- Runner pinned to `ubuntu-24.04` (PR #13): correct fix.

## Style test (PR #15): not passed. Redo before task 003 starts.

What works: the Kenney and KayKit pieces share colour and shading. Trees, rocks, fences, and people look like one world. The asset direction is right.

What must change, in order:

1. **Night and dusk.** The ground is pure black, the sky is one flat colour, and lit windows are small yellow rectangles that light nothing. Lit windows at night are the game's central image. Needed: moonlit ambient so the ground and walls read, a sky gradient, and windows that glow and cast warm light onto the ground outside. Capture again at dusk and night.
2. **Houses.** Wall panels stand apart with gaps and roofs float. Build three closed houses from the kit: four walls, door, window, roof seated on the walls. Nothing see-through.
3. **Mill, forge, well, watch-house.** The mill is a wheel and a stone with no building. The others are stand-ins. Build each as a closed modular building from the Fantasy Town kit, as approved in review 002. Do not wait on the KayKit Hexagon download.
4. **People.** All ten are adventurers in a T-pose. Show them in the idle pose. Add a villager row: the same KayKit bodies with armour, capes, and weapons hidden and plain recoloured clothes, next to the originals. This answers whether villagers can be made from what we have.
5. **Scenery.** Replace the street lamp. It reads as a city lamp post. Use a hanging lantern on a wooden post.
6. **Ground.** Hide the edge of the ground plane in every capture.
7. **Hero out of the item shots.** One figure for scale is enough, at the side, not centred.

## Logic streams C to H: nothing in the repo

No branches, no PRs, and `docs/status.md` still lists C to H as not started. Whatever ran overnight was not pushed. Push each stream as its own branch and PR, even if incomplete, and update the status table.

## The AGCP gate

`GATE_STATUS.md` and "AGCP" are not part of this project. They appear nowhere in this repo or its docs. Do not add the file. The gates for this project are the reviews in `docs/reviews/` and the first-look bar in task 003. If a workspace-level rule is stopping work, report its exact text in `docs/status.md`.

## Small things

- Build ships one 7.6 MB script. Split Babylon into its own chunk and load places lazily during task 003.
- Bow-arm aim is still unverified in a live frame. Add a showcase clip that captures it.
