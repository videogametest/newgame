# Review 001: the shared types

Reviewed: `src/core/types/shared.ts` at `6892816`, against `GAME_DESIGN.md` version 21.
Reviewer: Claude. Status: **changes needed before the logic streams build on these.**

The file is honest about being provisional, and the basics are right: pure data, the ground plane as (x, z), the nine skills in the design's order, a versioned save. The problems below are places where the shapes still describe the older design. Every stream is about to copy them, so the first group should be fixed first.

## Fix before any logic stream depends on them

### 1. A household has one window, not a count of windows

`Household` has `windowCount` and `litWindows`. In the design (section 9, The households of Wick) there are sixteen households and each has exactly one window; the window count is the number of households that are home, out of sixteen, and the Fairlow window is the seventeenth. A household is home or it is not.

Wanted:

```ts
export interface Household {
  id: string;
  /** True once the thing that brings them home has happened. */
  home: boolean;
  /** The in-game day they came home, for lines and for the order windows lit in. */
  homeSince?: number;
}
```

Name, trade, house position, and the trigger are definitions in data, not saved state. Whether the window is lit right now is derived from `home` and the hour. Drop `placeId`: every household belongs to Wick or its outskirts.

### 2. A place is not simply captured or not

`Place.captured` cannot express the design. A place is held, then its defenders are cleared, then it is freed only when the hero lights its lantern (section 9, The lantern ritual). A freed place can be retaken and its lantern goes dark (section 9, The turn).

Wanted:

```ts
export type PlaceStatus = 'held' | 'cleared' | 'freed';

export interface PlaceState {
  id: string;
  status: PlaceStatus;
  /** How many times the hero has lit its lantern. More than one means it was retaken. */
  timesFreed: number;
  /** The alarm bell has no clapper (the Light Fingers perk). */
  bellSilenced: boolean;
  /** Morale of the defenders, 0 to 1. */
  morale: number;
}
```

`kind`, `name`, `position`, and `regionId` are definitions in data. `PlaceKind` should be `'village' | 'camp' | 'outpost'`: there is one village, Wick, and no towns in Tallowmere.

### 3. Progression state is more than skill levels

`GameState.skills` holds only levels. Progression also needs perks earned and their mastery, the equipped perks, saved sets, repeat counters, the overflow bank, and the region cap. That shape exists as `ProgressionState` in `src/core/progression/types.ts`.

Wanted: replace `GameState.skills` with `progression: ProgressionState`, and remove `HeroState.rank`, which would otherwise be a second copy of `progression.rank`. To avoid a circular import, move `ProgressionState` and the types it uses into `src/core/types/` if you prefer; Claude will follow whichever home you choose. Say which in `docs/status.md`.

### 4. `ExperienceEvent` needs one more field

Add `repeatable?: boolean`, true for a target that can be farmed for free (a practice target, one gathering spot). `awardSharedEvent` in the progression module takes it as an argument today and will read it from the event once it exists. The `skill` field is redundant, since the action decides the skill, but it is harmless and is checked.

## Fix when the owning stream starts

### 5. Money is crowns, not gold

`HeroState.gold` and "value in gold" on `ItemDef` should be `crowns` (section 6, Money and trade). Crowns left in storage are separate from crowns carried, because death costs a share of what is carried.

### 6. Items need a kind, a quality, and sometimes an owner

`ItemDef` has only weight and value. Section 6 (Loot) and section 10 (Inventory) need at least: a kind (weapon, arrow, armour, food, material, stolen good, keepsake), a material tier and a quality for gear, an owner household for stolen goods, and an icon. `ItemStack` needs the quality where it can vary. The save also needs a second item list for storage, and what is on display in the house.

### 7. The squad is a company

`SquadMember` has a level and `wounded`, and its comment still says the wounded sit out the next battle, which is the old rule. Section 6 (Companions) needs, per companion: whether they have joined, whether they are travelling with the hero or waiting in Wick, the stage of bond (1 to 3), whether their wish is fulfilled, and wounded until the hero rests. Names, traits, and perks are definitions in data.

## Missing from `GameState`

None of these exists yet, and each is needed by a stream that is about to start. Add them now as empty lists or defaults so nobody invents a private copy.

| Field | Needed for |
| --- | --- |
| `day: number` | Income, restocking, the tax cart, and "the next morning" for bandits won back |
| `discoveredPlaces: string[]` | The map and the compass |
| `fragmentsFound: string[]` | The Notes tab and Show |
| `bandits: Record<string, BanditState>` | Kill or knock out, surrender, and winning them back. Each is `alive`, `dead`, `knocked_out`, `spared`, `stayed`, `left`, or `returned_to_stane` |
| `lostPeople: string[]` | People who are dead or gone, so perk fallbacks know to apply |
| `trialsPassed: string[]` | Rank and trial perks |
| `stolenGoodsReturned: string[]` | Households that come home for a returned thing |
| `projectsBuilt: string[]` | Rebuilding Wick |
| `campfiresFound: string[]` | The map |
| `storyMoments: string[]` | The first lantern, the turn, Stane yielding, the finale |
| `settings` | Kept in a separate object and a separate storage key, not in the save (section 10) |

## Fine as they are

`Vec2`, `SKILL_IDS`, `SkillState`, `HeroRank` as a type, `SAVE_VERSION`, `seed`, `timeOfDay`, and `openedChests`.
