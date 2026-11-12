# 002: Sound effects and showcase mode

Status: open

## Goal

Combat can be heard, and animations can be verified without a human watching.

## Do

1. **Sound effects** from CC0 packs (Kenney audio first; keep each licence file beside its assets): sword swing, sword hit, bow draw, bow release, arrow impact, footsteps, dodge, taking damage, death, victory, defeat. Start audio on the first click.
2. **Volume controls** in the tuning panel: master, effects, and mute. Music volume can be added now and left unused.
3. **Showcase mode** (`?showcase=<clip>`), as described in `GAME_DESIGN.md` section 7: one character, one animation, fixed camera, driven by simulation time so a capture at a given time is repeatable.
4. **Contact sheets** of at least 8 evenly spaced frames each for: sword swing, bow draw and release, soldier wind-up and strike, hit, death, dodge. Save them in `docs/pr-media/`.

5. **Upgrade Babylon.js** from 7 to the current stable major and pin it. Do this first, before the other items, so everything in this task is built and verified on the new version. If the upgrade breaks something you cannot fix quickly, stop and log it in `docs/status.md` instead of staying on 7 silently.

6. **Name the game.** It is called "Every Lit Window". Add one title constant in data and use it for the page `<title>` in `index.html` (currently "Combat Prototype (Milestone 1)") and the heading of `README.md`.

## Check while you are in there

In the earlier drawn-bow screenshot (`docs/pr-media/03_bow_drawn.png`) the hero's arms appear to aim to the left of the crosshair. Use the bow contact sheet to confirm whether the draw pose points where the arrow flies, and fix it if not.

## Do not

- Build or change any arena. Arenas are removed in task 003.

## Done when

- Contact sheets are in the PR and each one clearly shows its motion.
- Tests, typecheck, and build pass. Merged, deployed, and logged in `docs/status.md`.
