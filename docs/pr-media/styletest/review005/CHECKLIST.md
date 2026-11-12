# Review 005 checklist (style test rework, PR #21)

Frames are 1280×720 captures from `scripts/styletest_capture.mjs` on this branch. Each row names the frames that were opened and checked by eye.

| # | Review 005 item | Outcome | Frames checked |
| --- | --- | --- | --- |
| 1 | Light pools warm amber, under lit windows and doors | Done. Warm pools sit in front of lit doors and lower floors. Faint at dusk, clear at night. | `row-front-23`, `item-mill-23`, `item-watch-23`, `item-house-a-18.7` |
| 2 | Dusk is the warmest frame: low gold light, orange and rose sky, windows just lit | Done. Orange sky with a visible horizon at 18.7. | `row-front-18.7`, `item-house-a-18.7` |
| 3 | Closed mill, wheel on its side wall, no taller than that wall | Done. Closed block with the wheel on its east wall; the wheel sits within the wall's height. | `item-mill-23` |
| 4a | Forge: closed building, open lean-to, chimney, simple anvil | Done. | `item-forge-23` |
| 4b | Well: low stone ring with a small roof on two posts | Done. | `item-well-23` |
| 4c | Watch-house: tower on a walled yard | Done. Stone is approximated with kit panels. | `item-watch-23` |
| 5 | Signs about a third of the size, knee height; hero at frame edge, side on | Done for the hero. Every item frame (8 items × 18.7 and 23) shows the hero at a frame edge. The well hero was moved to z −4.4 so it sits outside the watch yard. Signs are at knee height and clear of windows. Sign text is small at 1280×720 from a distance (see open note). | all 16 item frames, checked as a montage; `item-well-23`, `item-well-18.7` after the fix |
| 6 | Four villagers beside the four adventurers they were made from, front on, noon | Done. Four villager pairs in one frame. | `villagers-front-12` |
| 7 | Horizon shown, plane edge not shown | Done for the frames listed. The row frames show the horizon, and no frame shows the plane edge. | `row-front-18.7`, `row-quarter-23`, `row-front-12` |

Open notes:
- Sign text is hard to read at distance on 1280×720. Not changed here; decide after Greg's look whether to enlarge the sign texture.
