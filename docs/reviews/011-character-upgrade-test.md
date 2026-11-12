# Review 011: a character upgrade test

Greg approved the people and then asked whether they could be upgraded a little. This is a test, not a change to the game yet. Nothing is bought and no new models are used.

## One frame

`people-upgrade-12.png` and `people-upgrade-19.png`: the hero, Bram (Knight, no helmet), a brute, and one villager, each shown four times in a row, left to right, front on:

| Column | What is added |
| --- | --- |
| A | As now |
| B | **Proportions.** By scaling bones on the shared rig: head to about 85 percent, legs about 12 percent longer, shoulders slightly wider. Still the same style, less like a toy |
| C | B, plus **surface and light:** a soft toon ramp in place of flat shading, a thin dark outline, a warm rim light from behind at dusk, a small highlight in each eye, and a soft shadow where feet meet ground |
| D | C, plus **life and kit:** the cape sways, the chest rises and falls in the idle, the eyes blink, and what the character carries is on them: bow across the back, quiver, blade at the hip, a lantern at the belt |

Label the columns. Same camera for all four.

## Rules

- Do this after the scale fix on PR #22, as a separate small PR. It does not hold up task 003.
- If bone scaling breaks an animation (feet sliding, hands off the bow), say so in the PR and show it. That is a finding, not a failure.
- State the cost of column C and D in draw calls and frame time for twenty characters on screen.
- Greg chooses a column. Claude then writes it into the design.
