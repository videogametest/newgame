# Game Design

Version 2 (full 3D). Supersedes version 1, which specified a 2D side-view game in Phaser.

Working title: TBD. This document is the source of truth for design decisions. Read it before building anything. If a build task conflicts with it, stop and ask.

## 1. Summary

A single-player, medieval fantasy conquest RPG played in the browser in full 3D. The player controls one hero from a third-person camera in real-time battles, fighting alongside an AI-controlled squad. Between battles the player picks targets on a world map, captures towns, collects loot, crafts gear, and grows a squad.

Inspirations and what we take from each:

| Game | What we take |
| --- | --- |
| Skyrim / Oblivion | Third-person 3D combat with sword and bow; no classes; build identity from what you use and which perks you pick |
| Feudalism 1 and 2 | Hero plus squad battles, world map of towns to capture |
| RuneScape | Skills that level by use, gear tiers from materials, fixed-difficulty regions |
| Worms | Aimed, arcing projectiles |
| Pokémon | Collecting and developing a roster |
| Far Cry | Outposts to clear and hold |

## 2. Fixed decisions

These are expensive to change. Do not revisit without asking.

- **Single-player only.** No multiplayer, now or later. No server-authoritative logic needed.
- **Platform:** desktop browser, keyboard and mouse only. No touch or controller support.
- **Full 3D, third-person.** Over-the-shoulder camera that follows the hero; mouse controls the camera.
- **Engine:** Babylon.js with TypeScript and Vite. Phaser is removed.
- **Art style:** stylized low-poly. Characters, weapons, and props come from free CC0 asset packs, starting with KayKit Adventurers (rigged, animated, glTF). No realistic art. Keep each pack's license file in the repo beside its assets.
- **Battles happen in bounded arenas, not an open world.** Each map node loads one arena. A seamless open world is out of scope.
- **No physics engine.** The core simulation owns every position, velocity, and hit. Babylon renders what the simulation says.
- **Canvas** fills the browser window. Target 60 fps on a desktop with up to 20 fighters on screen.
- **Progression:** use-based skills, no classes.
- **Hosting:** GitHub Pages (static). Supabase for cloud saves later. Only the publishable key in the client; row-level security on every table; the service-role key never enters the repo.

## 3. Core loop

1. **World map.** Pick a node: town, outpost, or bandit camp.
2. **Battle.** Hero and squad against the node's defenders in that node's arena. Target length: two to four minutes.
3. **Rewards.** XP for skills used, gold, materials, sometimes gear.
4. **Town.** Craft and upgrade gear, recruit and equip squad members, heal the wounded.
5. **Expand.** Captured towns pay gold and materials over time. Push into harder regions.

Rules:

- **Difficulty is fixed per region.** Enemies do not scale with the player. Early regions become easy; later regions are gated by strength, not locks.
- **Losing a battle:** no permadeath. The player keeps XP earned, loses a portion of carried gold, and returns to the last owned town. Squad members who fell are wounded: they sit out the next battle or can be healed for gold.
- **Town income** accrues per battle fought, not real-world time, so there are no idle timers.

## 4. Combat

Controls:

- `W` `A` `S` `D`: move, relative to the camera
- Mouse: look and aim (pointer lock while in battle; `Esc` releases it)
- `Shift`: sprint
- `Space`: dodge roll in the movement direction, with a short cooldown
- `1` / `2`: switch between sword and bow
- Left mouse: attack
  - **Sword:** melee swing in front of the hero, short range, brief cooldown
  - **Bow:** hold to draw, release to fire along the crosshair. The arrow follows a gravity arc. Longer draw means more speed and damage.
- Right mouse (bow only): zoom the camera in for aiming

Rules:

- Every fighter has an HP bar above their head. Hits apply knockback, flash the target, and show a damage number.
- **Enemy attacks are telegraphed.** Every enemy melee attack has a visible wind-up before damage lands, long enough to dodge or step away. Enemy archers visibly draw before firing.
- Squad members are AI-controlled and target the nearest enemy.
- Fighters collide with the opposing team and with arena obstacles. Teammates do not block each other.
- A battle ends in victory when no enemies are alive, or defeat when the hero dies.

Starting unit types:

| Unit | Behavior |
| --- | --- |
| Melee soldier | Runs to the nearest enemy, winds up, strikes |
| Archer | Keeps distance, draws, fires arced arrows |

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
- **Gear tiers** come from materials: bronze, iron, steel, then higher tiers. Gear is crafted or looted, and equipped gear is visible on the character model where the asset pack allows.
- **Squad:** recruits have their own level and gear slots. Recruiting and developing them is the collecting layer.

Exact XP curves, perk lists, and tier stats are tuning, not design. Keep them in data.

## 6. Technical architecture

- **Stack:** Babylon.js, TypeScript, Vite. Deployed to GitHub Pages by a GitHub Action that runs tests before it builds.
- **Simulation is separate from rendering.** `src/core` holds the battle simulation: fixed-step, deterministic, no Babylon imports. Positions are on the ground plane (x, z) with y as height. Babylon scenes read simulation state each frame and draw it; they never own game state.
- **Data-driven content.** Items, enemies, unit types, skills, perks, arenas, and map nodes are defined in data files (typed TS or JSON), not hard-coded in scene logic. Adding a new sword or enemy should be a data entry. Each unit type names its model file and its animation clips in data.
- **One tuning file.** All balance numbers (speed, damage, HP, cooldowns, wind-up times, gravity, XP rates, camera distance) live in a single config, separate from logic.
- **Game state is serializable.** A single game-state object holds everything about a save (hero, skills, inventory, squad, map ownership).
- **Scenes:** Boot (asset loading with a progress bar), WorldMap, Battle, Town, plus a UI layer.
- **Assets** live in `public/assets/`, grouped by pack, each with its license file. Load models as glTF. Keep the first-load download under 15 MB.
- **Saves:** serialize the game-state object. Browser `localStorage` first. Supabase cloud saves are added in milestone 4 using the same serialized shape. Include a `version` field in the save from day one so old saves can be migrated.
- **Pure logic is testable.** Damage, hit detection, AI decisions, XP, loot, and income are pure functions with unit tests. Keep a headless bot test that plays a battle to an outcome.

## 7. Milestones

Each milestone ends deployed to Pages and playable. Do not start the next one until the current one is approved.

1. **3D combat prototype.** One arena: flat ground with a few obstacles and a visible boundary. Third-person hero with an animated character model, sword and bow. Enemies: two melee soldiers and one archer. Allies: two melee soldiers. Animations for idle, run, attack, hit, and death. HP bars, knockback, damage numbers, telegraphed enemy attacks, dodge roll. Victory and Defeat screens with restart. No Supabase use. Goal: tune until combat feels good.
2. **Progression.** Skills that level by use, perks, loot drops, inventory, equippable gear with tiers, local saves.
3. **World map and towns.** Node map, capture, town income, crafting, recruiting, wounded squad members, regions with fixed difficulty, a distinct arena per node type.
4. **Cloud saves.** Supabase auth and save sync.
5. **Content and polish pass.** More unit types, more arenas and regions, lighting and effects, sound and music.

## 8. Deferred ideas

Not in scope until the core game works. Do not build these unprompted.

- Open world or seamless travel between areas
- Stealth openers on outposts (sneak-attack bonus on the first shot)
- Magic as a third combat style
- Blocking and parrying
- Mounts
- Story and quests
