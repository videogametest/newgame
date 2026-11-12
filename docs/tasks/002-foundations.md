# 002: Foundations (milestone 2)

Status: done

## Goal

Put the groundwork in place before the open world is built: the current engine, the real hero, sound, tools for verifying work without a human, and tools for diagnosing problems when a human finds one. This task still runs in the prototype arena.

## Do, in this order

1. **Upgrade Babylon.js** from 7 to the current stable major and pin it. If the upgrade breaks something you cannot fix quickly, stop and log it in `docs/status.md` instead of staying on 7 silently.
2. **Change the hero** from the knight to the hooded, cloaked archer (`Ranger.glb`), carrying the bow and a short blade in place of the sword. Give enemy archers a different model or clearly different colours, so that nothing looks like the hero. `GAME_DESIGN.md` section 2.
3. **Input rules** from section 7: pause on losing pointer lock, suppress the browser defaults for `Tab`, right mouse, the mouse wheel, and the backtick, no modifier-key bindings, and pause on losing window focus.
4. **Errors and the debug report** from section 7: capture uncaught errors and rejections, keep the rolling event log, and add "Copy debug report" to the tuning panel. The pause menu does not exist yet; add the button there in task 003.
5. **Smoke test** from section 7 at the end of the deploy workflow.
6. **Sound effects** from CC0 packs (Kenney audio first; keep each licence file beside its assets): blade swing and hit, bow draw, bow release, arrow impact, footsteps, dodge, taking damage, death. Start audio on the first click. Master, effects, and music volume plus mute in the tuning panel.
7. **Showcase mode** (`?showcase=<clip>`) as described in section 7.
8. **Contact sheets** of at least 8 evenly spaced frames each, for the new hero and the existing enemies: blade swing, bow draw and release, dodge, hit, death, soldier wind-up and strike, archer draw and release. Save them in `docs/pr-media/`.
9. **Name the game.** One title constant in data, used for the page `<title>` and the heading of `README.md`. The `package.json` name becomes `every-lit-window`.

10. **The asset survey.** Create `docs/assets.md` as section 7 (Assets) describes, covering everything tasks 003 and 004 need: terrain and scenery, at least sixteen distinguishable houses plus the Fairlow house and Hesper's, the mill with a wheel, the forge, the Watch-house, the well, fences, carts, lanterns, banners, an alarm bell, campfires, chests and breakables, characters for Hesper, Stane, villagers, each enemy type, and the six companions, and every animal in section 4. Start from these leads and confirm each licence yourself: KayKit Medieval Hexagon (CC0; its free tier lists a windmill, a watermill, a blacksmith, houses, a well, a market, a tavern, and a church, but it is made for a hex map, so check scale and whether the buildings work at character size), Quaternius Medieval Village MegaKit (modular walls, roofs, doors, and windows; licence not confirmed), and Quaternius animal packs (the farm set is CC0 but is FBX and covers a cow, horses, a pig, a llama, and a pug; no confirmed source yet for wolves, deer, a fox, geese, or a sheepdog). Include scale screenshots beside the hero. Mark what is missing and, for each gap, which rung of the fallback ladder you recommend and what it would cost. Do not buy anything.

## Check while you are in there

- In the earlier drawn-bow screenshot (`docs/pr-media/03_bow_drawn.png`) the hero's arms appear to aim to the left of the crosshair. Use the bow contact sheet for the new hero to confirm the draw pose points where the arrow flies, and fix it if not.
- Delete the merged feature branches on the remote.

## Do not

- Build or change any arena. The arena is removed in task 004.

## Done when

- Every contact sheet clearly shows its motion.
- The smoke test runs in the deploy workflow and passes.
- Tests, typecheck, and build pass. Merged, deployed, and logged in `docs/status.md`.
- The asset survey is merged and logged. Then do task 002b, the style test, which the review of the survey asked for. Task 003 waits on it.
