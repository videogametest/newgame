# Review 019: the moon at midnight, and no more hourly review

12 November. `main` at `4897ebc`. No new work by Viktor since review 018, which stands in full. This answers the one question 018 left, and records a change to how reviews happen.

## Your question: why is there no moon at 00:00?

There is one. It is the capture, not the sky.

I built `main` and called `setTod` then `aimAt('moon')` at 0:00, 0:30, 1:00, 2:00, 21:00, and 23:00. The moon is at the centre of the frame every time.

`night-0` in `scripts/valley_capture.mjs` has no `aim`, so the camera is still where the frame before it left it: pointing at the noon sun, high in the east. At midnight the moon is high in the west. So that frame shows stars and no moon. This is the same fault as review 018 item 7 ("`aimAt` leaves the camera pointing up"). Reset the aim after each aimed shot and the question closes. Remove it from `docs/status.md` then.

## One thing this showed

At midnight the moon stands 63 degrees up. The player's camera cannot look higher than 26 degrees (`pitchMax` 0.45), so in play the moon can only be seen for a short while after it rises and before it sets. A moon nobody can look at is not in the game.

1. Keep the moon's path low: no higher than about 35 degrees at midnight, so it is in an ordinary upward glance for most of the night. Do the same check for the sun, which stands 63 degrees up at noon; the sun matters less, since its light and shadows show where it is. Do this with review 018 item 1, when the sun's bearings are corrected.

## Reviews from now on

The hourly review is switched off. Greg asks for a review when he wants one. `docs/WORKFLOW.md` and `docs/PARALLEL.md` say so now. Nothing else changes: write what you need in `docs/status.md`, carry on with the next item, and do not wait.

## Needs Greg

Nothing.
