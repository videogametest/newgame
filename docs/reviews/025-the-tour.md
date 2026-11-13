# Review 025: the tour (PR #49)

13 November. For Viktor. Tour mode is sound and is what every review from here will use. I looked at all twenty frames; `docs/pr-media/review025/tour-12-as-merged.png` is the noon set on one sheet. Not ready for Greg's first look. Two faults were mine and are fixed in this commit; the rest is a list, in order.

## Fixed by Claude in this commit

- **Wick's square and lanes were black** in the game (`wick_square-12`). The lane strips were lit from underneath. Fixed in `src/village/build.ts`; `square-12-fixed.png`.
- **The gate stood against a cliff.** The rim was opened only on the valley side of the gate line, so behind the gate the ground rose 8 m in one step and the planks were half buried in it. The pass now stays open for 60 m behind the gate (`GATE_PASS_BEYOND` in `valley.ts`): a notch in the rim with sky in it, `gate-12-pass-open.png`. The wall still closes it; all gate and rim tests pass unchanged.

Checked: typecheck, all tests, walk gap.

## What must change, in this order

1. **The gate is too small to read.** From 30 m it is a strip of fence at the bottom of the notch. Make it 4 m tall with posts of 5 m (the hero is 2.16 m, not 1.8), and level the pass's floor for the last 10 m before it so its foot is not hidden by the rise.
2. **Three crossings have nothing drawn.** The ford, the mill bridge, and the stepping stones are walkable and invisible: the tour shows bare water at all three. Draw them from the layout's data: a timber deck with rails for the bridge, flat stones for the stepping stones, a shallow gravel bed and worn banks for the ford. Boxes and flattened cylinders, merged, in the village's wood and stone colours.
3. **The tree on the road in.** It fills the middle of `road_in` and hides half of Wick. The keep-out from review 024 item 4.
4. **Capture without the interface.** The tour frames carry the debug lines and the tour label. The capture script should hide both; the frames are evidence of what a player sees.
5. **`high_lane` is the ridge path,** not Wick's high lane. Rename it `ridge_path` and add `high_lane` at (150, 86) looking at (100, 85), and `hesper_door` at (92, 108) looking at (86, 98).
6. **Views that look at the hero's face** (`signal_hill_top`, `ford`, `mill_bridge`, `high_lane`): the camera has come round in front. The tour should always sit behind the hero, looking where the view looks.
7. **The bushes on the signal hill** are flat bright green with no shading. They need the same lighting as the trees.
8. Then item 12, the standard frames, and item 10, the sky.

## Your notes

- The landing at (61, 63): accepted.
- No view for the forge bridge: right, it is not walkable until the Forge is freed. Add a view from the bank looking at it once item 2 draws it.
- Ground share 1.000 at the gate: correct as measured then; measure again now the pass is open.
