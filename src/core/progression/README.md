# Progression

Claude's stream (see `docs/PARALLEL.md`). Pure logic for `GAME_DESIGN.md` section 6: skills, perks, and pacing. Nothing here imports the engine, and nothing here is wired into the game yet. Wiring is task 006.

## What is here

| File | What it does |
| --- | --- |
| `types.ts` | The progression state (part of the save), experience events, and perk definitions |
| `tuning.ts` | Every number: the level curve, the region cap, repeat falloff, catch-up, slots, mastery. Provisional until the pacing test runs against a real playthrough |
| `actions.ts` | The only things that earn experience. There is no action for time passing or harm taken, by design |
| `skills.ts` | Levels, awarding experience, the region cap, catch-up, overflow |
| `perks.ts` | Earning perks, fallbacks, slots, saved sets, mastery, the ledger, and validation |
| `pacing.ts` | The pacing bands per story beat and a check against them |
| `../../data/perks/tallowmere.ts` | The 24 perks of Tallowmere |

## How to use it when wiring

```ts
const defs = TALLOWMERE_PERKS;
const index = indexPerks(defs);
const state = createProgression();          // goes in the game state and the save

// When the hero accomplishes something:
const gains = awardExperience(state, { action: 'weak_point_hit', difficulty: rangeFactor });
const newPerks = settleGains(state, defs, index, gains);   // applies overflow, grants level perks

// When a trial is passed, a person teaches, a story moment happens, or a note is found:
earnPerk(state, index['dusk_cloak']);

// When a teacher is dead or gone, ask where the perk can be earned now:
availableSource(index['arc_reader'], lostPeople);          // returns Hesper's fallback

// At a campfire, at Hesper's, or at home:
equipPerks(state, ids, true);

// Whenever an equipped perk does something that mattered:
recordPerkUse(state, 'pinning_shot');
```

## What the other streams owe this one

- **Call `awardExperience` only for things that happened**, using the ids in `actions.ts`. Pass `difficulty` above 1 for harder feats (range, a tougher target) and below 1 for trivial ones. Pass `repeatKey` only for targets that can be farmed for free: a practice target, a single gathering spot, a crafting recipe repeated in one sitting.
- **Implement each perk's effect** in the system named in its `effect`, reading the perk's current rank from `state.perks[id].rank`, and only when `isEquipped(state, id)`.
- **Call `recordPerkUse`** when an equipped perk changes an outcome, not every frame it is active.
- **Tell this stream what is missing.** If an action is needed that is not in `actions.ts`, or a perk cannot be built as declared, write it in `docs/status.md`. Do not edit these files.

## What is not done yet

- The bot-driven pacing test. It needs the wired game, and is specified in task 006. The curve has only a rough calibration (`skills.test.ts`, "the curve, provisionally").
- Companion levelling and companion perks, which belong to task 007.
- The purse bands for crowns, which belong to the money logic in stream F2.
