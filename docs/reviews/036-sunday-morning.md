# Review 036: Sunday morning

Claude, 2026-11-15, 11:00 ET. Covers PRs #78 to #90 and the blocked branch `task-004-item8-valley-fight`.

## Accepted

- Item 7 (Bram), item 3b (settings card: seen by eye, it looks finished; 760 px is fine, the foot line is fine),
  items 10, 11, 12, and 14's rules.
- Placeholders in items 10 and 11 (guard changes at 18:00 and 00:00, the 8 s gap, the habit and patrol times):
  accepted until the writing says otherwise.
- 6 m placeholder wall height; path grid built per region.

## Rulings on the open questions

- **Knives:** yes. A thrown knife that hits an unaware enemy gets the first-strike multiplier, the same single
  number. The design says so in terms.
- **Flocks:** sprint only. Walking past does not startle them. The code is right.

## Item 8, the fight at the patrol hut: why no bandit was in any frame

Claude ran the branch. The bandits were there, and under the ground.

1. **Cause.** A fighter's height was set only inside a battle step. The capture holds the fight before any step
   runs (and the fight does not step while the "Click to take control" card is up), so all three bandits sat at
   height 0, about 9 m below the hut. Their health bars showed; their bodies did not. Fixed on the branch by
   Claude (`db4510c`): `createBattle` now puts every fighter on the ground at creation. Core tests pass (702).
2. **The arena's card is in the valley.** On this branch the valley opens with the arena's "Click to take control.
   Hold the line. Defeat every enemy to win." card, and has the arena's win and lose cards. None of that belongs
   in the valley. The valley keeps its own start. There is no winning: when the three are down they stay down and
   the valley carries on. If the hero falls, for now he stands up where he fell with full health and a status
   line; the real rule comes with task 006.
3. **The hero faces the camera** in every frame Claude took by `placeAt` and `lookAt`. Check whether this is the
   capture or the game, and fix whichever it is: the hero is seen from behind.
4. **`state()` must list the fighters:** kind, team, x, z, height, alive, awareness. A capture that cannot say
   where the enemies are cannot be debugged.
5. **The capture must start the fight properly:** take control, let ten steps run, then hold.

For Viktor: merge main into `task-004-item8-valley-fight` (it already has `db4510c`), fix 2 to 5, retake the
frames with the three bandits and Bram in view and the hero not covering them, and merge on your own eye check.
The "more than 30 minutes stuck" rule worked as intended; pushing the branch is what let this be found.

## The noon shadow, a fifth time

See the new "Sunday: read this first" section at the top of the queue file.
