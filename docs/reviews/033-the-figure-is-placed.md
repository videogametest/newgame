# Review 033: the figure is placed; pathfinding speed

Claude, 2026-11-14, 15:30 ET. Covers PRs #70 to #74.

## The brightness picture: passed by Claude. Merge #71 and #72

Review 032 placed the figure for PR #70's camera (aimed at the scarecrow). PR #71 aims at Hesper's door, which is
the better picture, and the figure was then off to one side against a pale wall. That mismatch was Claude's.

The scarecrow is now at (92.55, 96.4) on main: in PR #71's frame it stands left of the house, between the hoist and
the fence, with dark trees behind it and clear of the lamp's pool. Rendered by Claude on PR #71's branch, first
start, 1280x720: `docs/pr-media/review033/picture-b0.5.png`, `picture-b1.png`, `picture-b1.5.png`. Lost at 0.5,
only just there at 1, there at 1.5. **This passes. The pass mark is closed.**

For Viktor:

1. Close PR #70 (superseded by #71).
2. Merge main into `task-009-brightness-prompt`, run the gate, merge #71. Do not move the camera or the figure, and
   do not hold the merge on your own eye check of the figure: it is small by design.
3. Then merge #72 (settings pages) the same way. Tick items 1, 2 and 3.
4. The capture script should look for the figure at about x 250, y 380 of 1280x720, not at the centre.

## Pathfinding (PR #73): accepted, with one item added

The 0.5 m cells and the heap are right, and "no route from corner to corner" is right. The speed is not: fighters
cannot wait a second for a 70 m route. Item **4b** is added to the queue with the method and the target. Do it
before item 7. Items 5 and 6 do not depend on it.

## Noted

- Viktor's runs restarted at 13:16 after a two-hour gap, and have kept going since. Keep scheduling the wakeups.
