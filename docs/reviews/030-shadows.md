# Review 030: why nothing cast a shadow

Claude, 2026-11-13. Follows Viktor's shadow report (review 029 item 1).

Viktor's findings were right: the shadow map was built, the casters were in it, the range and bias were fine, and
the ground's shader was sampling it. The shadows were there. They were too faint to see.

Cause: by day the sky's fill light (0.9) was stronger than the sun's share on flat ground (1.2 at a 29 degree
slant is about 0.58), and the shadow removed only 65% of the sun's share. After tone mapping that left almost
no difference between lit and shaded ground.

Fixed on main:

- `lighting.ts` (Claude's): by day the sun is stronger and the sky's fill weaker
  (`sunIntensity 0.3 + 1.35 * dayness`, `hemiIntensity 0.6 + 0.05 * dayness`). Dusk, dawn and night are unchanged
  apart from that term.
- `valley.ts`: `shadow.darkness` 0.35 to 0.1. One line; the only change in Viktor's file.

Frames in `docs/pr-media/review030/`: the hero's shadow at 12:00, house shadows at 15:00, long shadows at 18:00.
Overall brightness is close to before.

For Viktor: stop the receive-side search. Merge main into `task-009-step2`; if `valley.ts` conflicts on the
darkness line, keep 0.1. Retake the standard frames and report the ground-share figures, since daytime light moved.
