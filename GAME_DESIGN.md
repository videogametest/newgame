# Every Lit Window: Game Design

Version 9 (deepens the story: the Lamplighter, the Captain, the hero's house, places with a past, the lantern ritual, and the turn). Supersedes version 8.

The game is called **Every Lit Window**. The name is the image the game builds toward: a valley where no window is dark any more. Keep the title in one data constant so it is defined in one place. This document is the source of truth for design decisions. Read it before building anything. If a build task conflicts with it, stop and ask.

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
3. **Capture.** After clearing every defender of a place, the hero lights its lantern (section 9). The Captain's banner comes down, the place becomes safe, and it starts turning back into what it used to be.
4. **Reward.** XP for skills used, gold, materials, sometimes gear, from enemies, chests, and breakable objects.
5. **Town.** In the village and in captured towns: craft and upgrade gear, recruit and equip squad members, heal the wounded.
6. **Expand.** Captured places pay gold and materials over time. Push into harder territory.

Rules:

- **Difficulty is fixed by location.** Enemies do not scale with the player. Places farther from the starting village are harder. Early areas become easy; later areas are gated by strength, not locks.
- **Dying:** no permadeath. The player keeps XP earned, loses a portion of carried gold, and wakes at the nearest owned town. Squad members who fell are wounded: they stay behind until healed for gold or until the player rests at a town.
- **Income** accrues per place captured and per in-game day, not real-world time.
- **Healing.** Health does not regenerate on its own. Food, found in the world or bought in town, heals over a few seconds when eaten and can be interrupted by taking damage. Resting at an owned town heals the hero and squad fully and advances time to the next morning.
- **Enemies stay dead** in captured places, except when the story retakes one (section 9, The turn). Uncaptured camps restock their defenders after several in-game days.

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

Finding your way:

- **Compass strip** at the top of the screen showing the direction of nearby discovered places and of the nearest undiscovered one as an unlabelled mark.
- **Map** (`M`): a simple drawn map of the region that fills in as places are discovered. It shows the hero, discovered places, and which are captured. No marker for anything the player has not found.
- A place is discovered when the hero comes within sight of it. Discovery shows its name briefly on screen.
- **Fast travel** between owned towns from the map. Not available in the first valley; it arrives with the second region.

Layout of the first valley:

- The hero starts at the valley's edge at dusk, with the Lamplighter's single lit window visible in the distance, and walks to the village near the centre.
- Paths lead out from the village to the Mill, the Forge, and the Watch-house (section 9).
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
- `F`: eat food to heal
- `Q`: squad order, toggling between "follow me" and "hold here"
- `M`: map
- `Esc`: pause menu (also releases the mouse)
- Backtick: tuning panel

Rules:

- Every fighter has an HP bar above their head, shown when in combat or damaged. Hits apply knockback, flash the target, and show a damage number.
- **Enemy attacks are telegraphed.** Every enemy melee attack has a visible wind-up before damage lands, long enough to dodge or step away. Enemy archers visibly draw before firing.
- **Awareness.** Each enemy has an awareness range. Outside it they idle or patrol their camp. Inside it they attack, and they give up and return home if led too far away.
- Squad members follow the hero when out of combat and target the nearest enemy when a fight starts.
- **Squad orders.** "Follow me" is the default. "Hold here" keeps the squad where they stand: they defend themselves but do not advance, so the hero can scout or open a fight alone. The current order is shown on the HUD.
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

- **Stack:** Babylon.js (current stable major, pinned in `package.json`), TypeScript, Vite. Deployed to GitHub Pages by a GitHub Action that runs tests before it builds.
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
2. **Open world slice.** The first valley, about 500 m across: seeded terrain with `heightAt`, chunked scenery, sky and day-night cycle, wind, ambient life, water, a boundary, and horizon landmarks. A village that starts half abandoned with the Lamplighter and one lit window, plus the Mill, the Forge, and the Watch-house placed in data (section 9). Fights in place with awareness ranges, squad following, pathfinding, capture by lighting the lantern, with the growing melody, falling banners, and visible restoration of each place and of the village, chests and breakables with found notes, healing by food and rest, compass strip and map, squad orders, pause menu with settings, ambient sound and responsive music. Tour mode. The milestone 1 arena and waves are removed. Balance target: the skilled bot clears the nearest camp in 60 to 150 s with 30 to 70% HP left, and a sword-only bot that never dodges loses at the outpost.
3. **First five minutes and the valley finale.** Title screen with Continue and New Game, control prompts shown the first time each is needed, a nudge toward the first camp, local saves, the turn in which the Captain retakes the first freed place, the Captain fight at the Watch-house, and the valley finale ending at the hero's family house (section 9).
4. **Progression.** Skills that level by use, perks, loot tables, inventory, equippable gear with tiers.
5. **Conquest and towns.** Town services that come from the people who return (the smith's crafting, the miller's food, recruiting, healing), income from captured places, wounded squad members, camps that restock, harder places farther out.
6. **Cloud saves.** Supabase auth and save sync.
7. **More world.** A second region, fast travel between owned towns, more unit types, more secrets, more music.

## 9. Story

Names in this section are placeholders and may change. Keep every name in data, never in code. "The Lamplighter" and "the Captain" are titles; each also has a personal name in data.

### Premise

- A generation ago the kingdom fell apart. One night the crown's soldiers left the valley without a word. The roads went unguarded, bandits moved in, and most families fled.
- The hero was carried out of the valley as a small child and grew up elsewhere on stories of it. Now grown, the hero has come home to a village that is half empty.
- The hero's family house still stands in the village, dark and boarded up.
- The hero takes the valley back one place at a time. Each place freed brings people home.

Tone: warm and hopeful, with a quiet sadness for what was lost. No gore, no grim cruelty. The enemies are people, not monsters.

### The people

- **The Lamplighter.** An old villager who never left. Every night for a generation they have kept one window lit so that anyone coming home could find the way. That single light is visible across the valley at night and is the first thing the hero walks toward. The Lamplighter greets the hero, knew the hero's family, and is the heart of the village. They speak in short, plain lines that change as the valley recovers, and they are the one who teaches the lantern ritual.
- **The Captain.** A former officer of the crown's guard who stayed when the army left and decided the valley was theirs to hold. They rule from the outpost and take a share of everything, and in their own eyes they are the only reason anyone here survived. They are not entirely wrong. Their banners fly over every place the hero has not freed, so their presence is visible everywhere. They are defeated, not killed.
- **The hero** is silent and unnamed, so the player can be them.

### The question

Why did the soldiers leave overnight? Nobody in the valley knows. The first valley gives fragments: found notes, a ruined watchtower, a soldier's grave, a line from the Lamplighter, and finally what the Captain saw that night. The fragments point to the abandoned castle on the horizon, where the answer is. The castle is not reachable in the first valley. Never answer the question in the first valley.

### Places with a past

Every enemy-held place used to be something, and freeing it brings that thing and its person back. Story and progression are the same act.

| Place | Held as | What it was | Who returns | What the player gains |
| --- | --- | --- | --- | --- |
| The Mill | Bandit camp | The valley's mill | The miller | Food: sold in the village and found in the mill |
| The Forge | Bandit camp | The valley's forge | The smith | Crafting and gear upgrades |
| The Watch-house | The Captain's outpost | The crown guard's post | Nobody at first | The road toward the castle |

Each place looks like what it was, under what the bandits have done to it: a mill with a stopped wheel, a cold forge. Once freed, the wheel turns and the forge is lit. More places follow the same pattern in later regions. Every place is defined in data with its past, its person, and its reward.

### The lantern ritual

A place is not freed when the last defender falls. It is freed when the hero lights its lantern.

- Each place has an unlit lantern. After the defenders are cleared, the hero interacts with it (`E`) to light it. The Captain's banner comes down and the place is captured.
- A short melody plays. It is the same melody every time, with one more instrument for each place freed, so it grows fuller across the game.
- A lit lantern can be seen from a distance at night. As the valley is freed, the night fills with lights.
- The Lamplighter lights the hero's first lantern alongside them, to teach it.

### The turn

The valley does not only get better.

- After the hero frees the second place, the Captain strikes back. That night the first place the hero freed is retaken: its lantern goes dark, its person flees to the village, and what it gave the player is lost until it is freed again.
- The retaken place is held by stronger defenders than before.
- The Lamplighter's line the next morning is the low point of the story.
- Retaking it relights the lantern and opens the way to the Watch-house.

### The world tells the story

There is no quest log and no long dialogue. The story is carried by:

- **Restoration.** The village starts with boarded windows, empty fields, few people, and one lit window. With each lantern lit, more villagers return, buildings are repaired, fields are worked, stalls open, and more windows glow after dark. The village music gains an instrument with each one.
- **The Captain's banners**, which come down place by place.
- **Villagers** who say one or two short lines that change as the valley recovers.
- **Things found off the path**, each a fragment of the question. Text is three sentences at most.
- **Recruits.** Each squad member is a named person with a home in the valley and a two-sentence reason for joining. Some become available only after a specific place is freed.
- **Landmarks** on the horizon that the fragments refer to.

Restoration is tracked as a single valley recovery level in the game state. It rises with each lantern lit and falls when a place is retaken. Scenery, villager count, lights, banners, and music read from it.

### The valley finale

1. The hero takes the Watch-house and faces the Captain, who is the hardest fight in the valley. Beaten, the Captain yields and tells the hero what they saw the night the soldiers left. It deepens the question; it does not answer it.
2. The hero lights the Watch-house lantern. Every place in the valley is free.
3. That night the village holds a festival: lanterns, the full melody, every returned villager gathered.
4. The Lamplighter leads the hero to the family house. The hero lights its window. It is the last dark window in the village, and the image the game is named for.
5. In the morning the road toward the castle is open and marked on the map.

## 10. Interface

- **Title screen:** the game's name over a slow view of the valley, with Continue (when a save exists) and New Game. New Game asks for confirmation before replacing a save.
- **Pause menu** (`Esc`): Resume, Settings, Controls, Quit to title. The simulation stops while it is open.
- **Settings:** mouse sensitivity, invert vertical look, master, music, and effects volume, and graphics quality (low, medium, high: shadow quality, scenery density, view distance). Settings are saved in the browser separately from the game save.
- **Onboarding without a tutorial level.** A short prompt appears the first time each control is needed (move, look, sprint, attack, switch weapon, dodge, eat, squad order, map) and never again once used. A villager at the start points the hero toward the nearest camp.
- **HUD:** hero health, equipped weapon, food count, squad order, compass strip. Keep it small; hide what is not needed outside combat.
- The tuning panel (backtick) stays as a developer tool and is not part of the player-facing menus.

## 11. Deferred ideas

Not in scope until the core game works. Do not build these unprompted.

- Stealth openers on outposts (sneak-attack bonus on the first shot)
- Magic as a third combat style
- Blocking and parrying
- Mounts
- Swimming and climbing
- Quests, a quest log, branching dialogue, and cutscenes
- Weather
