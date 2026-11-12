# 007: The company (milestone 7)

Status: open

## Goal

Turn the squad from Bram alone into a roster of six people worth collecting, as described in `GAME_DESIGN.md` section 6, Companions. Scoped in section 8, milestone 7.

## Build in four steps

Open a PR, merge, and deploy after each step, and log each in `docs/status.md`.

1. **The roster.** The six companions as data: where each comes from, the household or event that makes them available, their signature trait, their three perks, and their gear slots. Choosing which three travel, at Hesper's or a campfire, with a company screen. Companions who are not travelling are visible in Wick, living their day. The fallback for Tobin if he was killed.
2. **What each does.** Each signature trait working in a fight and tested: Tamsin shooting marked targets, Tobin revealing patrol routes and shaking his former comrades' morale, Oona raising fallen companions and improving food without ever attacking, Garrick staggering heavy enemies, and Bracken growling at nearby enemies, leading toward secrets, and being unharmable. The pairs that act together.
3. **Bond and campfires.** Three stages of bond per companion, growing by travelling, fighting, and campfires. Each companion's wish, mentioned in passing and never listed, and what fulfils it. Campfire scenes as specified in section 10, with lines for each companion alone and for each pair.

4. **Household stories and loose threads** (section 9; `docs/writing/stories.md`). The rules are already built and tested in `src/core/stories/stories.ts` (Claude's; do not edit). This step wires them in: save the `Stories` state, call `advance` with each happening and every morning, play the lines it returns, apply `effects` in the systems that own each thing, and ask `threadForRest` when the hero rests in Wick. For reference, the stories are: each step's condition, what the hero does or shows to move it, the decision and both outcomes, and the shorter form when the person was killed. The four story keepsakes are already in `src/core/items/data.ts`. The tally's kinder prices use `Market.goodwill`. Loose threads: one line from Hesper per rest in Wick, chosen from what is open, never the same twice running. Tests: each story can be finished both ways and in its shorter form; no decision changes which perks, companions, or households can be had; a thread is never offered for something already closed.

## Rules

- Roster, traits, bond, and wishes live in `src/core` as pure, tested logic, and in saves.
- Use `docs/writing/bram.md` and `docs/writing/companions.md` exactly as written: each companion's three perks, wish, lines, and the pairs, including the pairs that act together in a fight. Draft only Ketch's lines, if he stands in for Tobin.
- A wish must never appear in the Notes tab or anywhere else as a task. The player learns it only by listening.
- Add a test for each trait, one that the squad never exceeds three, and one that Bracken cannot be damaged.
- The pacing test from task 006 must still pass with a full company.

## Done when

- All three steps are merged and deployed and the tests pass.
- Then continue to task 008.

## From design version 30

- **Lines never repeat:** every line above a head goes through `nextLine` in `src/core/speech/said.ts`, with the log in `GameState.speech`. Shouts in a fight pass `urgent`.
- **What they notice, and the road:** new groups in `docs/writing/companions.md` (`*.sees.*`, `*.at.*`, `road.*`). These come before a plain field line.
- **Notes:** `src/core/notes/notes.ts`, `GameState.notes`. Use `isKept` to decide; show who, where, and the day; sort by person or by place.
- **Traces:** `traces()` in `src/core/stories/stories.ts` gives the line and who says it while someone is away.
