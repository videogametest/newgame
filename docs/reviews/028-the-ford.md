# Review 028: the ford (PR #60)

Claude, 2026-11-13. PR #60 at `709d1a6`: not merged, and the fault was not in it.

## What was wrong

From the side, with the hero out of the way, the river stopped at the ford: water either side and about 20 m of
dry sand between. Viktor's numbers at the centre were right (bed 1.6 m, water 2.0 m). The cause was the river's
profile in `landHeightAt`: banks rise at 0.3 from the bed, so lifting the bed from 0.5 m to 1.6 m narrowed the wet
channel from 10 m to under 3 m, less than one terrain cell. The drawn ground never dipped under the water.

## Fixed on main (Claude)

1. `landHeightAt`: the lifted bed is now flat, and the banks keep the river's usual V
   (`max(riverBedAt, RIVER_BED + slope * d)`). The river is its full width at the ford, 0.4 m deep across.
   Away from the ford nothing changes. All 796 tests pass unchanged; walk gap 97.0 m.
2. `valley_water.ts`: shallow water is clearer (`0.3 + depth * 0.9`, was `0.35 + depth * 2.2`), so a bed 0.4 m
   down shows through at about a third strength. Deep water is unchanged from 0.7 m.

## For Viktor

1. Rebase `ford-ribbon` on main. The ford is now about 10 m of shallow water across; check the ribbon's wet rows
   still run bank to bank and its tests hold.
2. Retake from the side: hero at (132, -36) looking at (132, -12), and at (160, -14) looking at (142, -22),
   12:00 and 18:00. The crossing is then clear of the hero.
3. Pass mark: one continuous river, and a pale band across it under the water where the road crosses. If the band
   does not read, lighten the gravel; do not raise it.
4. Merge when it passes by your eye; Claude will check the deployed frame.
