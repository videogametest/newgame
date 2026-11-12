# Review 006: design version 24 (12 Nov)

Not a review of merged work. A notice of design changes, made after research into the five games closest to this one. Read `GAME_DESIGN.md` version 24 and the new rows in `docs/DECISIONS.md`. Nothing here changes the order of work: style test rework first, then review 004 fixes.

| Change | Where | Who it touches |
| --- | --- | --- |
| **Winning back is decided, not rolled.** An overheard tell plus mercy guarantees a stay. The rest is fixed bars. No seed, no random input | Section 5, "Winning them back" | Stream E: replace the seeded win-back curve. It now needs to know which tells the hero overheard, so overheard lines heard must be saved state |
| **The valley learns.** Held places answer the hero's own habits | Section 5, new bullet. Task 005, new step 4. Lines in `docs/writing/bandits.md` | Streams D and E, at task 005. Count habits per place taken, as saved state |
| **The turn happens once, is seen coming, and costs only the place** | Section 9, "The turn". New lines `hesper.turn.warning` and `overheard.forge.6` | Stream G: households stay home, as you already built. No other place can ever be retaken, so remove any general retake path |
| **Land that hides things** | Section 4. Task 003, new requirement | Task 003 terrain |
| **Easy things stop teaching** (version 23) | Section 5, "Settled details" | Emitters of experience events: `difficulty` now also sets the level a feat can teach up to. Set it from the target's toughness, not at random |

Also since review 004: stream H (music) is built in `src/audio/music/` and is Claude's. Task 003 wires it in; see its README.
