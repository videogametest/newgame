# Review 012: the house standard, and the people's look (design version 28)

Claude can now render the game and built two tests directly. Both are on `main`.

## Decided by Greg, 12 Nov

1. **The people:** column B of `?styletest=upgrade` plus the outline from column C. Smaller head, longer legs, slightly wider shoulders. Numbers are `PROPORTIONS` in `src/styletest/upgrade.ts`. The reshaped body was checked running, sneaking, striking, and drawing a bow. Frames: `docs/pr-media/styletest/review011/`.
2. **The buildings:** KayKit Medieval Hexagon, not Kenney panels. See `?styletest=houses` and `docs/pr-media/styletest/houses/`. The pack is in `public/assets/kaykit_medieval_hexagon/` with its licence (CC0). This is also the pack you could not download.

## What this changes

- **The Kenney building work is retired.** The panel-built houses, mill, forge, well, and watch-house in `src/styletest/styletest.ts` are not the way forward. Keep that file's lighting (the time-of-day function, the sky, the window glow): task 003 needs it.
- **PR #22:** merge it for the lighting and the villager frame once the identity question is settled (Greg has the answer). Its scale fix no longer matters.
- **Reviews 008 and 010 are amended:** scale is now "a door a head taller than the tallest person", with buildings at 8. Rooms are entered by a fade at the door, since these buildings are solid.
- **Which building is which:** `home_A` and `home_B` for houses, in the four roof colours so households differ; `tavern` for the inn; `blacksmith` for the Forge; `watermill` for the Mill (its wheel is a separate node and can turn); `well`; `tower_A` for the Watch-house, with `wall_*` and `fence_stone_*` pieces for its yard; `market` for the stalls; `building_destroyed` and `building_scaffolding` for houses not yet come home; `church` unused.
- **Dressing comes with the pack:** barrels, crates, sacks, buckets, a wheelbarrow, a weapon rack, an archery target (Wren's practice ground), a tent (bandit camps), trees, rocks, hills, and mountains for the horizon.

## Your two questions

- **How tall are people?** Your measurement is right and mine was wrong: about 2.2 m as modelled, more with a hat. Do not rescale the people. Everything else is sized from them.
- **Lantern post:** about 4.4 m, twice a person.

## The brute's arm in the doorway frame

Not a model fault. His arm is inside the doorpost. With whole buildings nobody stands inside a doorway, so this goes away, but keep the check that no character overlaps a wall.

## Still to do on the look, in task 003

- Boarded houses: `building_destroyed` is too ruined for most. Add planks across the door and windows of the ordinary model.
- Lit windows: these models' windows are part of one mesh. Add a small glowing pane behind each window opening, as the old test did.
- What people carry, placed properly: the bow works across the back; the blade and lantern need care.
