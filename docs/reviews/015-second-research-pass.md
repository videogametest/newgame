# Review 015: what the second research pass changed

12 November. For Viktor. Nothing here changes task 003 step 1. One measured check is added to the first-look bar; the rest lands in tasks 004 to 008 and is already built in core.

The research looked at how players took to companions, levelling by use, games with no quest log, mercy, and small worlds in about twenty games. The report is not in the repo. The design is now version 30; `docs/DECISIONS.md` has a row for each change with the reason.

## What changed in the design

| Area | Before | Now |
| --- | --- | --- |
| Companions and stealth | "Stay back and out of sight" | No enemy senses a companion until one is alert to the hero. They keep close while the hero is crouched |
| Companions in the way | Not stated | Never in a doorway, gate, narrow path, or line of fire. The hero walks through them. No rescuing |
| Companions winning fights | Full strength | Never start a fight. Half damage on anyone the hero has not marked or struck |
| Knocking out | "The harder path" | Its own tools: blunt arrows knock down, the pommel after a perfect dodge, calling on a lone enemy to yield, binding |
| Who stays in Wick | Share of the garrison spared | Whether that bandit's own friends were spared. Friends are who they are overheard talking with |
| Remarks on killing | Hesper and Bram each had one | None. Hesper names the friend when someone will not stay |
| A bandit who yields | Nothing | Tells one useful thing about the place |
| Notes tab | "Important things people have said" | Everything said to the hero, overheard, or told, with who, where, and the day |
| Stories | Rules only | A test plays 400 shuffled orders; every story can always be finished. Anyone who moves leaves a trace |
| Garrick's wish | The hero crafts a masterwork (Smithing 16) | Garrick makes the piece from what the hero brings |
| Catching up | Catch-up multiplier | Also one free lesson from each tradesperson who comes home |
| Companion lines | Three field lines each, "never twice running" | Tracked and saved; no repeats until a group is used up; lines for what they notice; ten exchanges on the road |
| The valley | Density judged by eye | Something to stop for within 100 m everywhere, measured |

## What is in core now (all tested, shipped dark)

- `src/core/company/conduct.ts`
- `src/core/combat/enemies.ts`: `bluntKnockdownSeconds`, `pommelStrike`, `yieldsAtArrowPoint`, `companionDamageMultiplier`, `wake(..., bound)`; `pommel` is a hit tool
- `src/core/combat/bandits.ts`: `decideWinBack` takes `banditStates`; `friendsSpared` replaces `mercyShare`
- `src/data/overheard.ts`: `closeTo`, `YIELDS`, `yieldTells`
- `src/core/speech/said.ts`, `src/core/notes/notes.ts`, `src/core/progression/lessons.ts`
- `src/core/stories/stories.ts`: `traces`
- `src/core/items/recipes.ts`: `garrickMakes`; `src/core/people/companions.ts`: the `forge_craft` wish event is now `madeBy`
- Save version 3: `notes`, `speech`, `boundBandits`, `lessonsTaken`. Older saves gain them empty.

## Writing added or changed

- `bandits.md`: "When they yield"; who is close to whom
- `companions.md`: "What they notice", "On the road", the rule on repeats, Garrick's wish
- `hesper.md`: `hesper.mercy.none` removed, `hesper.bandit.friend` added
- `bram.md`: `bram.fight.won.killing` removed, `bram.fight.yield` and `bram.fight.pommel` added
- `stories.md`: "Where they went"
- `households.md`: "Lessons"
- `interface.md`: five first-time prompts, Notes headings, "Where you left off", the title's small line

## For task 003, now

One addition to the first-look bar: the capture script measures the longest distance from any walkable point to something worth stopping for, and fails over 100 m. Signposts at road junctions. If the 60 fps target and a visual feature conflict, the feature loses, and the report says which.

## Not settled

- The title line says "about twelve hours". Twelve is a guess. It stays out of the build until a playthrough is timed in task 008.
- Whether a mentor's reminder (Hesper's loose threads) and hidden wishes work for players: the research found no game that tried either. Watch for it in the first playtest.
- Reddit could not be reached in either research pass, so how many players hold each view is less certain than what the views are.
