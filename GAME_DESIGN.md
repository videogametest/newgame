# Game Design

Working title: TBD. This document is the source of truth for design decisions. Read it before building anything. If a build task conflicts with it, stop and ask.

## 1. Summary

A single-player, medieval fantasy conquest RPG played in the browser. The player controls one hero in real-time, side-view battles, fighting alongside an AI-controlled squad. Between battles the player moves across a world map of nodes, captures towns, collects loot, crafts gear, and grows a squad.

Inspirations and what we take from each:

| Game | What we take |
| --- | --- |
| Feudalism 1 and 2 | Side-view squad battles, world map of towns to capture, hero plus army |
| RuneScape | Skills that level by use, gear tiers from materials, fixed-difficulty regions |
| Skyrim / Oblivion | No classes; build identity comes from what you use and which perks you pick |
| Worms | Aimed, arcing projectiles |
| Pokémon | Collecting and developing a roster |
| Far Cry | Outposts to clear and hold |

## 2. Fixed decisions

These are expensive to change. Do not revisit without asking.

- **Single-player only.** No multiplayer, now or later. No server-authoritative logic needed.
- **Platform:** desktop browser, keyboard and mouse only. No touch or controller support.
- **Art style:** clean vector (flat shapes, solid colors, no pixel art). Placeholder shapes are fine until the art pass.
- **Canvas:** 1280×720 logical resolution, scaled to fit the window with aspect ratio preserved.
- **Character scale:** about 90 px tall at logical resolution.
- **Arenas:** flat ground, two to three screens wide, camera follows the hero.
- **Combat:** real-time, side-view. The player directly controls the hero only.
- **Progression:** use-based skills, no classes.
- **Hosting:** GitHub Pages (static). Supabase for cloud saves later. Only the publishable key in the client; row-level security on every table; the service-role key never enters the repo.

## 3. Core loop

1. **World map.** Pick a node: town, outpost, or bandit camp.
2. **Battle.** Hero and squad against the node's defenders. Target length: two to four minutes.
3. **Rewards.** XP for skills used, gold, materials, sometimes gear.
4. **Town.** Craft and upgrade gear, recruit and equip squad members, heal the wounded.
5. **Expand.** Captured towns pay gold and materials over time. Push into harder regions.

Rules:

- **Difficulty is fixed per region.** Enemies do not scale with the player. Early regions become easy; later regions are gated by strength, not locks.
- **Losing a battle:** no permadeath. The player keeps XP earned, loses a portion of carried gold, and returns to the last owned town. Squad members who fell are wounded: they sit out the next battle or can be healed for gold.
- **Town income** accrues per battle fought, not real-world time, so there are no idle timers.

## 4. Combat

Controls:

- `A` / `D`: move left and right
- `1` / `2`: switch between sword and bow
- Left mouse: attack
  - **Sword:** melee swing, short range, brief cooldown
  - **Bow:** hold to draw, release to fire toward the cursor. The arrow follows a gravity arc. Longer draw means more power and damage.

Rules:

- Every fighter has an HP bar. Hits apply knockback and show a damage number.
- Squad members are AI-controlled and target the nearest enemy.
- A battle ends when one side is eliminated.

Starting unit types:

| Unit | Behavior |
| --- | --- |
| Melee soldier | Walks to the nearest enemy, attacks in range |
| Archer | Keeps distance, fires arced arrows |

More unit types, enemy variety, and abilities come after the combat prototype feels good.

## 5. Progression

**Skills** level by use. No classes.

| Skill | Levels from | Effect |
| --- | --- | --- |
| Archery | Bow hits | Bow damage, draw speed |
| Melee | Sword hits | Sword damage, swing speed |
| Defense | Damage taken and blocked | Max HP, damage reduction |
| Smithing | Crafting gear | Unlocks higher gear tiers, better craft quality |
| Leadership | Battles won with a squad | Squad size, recruit quality |

- **Perks:** one perk choice every 10 levels in a skill. Perks are where build identity comes from.
- **Gear tiers** come from materials: bronze, iron, steel, then higher tiers. Gear is crafted or looted.
- **Squad:** recruits have their own level and gear slots. Recruiting and developing them is the collecting layer.

Exact XP curves, perk lists, and tier stats are tuning, not design. Keep them in data.

## 6. Technical architecture

- **Stack:** Phaser, TypeScript, Vite. Deployed to GitHub Pages by a GitHub Action.
- **Data-driven content.** Items, enemies, unit types, skills, perks, and map nodes are defined in data files (typed TS or JSON), not hard-coded in scene logic. Adding a new sword or enemy should be a data entry.
- **One tuning file.** All balance numbers (speed, damage, HP, cooldowns, gravity, XP rates) live in a single config, separate from logic.
- **Game state is separate from rendering.** A single serializable game-state object holds everything about a save (hero, skills, inventory, squad, map ownership). Phaser scenes read from it and write to it; they do not own state.
- **Scenes:** Boot, WorldMap, Battle, Town, plus a UI layer.
- **Saves:** serialize the game-state object. Browser `localStorage` first. Supabase cloud saves are added in milestone 4 using the same serialized shape. Include a `version` field in the save from day one so old saves can be migrated.
- **Pure logic is testable.** Damage, XP, loot, and income calculations are pure functions with unit tests, with no Phaser dependency.

## 7. Milestones

Each milestone ends deployed to Pages and playable. Do not start the next one until the current one is approved.

1. **Combat prototype.** One arena. Hero with sword and bow. Enemy melee soldier and archer. Two allied melee soldiers. HP bars, knockback, damage numbers. Victory and Defeat screens with restart. Placeholder art. No Supabase use. Goal: tune until combat feels good.
2. **Progression.** Skills that level by use, perks, loot drops, inventory, equippable gear with tiers, local saves.
3. **World map and towns.** Node map, capture, town income, crafting, recruiting, wounded squad members, regions with fixed difficulty.
4. **Cloud saves.** Supabase auth and save sync.
5. **Art and content pass.** Vector art, more unit types, more regions, sound.

## 8. Deferred ideas

Not in scope until the core game works. Do not build these unprompted.

- Stealth openers on outposts (sneak-attack bonus on the first shot)
- Magic as a third combat style
- Terrain, cover, and wind
- Story and quests
