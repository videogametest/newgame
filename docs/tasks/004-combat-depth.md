# 004: Combat depth (milestone 3)

Status: open

## Goal

Turn the thin prototype combat into the scout's combat described in `GAME_DESIGN.md` section 5. Scoped in section 8, milestone 3. Build on the open-world simulation from task 003; do not bring back arenas.

## Build in three steps

Open a PR, merge, and deploy after each step, and log each in `docs/status.md`.

1. **The bow and the blade.** Weak points, the limited quiver with arrow recovery, standard, fire, and whistling arrows, perfect draw, the three-hit combo, throwing knives, perfect dodge with its critical strike, stagger by weight, and lock-on in both views. HUD additions from section 10.
2. **Enemies.** Attack turns (at most two attackers on the hero), morale per place with breaking, fleeing, and surrendering, clean deaths with no gore, surrendered enemies who can be spared and may later appear in Wick, and the shield-bearer, brute, and runner as data-defined unit types with their own models or clearly distinct looks. Fire spreading in dry grass.
3. **Bram and impact.** Marked targets as Bram's priority, his guard-breaking strike, his hold on enemy attention, hit-freeze, camera shake, the last-defender slow motion, the distinct hit sounds, and the settings to turn impact effects down.

## Rules

- Every rule lives in `src/core` as pure, tested logic: weak-point detection, quiver and recovery, perfect-draw and perfect-dodge windows, stagger, attack turns, morale, and Bram's targeting. All numbers go in the tuning file and appear in the tuning panel.
- Showcase-mode contact sheets for every new animation: the three-hit combo, the knife throw, the sidestep, each new enemy's attacks, a guard break, an enemy breaking and fleeing.
- Update the bots. The skilled bot uses headshots, perfect dodges, and knives. Add a stealth bot that uses a whistling arrow to pull a guard away.
- Balance targets:
  - The skilled bot clears the Mill in 60 to 150 s with 30 to 70% HP left and arrows to spare.
  - A sword-only bot that never dodges loses at the Forge.
  - A bot that fires every arrow without aiming for weak points runs out before the Forge is cleared.
  - At least one place can be won by morale alone, with fewer than half its defenders beaten.

## Done when

- All three steps are merged and deployed, the contact sheets are in the PRs, and the balance tests pass.
- Then continue to task 005.
