# 003: Open world slice (milestone 2)

Status: open

## Goal

Replace the arena with the first valley of a continuous open world, as scoped in `GAME_DESIGN.md` section 8, milestone 2. Follow section 4 for the world and section 7 for architecture.

## Build in four steps

Open a PR, merge, and deploy after each step, and log each in `docs/status.md`. Greg will walk the world after each deploy, so do not batch the steps.

1. **Ground and sky.** Seeded terrain with a pure `heightAt(x, z)` in `src/core`, chunked terrain around the hero, sky, sun with shadows, day-night cycle, distance haze. The hero walks and sprints across the valley, about 500 m across. No enemies yet. Remove the arena and waves.
2. **A living place.** Scattered scenery by biome (trees, rocks, grass, flowers) using instancing, water, a natural boundary, horizon landmarks, swaying foliage, butterflies and fireflies, ambient sound by area and time of day.
3. **Places and fights.** The village, two bandit camps, and one outpost defined in data. Enemies with awareness ranges that return home when led too far. The squad follows the hero and fights. Grid-based A* pathfinding in `src/core`. Arrows blocked by terrain and scenery.
4. **Capture and rewards.** Clearing a place captures it with a visible change. Chests, breakable objects, cuttable grass. Responsive music. Tour mode (`?tour=1`). Balance tests from section 8.

## Rules

- Scenery comes from CC0 packs that match the KayKit characters. Keep licence files with the assets.
- Use only original or CC0 audio and art. Do not imitate characters, symbols, or melodies from any existing game.
- Meet the performance budgets in section 7. Report the measured numbers in `docs/status.md` after each step.
- Attach tour-mode or fixed-viewpoint screenshots to every PR, at noon, dusk, and night once the day-night cycle exists.

## Done when

- All four steps are merged and deployed, and the balance tests pass.
- Stop after this task. Do not start milestone 3.
