# Game Design

Version 5 (open world). Supersedes version 4, which used a menu map and separate battle arenas.

Working title: TBD. This document is the source of truth for design decisions. Read it before building anything. If a build task conflicts with it, stop and ask.

## 1. Summary

A single-player, medieval fantasy conquest RPG played in the browser in full 3D. The player explores one continuous open world on foot from a third-person camera, with an AI-controlled squad following. Enemy camps and outposts sit in the world; fights happen where the player meets them, with no loading into a separate arena. Clearing a place captures it. Between fights the player explores, loots, crafts gear, levels skills, and grows the squad.

The world should feel like a place worth walking through: bright, alive, and full of small things to find. It is our own world. Do not use characters, names, symbols, music, or designs from any existing game.

Inspirations and what we take from each:

| Game | What we take |
| --- | --- |
| The Legend of Zelda series | The feeling of the world: a living field, landmarks on the horizon, secrets off the path, small rewards everywhere, music that responds |
| Skyrim / Oblivion | Third-person 3D combat with sword and bow; no classes; build identity from what you use and which perks you pick |
| Feudalism 1 and 2 | Hero plus squad, towns to capture |
| RuneScape | Skills that level by use, gear tiers from materials, fixed-difficulty regions |
| Worms | Aimed, arcing projectiles |
| Pokémon | Collecting and developing a roster |
| Far Cry | Outposts to clear and hold |

## 2. Fixed decisions

These are expensive to change. Do not revisit without asking.

- **Single-player only.** No multiplayer, now or later. No server-authoritative logic needed.
- **Platform:** desktop browser, keyboard and mouse only. No touch or controller support.
- **Full 3D, third-person.** Over-the-shoulder camera that follows the hero; mouse controls the camera.
- **One continuous open world.** No battle arenas, no menu map, no loading screens between places inside a region. Combat happens in the world.
- **The world is generated from data and a seed, not hand-modelled.** Terrain comes from a seeded height function. Scenery (trees, rocks, grass, flowers) is scattered by seeded rules per biome. Points of interest (village, camps, outposts, chests, ruins, landmarks) are placed by hand in data files. The same seed always produces the same world.
- **The world grows by regions.** Start with one valley about 500 m across. Later regions attach at its edges and are part of the same continuous world.
- **Engine:** Babylon.js with TypeScript and Vite.
- **Art style:** stylized low-poly from CC0 asset packs. Characters stay as they are (KayKit Adventurers). Scenery comes from packs that match them (KayKit first; Quaternius or Kenney where KayKit has nothing suitable). Keep each pack's license file in the repo beside its assets.
- **No physics engine.** The core simulation owns every position, velocity, and hit, including ground height. Babylon renders what the simulation says.
- **Canvas** fills the browser window. Target 60 fps on a desktop.
- **Progression:** use-based skills, no classes.
- **Hosting:** GitHub Pages (static). Supabase for cloud saves later. Only the publishable key in the client; row-level security on every table; the service-role key never enters the repo.

## 3. Core loop

1. **Explore.** Walk the world with the squad. Find camps, outposts, chests, and secrets.
2. **Fight.** Enemies notice the hero inside their awareness range and attack. Fights happen in place.
3. **Capture.** Clearing every defender of a camp or outpost captures it. A captured place visibly changes: the player's banner goes up and it becomes safe.
4. **Reward.** XP for skills used, gold, materials, sometimes gear, from enemies, chests, and breakable objects.
5. **Town.** In the village and in captured towns: craft and upgrade gear, recruit and equip squad members, heal the wounded.
6. **Expand.** Captured places pay gold and materials over time. Push into harder territory.

Rules:

- **Difficulty is fixed by location.** Enemies do not scale with the player. Places farther from the starting village are harder. Early areas become easy; later areas are gated by strength, not locks.
- **Dying:** no permadeath. The player keeps XP earned, loses a portion of carried gold, and wakes at the nearest owned town. Squad members who fell are wounded: they stay behind until healed for gold or until the player rests at a town.
- **Income** accrues per place captured and per in-game day, not real-world time.
- **Enemies stay dead** in captured places. Uncaptured camps restock their defenders after several in-game days.

## 4. The world

Look and atmosphere:

- Bright, saturated colour; soft lighting; light distance haze. A sun that moves, with shadows.
- **Day-night cycle** of about 20 real minutes, with warm light at dawn and dusk, and a moon and stars at night.
- Grass and foliage sway in the wind. Butterflies by day, fireflies at dusk and night. Clouds drift.
- **Landmarks on the horizon** (a castle, a mountain, a tower) are visible from most of the valley. They mark future regions.
- Water: a river or lake with a simple animated surface.

Things to find:

- Chests with a short opening moment and a reward sound.
- Breakable crates, barrels, and pots that drop small loot.
- Tall grass the sword can cut, sometimes dropping items.
- At least a few secrets off the paths in each region: a hidden grove, a ruin, a cave mouth, a lone chest on a hill.

Layout of the first valley:

- A friendly village near the centre, where the player starts.
- Paths leading out to at least two bandit camps and one fortified outpost.
- Hills, a forest area, open fields, and water, so different parts feel different.
- A natural boundary (cliffs, dense forest, water) at the edge. No invisible walls in open ground and no coloured barrier.

Sound:

- Ambient nature per area and time of day: birdsong, wind, water, crickets at night.
- Sound effects for sword swing, sword hit, bow draw, bow release, arrow impact, footsteps by surface, dodge, taking damage, death, chest opening, item pickup, breaking objects, capture.
- Music that responds: calm while exploring, building when enemies are aware of the hero, a short flourish on capture. Use CC0 music and audio (Kenney audio packs first). All music is original or CC0; never imitate a known melody.
- Master, music, and effects volume in the settings panel. Audio starts on the first click, as browsers require.

## 5. Combat

Controls:

- `W` `A` `S` `D`: move, relative to the camera
- Mouse: look and aim (pointer lock during play; `Esc` releases it)
- `Shift`: sprint
- `Space`: dodge roll in the movement direction, with a short cooldown
- `1` / `2`: switch between sword and bow
- Left mouse: attack
  - **Sword:** melee swing in front of the hero, short range, brief cooldown
  - **Bow:** hold to draw, release to fire along the crosshair. The arrow follows a gravity arc. Longer draw means more speed and damage.
- Right mouse (bow only): zoom the camera in for aiming
- `E`: interact (open chest, talk, use a town service)
- Backtick: tuning panel

Rules:

- Every fighter has an HP bar above their head, shown when in combat or damaged. Hits apply knockback, flash the target, and show a damage number.
- **Enemy attacks are telegraphed.** Every enemy melee attack has a visible wind-up before damage lands, long enough to dodge or step away. Enemy archers visibly draw before firing.
- **Awareness.** Each enemy has an awareness range. Outside it they idle or patrol their camp. Inside it they attack, and they give up and return home if led too far away.
- Squad members follow the hero when out of combat and target the nearest enemy when a fight starts.
- Fighters collide with the opposing team and with scenery. Teammates do not block each other. A fighter that comes between the camera and the hero fades out.
- Arrows are blocked by terrain and scenery.

Starting unit types:

| Unit | Behavior |
| --- | --- |
| Melee soldier | Runs to the nearest enemy, winds up, strikes |
| Archer | Keeps distance, draws, fires arced arrows |

## 6. Progression

**Skills** level by use. No classes.

| Skill | Levels from | Effect |
| --- | --- | --- |
| Archery | Bow hits | Bow damage, draw speed |
| Melee | Sword hits | Sword damage, swing speed |
| Defense | Damage taken and blocked | Max HP, damage reduction |
| Smithing | Crafting gear | Unlocks higher gear tiers, better craft quality |
| Leadership | Places captured with a squad | Squad size, recruit quality |

- **Perks:** one perk choice every 10 levels in a skill. Perks are where build identity comes from.
- **Gear tiers** come from materials: bronze, iron, steel, then higher tiers. Gear is crafted or looted, and equipped gear is visible on the character model where the asset pack allows.
- **Squad:** recruits have their own level and gear slots. Recruiting and developing them is the collecting layer.

Exact XP curves, perk lists, and tier stats are tuning, not design. Keep them in data.

## 7. Technical architecture

- **Stack:** Babylon.js, TypeScript, Vite. Deployed to GitHub Pages by a GitHub Action that runs tests before it builds.
- **Simulation is separate from rendering.** `src/core` holds the world simulation: fixed-step, deterministic, no Babylon imports. Positions are on the ground plane (x, z) with y as height. Babylon reads simulation state each frame and draws it; it never owns game state.
- **Ground height is a pure function** in `src/core`, `heightAt(x, z)`, built from the world seed. The simulation and the renderer both use it, so what the player sees and what the simulation believes always agree.
- **Simulate only what is near.** Fighters and objects within an activation radius of the hero are simulated each step; the rest sleep and keep their saved state.
- **The world is divided into chunks.** Terrain and scenery for chunks near the hero are built and shown; distant chunks are removed. Scenery uses instancing. No visible pop-in at walking speed.
- **Performance budgets**, checked in a headless test where practical: 60 fps target, at most 300 draw calls in view, first-load download under 25 MB, time to first playable frame under 10 s on broadband.
- **Pathfinding.** AI fighters path around scenery and steep terrain using grid-based A* in `src/core` over the nearby chunks. A fighter must never get stuck. Tests cover a blocked straight-line case.
- **Data-driven content.** Items, unit types, skills, perks, biomes, scatter rules, and points of interest are defined in data files (typed TS or JSON), not hard-coded. Adding a camp, a chest, or a sword should be a data entry.
- **One tuning file.** All balance and feel numbers live in a single config, separate from logic.
- **Game state is serializable.** A single game-state object holds everything about a save: hero, skills, inventory, squad, which places are captured, which chests are opened, time of day. Generated terrain and scenery are not saved; they come from the seed.
- **Saves:** browser `localStorage` first, autosaving on capture, on town visits, and every few minutes. Supabase cloud saves come later using the same serialized shape. Include a `version` field in the save from day one.
- **Motion and scenes are verifiable without a human.** A showcase mode (`?showcase=<clip>`) plays one animation on one character at a fixed camera, driven by simulation time. A tour mode (`?tour=1`) moves the camera through fixed viewpoints in the world at set times of day. Rendering PRs attach contact sheets from showcase mode and screenshots from tour mode.
- **Pure logic is testable.** Damage, hit detection, AI decisions, awareness, pathfinding, height, XP, loot, and income are pure functions with unit tests. Keep headless bot tests that clear a camp.

## 8. Milestones

Each milestone ends deployed to Pages and playable. Do not start the next one until the current one is approved, unless a build message says otherwise.

1. **Combat prototype.** Done: third-person hero, sword and bow, telegraphed enemies, dodge, waves, tuning panel. Remaining: camera fade for blocking fighters, sound effects, showcase mode.
2. **Open world slice.** The first valley, about 500 m across: seeded terrain with `heightAt`, chunked scenery, sky and day-night cycle, wind, ambient life, water, a boundary, and horizon landmarks. A village, two bandit camps, and one outpost placed in data. Fights in place with awareness ranges, squad following, pathfinding, capture with a visible change, chests and breakables, ambient sound and responsive music. Tour mode. The milestone 1 arena and waves are removed. Balance target: the skilled bot clears the nearest camp in 60 to 150 s with 30 to 70% HP left, and a sword-only bot that never dodges loses at the outpost.
3. **Progression.** Skills that level by use, perks, loot tables, inventory, equippable gear with tiers, local saves.
4. **Conquest and towns.** Town services (crafting, recruiting, healing), income from captured places, wounded squad members, camps that restock, harder places farther out.
5. **Cloud saves.** Supabase auth and save sync.
6. **More world.** A second region, more unit types, more secrets, more music.

## 9. Deferred ideas

Not in scope until the core game works. Do not build these unprompted.

- Stealth openers on outposts (sneak-attack bonus on the first shot)
- Magic as a third combat style
- Blocking and parrying
- Mounts
- Swimming and climbing
- Story, quests, and dialogue beyond simple town services
- Weather
