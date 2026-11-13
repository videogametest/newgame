# Task 010: the first evening (the tutorial)

Design: `GAME_DESIGN.md` v37, section "The first evening: the tutorial". Greg asked for it on 2026-11-13.

**Not to be started yet.** It needs the bow, the seen/unseen meter, marking, the blade, dodge and lock on in the
valley (task 004), talk with Hesper (task 005), and the lantern (task 006). It is built last of those, as the thing
that ties them together. Step 1 (the road in: move, look, sprint prompts) needs only task 009 step 1 and can be
built any time after it.

## Steps (each is one PR)

1. Core, pure: `src/core/tutorial/lesson.ts`. The six steps as data, each with what completes it; `advance(state,
   event)`; skip; walking away and coming back; saved in the save file (`SAVE_VERSION` goes up). Tests for every step,
   for skip, and for leaving mid-lesson.
2. The yard: three straw targets, one far target, the scarecrow, the practice post, the gate lantern. Claude places
   these in `src/village/` (Claude's path); Viktor wires them to the lesson.
3. Hesper's lines for each step, each miss, and the skip: Claude writes them in `docs/writing/first-evening.md`.
4. Prompts: filled from the bindings (`fillPrompt`), shown per step, gone when the step is done.

## Done when

- A new game walks from the gate to the lit lantern without the player reading anything outside the game.
- Skipping in the first talk reaches the lantern in under a minute.
- A player who leaves after step 3 and returns the next night resumes at step 4.
- On a controller every prompt shows controller inputs.
