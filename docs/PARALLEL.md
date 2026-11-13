# Working in parallel

How to use sub-agents to build several things at once without breaking the order the tasks depend on. Viktor is the coordinator. This file adds to `docs/WORKFLOW.md`; it does not replace the task briefs.

## What may run in parallel, and what may not

**The gates stay.** Nothing here overrides them.

- Task 003 (the world) does not start until the asset survey has been reviewed.
- Task 004 does not start until task 003 has passed the first-look review.
- Anything Greg will look at goes through Claude's review first.

**Rendering and integration stay in order.** Scenes, cameras, the world, screens, and anything that wires systems together are built one task at a time, in the numbered order, by the coordinator or one sub-agent at a time.

**Pure logic may be built ahead.** `GAME_DESIGN.md` section 7 requires every rule to live in `src/core` as pure, tested code with no engine imports. Those modules do not depend on the world existing, so they can be written and tested now, in parallel, and wired in when their task comes up.

## Streams

Run at most four streams at once. Each stream is one sub-agent, one branch, and one PR at a time.

| Stream | What it builds | Belongs to task | Owns these paths |
| --- | --- | --- | --- |
| A | Task 002 in the order written, except the asset survey | 002 | Everything not owned by another stream |
| B | The asset survey, `docs/assets.md` | 002 | `docs/assets.md`, `docs/pr-media/assets/` |
| C | World logic: `heightAt` and the terrain shape, chunk bookkeeping, scatter rules, time of day, grid A* pathfinding | 003, 004 | `src/core/world/` |
| D | Stealth and place logic: awareness states, the noticing rules, marking, the alarm bell, schedules and habits, reactions, the tax cart's route | 004 | `src/core/stealth/`, `src/core/places/` |
| E | Combat logic: weak points, the quiver and recovery, arrow types, perfect draw and dodge windows, stagger, attack turns, morale, kill or knock out, winning bandits back, difficulty multipliers | 005 | `src/core/combat/` |
| F | **Claude's stream. Viktor and his sub-agents do not edit these paths.** Progression logic: skills, experience rules, region caps, catch-up, overflow, perks with slots, saved sets, mastery, and the ledger, the 24 perks of Tallowmere as data, and the pacing bands | 006 | `src/core/progression/`, `src/data/perks/` |
| F2 | **Claude's stream since 12 Nov. Viktor does not edit these paths.** Items and money logic: items, quality, the carry limit, loot rules, stolen goods, recipes, crowns, prices, projects | 006 | `src/core/items/`, `src/core/economy/` |
| G | People logic: households and their triggers, the derived recovery level, the window count, companions, traits, bond, wishes, the dialogue and Show data model | 004, 007 | `src/core/people/` |
| H | **Claude's stream since 12 Nov, built. Viktor does not edit these paths; task 003 wires it in.** The music engine: a sequencer that plays note data through samples, layers, synchronised stems, and the score from `docs/writing/melody.md` | 003 | `src/audio/music/` |
| V | **Claude's stream, built.** The valley learns (section 5): the hero's habits and the answers held places make | 005 | `src/core/valley/` |
| S | **Claude's stream, built.** The five household stories and Hesper's loose threads (section 9): which line is said when, what each decision changes | 007 | `src/core/stories/` |
| R | **Claude's stream, built (12 Nov, from the second research pass).** Companions' conduct, lines that never repeat, Notes, and teachers | 004, 006, 007 | `src/core/company/`, `src/core/speech/`, `src/core/notes/`, `src/core/progression/lessons.ts` |
| W | **Claude's stream, built (12 Nov).** Wick: the village plan, the shelf it stands on, and the builder that draws it. Task 003 step 2 wires it in | 003 | `src/village/`, `src/styletest/wick.ts` |

Start with A and B together. Add C, D, E, F2, G, and H as capacity allows, logic streams only, never more than four streams in total.

## Claude's stream

Claude builds stream F directly and pushes to `main` when its tests pass. It does not count toward the four-stream limit.

- Claude builds against the shared types in `src/core/types/`. Viktor should write and merge those early, and include what progression needs: the skill names from `GAME_DESIGN.md` section 6, an experience event (what happened, to what target, how hard it was), the hero's rank, and the region.
- Claude designs the 24 perks and writes them as data. Each perk names its skill, its primary source, its fallback source, and what its three mastery ranks do. Perks whose effect touches combat, stealth, items, or companions declare that effect as data; the stream that owns that system implements the effect when its task comes up.
- If Viktor needs something changed in Claude's paths, he says so in `docs/status.md` and does not edit them.
- Claude also builds stream F2 and reviews every merged logic stream. Claude reviews when Greg asks; there is no hourly check since 12 November.

**12 Nov:** Claude reworked parts of streams D, E, and G to settle the questions they raised (`docs/reviews/014-core-fixes-merged.md`). Those paths are Viktor's again from that commit on.

## Rules

1. **Agree the shared types first.** Before any logic stream starts, the coordinator writes the shared types and interfaces that streams will exchange (fighter, place, item, household, game state, tuning) in `src/core/types/`, merges them, and tells every sub-agent to build against them. A stream that needs a shared type changed asks the coordinator; it does not change it alone.
2. **One owner per path.** A sub-agent edits only the paths its stream owns, plus its own tests. If two streams need the same file, the coordinator makes the change.
3. **Every PR stands alone.** Tests, typecheck, and build pass on the branch. Each PR says which design sections it implements and which rules it leaves for later.
4. **Logic ships dark.** A logic module merged ahead of its task is not wired into the running game and changes nothing the player can see. Wiring happens in that module's own task.
5. **Data, not constants.** Numbers go in the tuning file or in data files, with placeholder values clearly marked as untuned.
6. **Sub-agents do not edit** `GAME_DESIGN.md`, the task briefs, `docs/WORKFLOW.md`, this file, or `docs/writing/`. They read them in full before starting.
7. **The coordinator merges**, one PR at a time, rebasing the others, and keeps `main` deployable. The smoke test must pass after every merge.
8. **Status.** One entry in `docs/status.md` per merged PR, naming the stream. At the top of the file keep a short table of the streams: what each is doing, its open PR, and whether it is blocked.
9. **When a stream finds a gap or a contradiction in the design,** it stops that piece, logs the question in `docs/status.md`, and continues with something else it owns. It does not invent an answer.
10. **Balance and pacing targets are not met by logic alone.** Do not tune against them until the systems are wired in their own tasks. Unit tests for rules are required now; the bot, balance, and pacing tests come with integration.

## When a task's turn comes

The coordinator wires in the logic already merged for it, builds the rendering and screens the task needs, runs the task's bot and balance tests, and only then marks the task done.
