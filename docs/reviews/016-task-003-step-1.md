# Review 016: task 003 step 1 (PR #23)

12 November. Claude ran `main` locally and looked at it. Not ready for Greg's first look, as the status entry says; nothing here blocks step 2.

## Sound

- Terrain, walking, the camera, the clock, the sky's colours at each hour. No console errors.
- The status entry is honest about what is not built and about the numbers it could not explain.

## The draw-call numbers are a measuring fault, not a problem

The 3,438 to 22,556 figures are a running total. `engine._drawCalls.current` is only reset each frame when a `SceneInstrumentation` is attached, and none is, so it climbs for as long as the page is open. That is why it "rises from dusk to dawn": that is the order the frames were captured in.

Measured over 30 frames (the counter's change, divided by frames): **46 at dusk, 54 at noon, 55 at night.** The budget is 300. Step 1 is well inside it.

1. Fix the hook in `snapshot()`: read the counter before and after `scene.render()` in `tick()` and report the difference, or attach a `SceneInstrumentation` with `captureDrawCalls`. Then delete the old figures from the status entry.

## Fixed by Claude in this commit

- **Dusk lit only the sky.** At 18:00 the ground and the hero were near-black under a bright sky: the fault carried over from the style test (task 003, first-look bar). `lightingAt` treated 19 as dusk, so by 18 it was already moonlight. It now follows the design clock: gold light on the ground at 18, fading over the next hour, windows lit at 19. Ground against sky, measured from the frame: 0.67 at 18, 0.42 at 19, never under 0.25. Frames: `docs/pr-media/valley/review016/`.
- `src/render/lighting.test.ts` holds it: windows 19 to 1, the ground as bright at dusk as at noon, the sky never bright over dark ground.
- `VALLEY_CLOCK.dusk` and the default start hour are 18, per section 5, "The clock".

## Must change in step 2, in this order

2. **The hero is the old toy.** Apply the proportions and outline from `src/styletest/upgrade.ts` (review 011, section 7 of the design).
3. **The arena's HUD is on screen** ("HERO" bar, "1 Sword", "2 Bow"). The valley shows no health bar out of combat and no weapon tiles until there are weapons.
4. **The ground is one flat green and is the same green at dusk as at noon.** It takes brightness from the light but almost no colour. Give the terrain material a response to light colour, and vary it: path, worn ground, darker under trees.
5. **One star.** The night sky needs a field of them and the moon in view from the start.
6. Everything else already listed in the task: Wick, Hesper's window, the arrival view, scenery, sound.

## Answers

- Review 015 is on `main` (`29aa530`). Fetch.
- The 547 m walk figure: disregarded, as you asked.

## Added 13:15: the walk-distance check (PR #25)

Sound, and right not to invent stops. Merge it as it is, failing and outside `npm test`.

The ruling on the 590 m gap: neither a filler stop nor a looser limit.

1. **The number is high because the valley is still empty.** Five stops exist. The design places far more, and each joins `VALLEY_STOPS` as it is built: the Mill, the Forge, the Watch-house, the ten places off the path (section 4), the family markers, campfires, gathering spots, chests, and signposts at road junctions. Measure again after each step and report the figure.
2. **The corners should not be walkable at all.** The valley is a bowl, not a square. The boundary in task 003 is ridge, cliff, and thick forest, so the walkable ground is roughly round and the corner at (-400, -400) is behind it. `isWalkableGround` should follow that boundary once it is built. Do not put a campfire in a corner to satisfy a script.
3. **If a gap remains once the real content and the boundary are in,** that is a hole in the design, and I fill it with something that belongs there. Report where it is; do not fill it yourself.
4. The check joins the first-look bar's measured checks when task 003 step 2 is up for review. It stays out of the deploy gate until then.
