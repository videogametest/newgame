# 003: Open world slice (milestone 2)

Status: open

## Goal

Replace the arena with the first valley of a continuous open world, as scoped in `GAME_DESIGN.md` section 8, milestone 2. Follow section 4 for the world and section 7 for architecture.

## Build in four steps

Open a PR, merge, and deploy after each step, and log each in `docs/status.md`. Greg will walk the world after each deploy, so do not batch the steps.

1. **Ground and sky.** Seeded terrain with a pure `heightAt(x, z)` in `src/core`, chunked terrain around the hero, sky, sun with shadows, day-night cycle, distance haze. The hero walks and sprints across the valley, about 500 m across. Change the hero from the knight to the hooded, cloaked archer (`Ranger.glb`), with the bow and a short blade; give enemy archers a different model or clearly different colours so nothing looks like the hero, and re-capture the hero's contact sheets in showcase mode. No enemies yet. Remove the arena and waves. Add the pause menu and settings from `GAME_DESIGN.md` section 10 (sensitivity, invert look, volume, graphics quality).
2. **A living place.** The valley is Tallowmere, with a lake at its centre and the village of Wick beside it; use the names in `GAME_DESIGN.md` section 9 everywhere. Scattered scenery by biome (trees, rocks, grass, flowers) using instancing, the lake and a river with a waterfall, the ridge and the signal hill placed so that the castle is visible from the hill and hidden from the patrol hut, a natural boundary, horizon landmarks with the dark beacon on the castle, the ambient wildlife from section 4 (songbirds, rabbits, deer, owls, bees, fish), swaying foliage, butterflies and fireflies, ambient sound by area and time of day.
3. **Places and fights.** Alarm bells at every enemy-held place (section 5). Crows over held places, startled birds, the Mill's geese, and the fox (section 4). The village in its half-abandoned starting state with the Lamplighter and their one lit window, visible across the valley at night. The Mill, the Forge, and the Watch-house defined in data with their past, person, and reward (`GAME_DESIGN.md` section 9), each looking like what it used to be. The Captain's banners over all three. The hero starts at the valley's edge at dusk facing the lit window. A few villagers with one or two short lines each. Enemies with awareness ranges that return home when led too far. Stealth and scouting as specified in `GAME_DESIGN.md` section 5: the unaware, suspicious, and alert states with markers, the noticing rules, crouch on `C`, marking through the bow zoom, and the bonus for striking an unaware enemy. Keep the noticing rules as pure functions in `src/core` with tests. The squad at the start is one companion, the friend (section 9), who follows the hero, stays back while the hero is crouched, and fights. Grid-based A* pathfinding in `src/core`. Arrows blocked by terrain and scenery. Healing by food and by resting in the village or at a campfire; place at least three campfires in the wild, with cooking and waiting until dusk or dawn. Squad orders on `Q` (follow, hold). Compass strip.
4. **Capture and rewards.** The ten places off the path from section 4, each with its content and its fragment of the story as listed in section 9. Boar in the deep forest and wolves at night that will not approach a lit lantern or campfire. Hunting, with the protected animals unharmable. Sheep, chickens, and the cat returning to Wick with recovery; lanterns on the family markers. The lantern ritual from section 9: after the defenders are cleared, the hero lights the place's lantern with `E`, the banner comes down, the melody plays with one more instrument per place freed, and the lantern is visible from a distance at night. Lighting it raises the valley recovery level, which restores that place (the mill wheel turns, the forge is lit) and the village (villagers return, repairs, more lit windows). The Lamplighter lights the first lantern alongside the hero. The miller's food is available once the Mill is freed. In this task the Watch-house can be captured like the other places; the Captain, the turn, and the finale are task 004. Chests, breakable objects, cuttable grass. Responsive music. The map on `M` with discovery. Tour mode (`?tour=1`). Balance tests from section 8.

## The first-look bar

Greg will not look at the world until Claude has reviewed the screenshots and judged that it clears this bar. A bare world shown early does more harm than a late one, so richness comes before breadth: if time is short, make a smaller area dense rather than the whole valley thin.

- **The arrival view is composed by hand, not left to chance.** Standing at the start at dusk, the player sees in one frame: the path ahead, the Lamplighter's lit window as the brightest point, the village around it, tall grass moving in the foreground, trees framing the sides, and a landmark on the horizon behind. Place terrain and scenery deliberately to make this view work.
- **Lighting and image quality:** soft shadows, ambient occlusion, tone mapping, gentle bloom on lit windows, lanterns, and fires, distance haze, and a colour grade that keeps the image warm. Night is dark blue, not black, and lit things glow against it.
- **Density:** no patch of bare ground larger than a few metres anywhere the player can walk. Grass everywhere it belongs, flowers in clumps, rocks, bushes, fallen logs, fences and walls near the village, at least three kinds of tree.
- **The village reads as a village:** at least eight buildings, a well or square, fences, a road, signs of abandonment (boarded windows, an overturned cart, weeds), and the one warm lit window.
- **Sound at first look:** wind, birds or crickets by time of day, footsteps, and the calm exploration music.
- **Evidence:** tour-mode screenshots of the arrival view at dusk, the village at noon and at night, a forest view, a field view, and the water, plus the measured frame rate and draw calls for each.

Steps 1 and 2 below are reviewed together against this bar. Deploy after each as usual, but log in `docs/status.md` that the build is "not ready for first look" until the bar is met.

## Rules

- Nothing in the game may state or imply the answer in section 9 ("The answer"). Fragments reveal only what the section says the first valley reveals.
- Never use a pronoun for Wren, and never state whether Wren is the hero's mother or father.

- Scenery comes from CC0 packs that match the KayKit characters. Keep licence files with the assets.
- Use only original or CC0 audio and art. Do not imitate characters, symbols, or melodies from any existing game.
- Meet the performance budgets in section 7. Report the measured numbers in `docs/status.md` after each step.
- Attach tour-mode or fixed-viewpoint screenshots to every PR, at noon, dusk, and night once the day-night cycle exists.

## Done when

- All four steps are merged and deployed, and the balance tests pass.
- Balance targets from section 8 still apply with the squad reduced to the one companion; retune the places to meet them. Add a bot test that clears the Mill using stealth (marks, then first-arrow strikes) and takes less damage than the loud bot.
- Then continue to task 004.
