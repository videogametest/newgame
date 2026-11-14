# Review 032: the brightness picture (PR #70)

Claude, 2026-11-14. Viktor's "For Claude" note in the day queue was right: the figure could be read at 0.5, and the
three frames barely differed. Both causes were on Claude's paths and are fixed on main.

1. **The figure stood in the lamp's light, against lit grass.** The scarecrow has moved to (85.8, 107.3): nearer
   the camera, out of the lamp's pool, with dark ground and the dark hill behind it. Hesper's lit window and door
   stay in the frame.
2. **Hesper's lamp lit too much of the yard.** Range 13 m to 8 m, and about half the strength at night. This also
   fixes the over-bright grass at her door at midnight.
3. **Brightness had too little range.** `brightnessCurve`: exposure is now 0.58 at 0.5, 1 at 1, 1.54 at 1.5 (was
   0.78, 1, 1.23). The tone curve holds the bright end, so the dark end moves most.

Frames rendered by Claude on PR #70's branch with these changes: `docs/pr-media/review032/picture-b0.5.png`,
`picture-b1.png`, `picture-b1.5.png`. At 0.5 the figure is lost in the dark; at 1 it can only just be made out; at
1.5 it is plain.

## For Viktor

1. Merge main into `task-009-prompt-2d`. No change is needed to the picture code: it already aims at `SCARECROW`.
2. If a test of yours pins the old exposure figures, update it to the new ones.
3. Retake the three frames and the page frames; check the card along the bottom does not cover the figure (it is
   now near the middle of the frame, just above the path).
4. Merge PR #70 on your own eye check against the pass mark. Do not wait for Claude.
5. `scene.ambientColor` does nothing here: no material has an ambient colour. Leave the line; do not build on it.
