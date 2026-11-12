# 003: Open world slice (milestone 2)

Status: open

## Goal

Replace the arena with the first valley of a continuous open world, as scoped in `GAME_DESIGN.md` section 8, milestone 2. Follow section 4 for the world and section 7 for architecture.

## Build in four steps

Open a PR, merge, and deploy after each step, and log each in `docs/status.md`. Greg will walk the world after each deploy, so do not batch the steps.

1. **Ground and sky.** Seeded terrain with a pure `heightAt(x, z)` in `src/core`, chunked terrain around the hero, sky, sun with shadows, day-night cycle, distance haze. The hero walks and sprints across the valley, about 500 m across. Change the hero from the knight to the hooded, cloaked archer (`Ranger.glb`), with the bow and a short blade; give enemy archers a different model or clearly different colours so nothing looks like the hero, and re-capture the hero's contact sheets in showcase mode. No enemies yet. Remove the arena and waves. Add the pause menu and settings from `GAME_DESIGN.md` section 10 (sensitivity, invert look, volume, graphics quality).
2. **A living place.** Scattered scenery by biome (trees, rocks, grass, flowers) using instancing, water, a natural boundary, horizon landmarks, swaying foliage, butterflies and fireflies, ambient sound by area and time of day.
3. **Places and fights.** The village in its half-abandoned starting state with the Lamplighter and their one lit window, visible across the valley at night. The Mill, the Forge, and the Watch-house defined in data with their past, person, and reward (`GAME_DESIGN.md` section 9), each looking like what it used to be. The Captain's banners over all three. The hero starts at the valley's edge at dusk facing the lit window. A few villagers with one or two short lines each. Enemies with awareness ranges that return home when led too far. Stealth and scouting as specified in `GAME_DESIGN.md` section 5: the unaware, suspicious, and alert states with markers, the noticing rules, crouch on `C`, marking through the bow zoom, and the bonus for striking an unaware enemy. Keep the noticing rules as pure functions in `src/core` with tests. The squad at the start is one companion, the friend (section 9), who follows the hero, stays back while the hero is crouched, and fights. Grid-based A* pathfinding in `src/core`. Arrows blocked by terrain and scenery. Healing by food and by resting in the village or at a campfire; place at least three campfires in the wild, with cooking and waiting until dusk or dawn. Squad orders on `Q` (follow, hold). Compass strip.
4. **Capture and rewards.** The lantern ritual from section 9: after the defenders are cleared, the hero lights the place's lantern with `E`, the banner comes down, the melody plays with one more instrument per place freed, and the lantern is visible from a distance at night. Lighting it raises the valley recovery level, which restores that place (the mill wheel turns, the forge is lit) and the village (villagers return, repairs, more lit windows). The Lamplighter lights the first lantern alongside the hero. The miller's food is available once the Mill is freed. Place at least four fragments of the question off the paths. In this task the Watch-house can be captured like the other places; the Captain, the turn, and the finale are task 004. Chests, breakable objects, cuttable grass. Responsive music. The map on `M` with discovery. Tour mode (`?tour=1`). Balance tests from section 8.

## Rules

- Scenery comes from CC0 packs that match the KayKit characters. Keep licence files with the assets.
- Use only original or CC0 audio and art. Do not imitate characters, symbols, or melodies from any existing game.
- Meet the performance budgets in section 7. Report the measured numbers in `docs/status.md` after each step.
- Attach tour-mode or fixed-viewpoint screenshots to every PR, at noon, dusk, and night once the day-night cycle exists.

## Done when

- All four steps are merged and deployed, and the balance tests pass.
- Balance targets from section 8 still apply with the squad reduced to the one companion; retune the places to meet them. Add a bot test that clears the Mill using stealth (marks, then first-arrow strikes) and takes less damage than the loud bot.
- Then continue to task 004.
