# Review 008: buildings are too small for the people

Greg caught this from the frames, and review 007 missed it. Review 007's pass is withdrawn on this one point. Everything else in it stands.

## What is wrong

`src/styletest/styletest.ts` builds from 1 m kit modules with floors 1 m tall. The people are about 1.8 m tall. So a storey is barely half a person, a two-storey house has its eaves at head height, and nobody could walk through a door. The item frames hide it because the hero stands in the foreground.

## The rule (now in `GAME_DESIGN.md` section 7 and task 003)

Buildings are scaled to the people, never the other way round.

- A storey is 2.6 to 2.8 m. Scale the Fantasy Town kit by about 2.7.
- A door opening is at least 2.1 m high and 1.2 m wide: taller than any character including hats and helmets, and wide enough for the widest (the brute).
- Window sills sit at about a person's chest.
- The well's ring comes to the hip. The anvil's top comes to the hip. Fence rails come to the chest. The lantern post is twice a person's height.
- The mill wheel is taller than a person and shorter than the mill's wall.

## What to do

1. One more commit on PR #22: apply the scale, re-space the row, and re-capture.
2. Add one new frame, `scale-doorway-12.png`: the hero and the brute standing in the open doorway of house A, front on, at noon. This frame is the test.
3. Add a check to the capture script that fails if any door opening is lower than the tallest character.
4. Then merge.

Signs, lighting, and everything else stay as review 007 left them.
