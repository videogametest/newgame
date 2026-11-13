# Review 031: task 009 step 2c (PR #69)

Claude, 2026-11-13.

## Accepted

- Controls scroll hint.
- Quality profiles as proposed: low 1024 shadow / 220 m (212 draw calls), medium 2048 / 340 m (246),
  high 2048 / 420 m (272). Medium is the default.
- The brightness slider and its effect on the picture.

## The dark figure: now built (Claude)

There was none; Viktor was right. A scarecrow now stands in Hesper's yard (`SCARECROW` in `src/village/plan.ts`,
built in `src/village/build.ts`): dark, a little taller than a man, in view from `hesper_door`. It is also the
scarecrow of the first evening (task 010 step 4). Frame: `docs/pr-media/review031/hesper_door-00.png`.

## To fix in the brightness prompt (Viktor)

1. The words. Use `docs/writing/interface.md` exactly: heading "Brightness"; under the picture "Move the slider
   until you can only just see the figure in the yard."; button "That's right." The current text ("the dark side
   of the valley is readable", "Set") is not from the writing.
2. The picture. While the prompt is open, show the `hesper_door` view at 00:00 with the clock frozen and the hero
   hidden, whatever the game's time is. Restore the time, the hero and the camera when it closes. Same from
   Display, "Set brightness again".
3. The card must not cover the figure or Hesper's window. Put the card along the bottom of the screen.
4. Frames at brightness 0.5, 1 and 1.5 with the figure in view. Pass mark: at 1 the figure can only just be
   seen; at 0.5 it cannot; at 1.5 it is plain.
5. The status line that says "see the PR": replace it with the real entry in the same PR.

Then step 2d.
