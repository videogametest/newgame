# Every Lit Window: Game Design

Version 19 (consistency pass: milestones reordered so progression comes before the finale, valley enlarged to 800 m, input and error-handling rules added, gaps closed). Supersedes version 18.

The game is called **Every Lit Window**. The name is the image the game builds toward: a valley where no window is dark any more. Keep the title in one data constant so it is defined in one place. This document is the source of truth for design decisions. Read it before building anything. If a build task conflicts with it, stop and ask.

## 1. Summary

A single-player, medieval fantasy conquest RPG played in the browser in full 3D. The player is an apprentice scout: a cloaked archer who wins by watching, planning, and striking from hiding more than by brute force. The player explores one continuous open world on foot from a third-person camera, with an AI-controlled squad following. Enemy camps and outposts sit in the world; fights happen where the player meets them, with no loading into a separate arena. Clearing a place and lighting its lantern frees it. Between fights the player explores, loots, crafts gear, levels skills, and grows the squad.

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
| Ranger's Apprentice (book series) | The feeling of apprenticeship: a terse mentor with high standards, skill and wit over strength, the bow, moving unseen, a loyal warrior friend, small comforts on the road. Feelings only: use none of its names, insignia, characters, or places |

## 2. Fixed decisions

These are expensive to change. Do not revisit without asking.

- **Single-player only.** No multiplayer, now or later. No server-authoritative logic needed.
- **Platform:** desktop browser, keyboard and mouse only. No touch or controller support.
- **Full 3D, third-person by default, with a first-person toggle.** The default is an over-the-shoulder camera that follows the hero; the player can switch to first-person at any time (section 5). Mouse controls the camera in both.
- **One continuous open world.** No battle arenas, no menu map, no loading screens between places inside a region. Combat happens in the world.
- **The world is generated from data and a seed, not hand-modelled.** Terrain comes from a seeded height function. Scenery (trees, rocks, grass, flowers) is scattered by seeded rules per biome. Points of interest (village, camps, outposts, chests, ruins, landmarks) are placed by hand in data files. The same seed always produces the same world.
- **The world grows by regions.** Start with one valley about 800 m across. Later regions attach at its edges and are part of the same continuous world.
- **Engine:** Babylon.js with TypeScript and Vite.
- **Art style:** stylized low-poly from CC0 asset packs. Characters come from KayKit Adventurers. The hero is the hooded, cloaked archer model, not the armoured knight; no enemy may use the same model and colours as the hero. Scenery comes from packs that match them (KayKit first; Quaternius or Kenney where KayKit has nothing suitable). Keep each pack's license file in the repo beside its assets.
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
- **Healing.** Health does not regenerate on its own. Food, found in the world or bought in town, heals over a few seconds when eaten and can be interrupted by taking damage. Resting at an owned town heals the hero and squad fully and advances time to the next morning. Resting at a campfire (section 4) heals the hero and squad to half and lets the player wait until dusk or dawn.
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
- Tall grass the short blade can cut, sometimes dropping items.
- **Signs on the ground:** bent grass, a bootprint in mud, a snapped twig. Used in one trial (section 6) and readable anywhere.

The ten places off the path in Tallowmere. Every secret tells part of the story, rewards the player, or is simply a good place to stand. All are defined in data.

| Place | Kind | What is there |
| --- | --- | --- |
| The patrol hut beyond the ridge | Story | Where Hesper was the night the soldiers left. From here the ridge completely hides the castle. The game does not say so; the player sees it |
| The signal hill | Story | The valley's highest point, with a cold relay brazier. The one spot with a clear view of the castle and its dark beacon |
| The soldiers' road | Story | An overgrown track leading out toward the castle, with things dropped in haste: a helmet on a fencepost, a half-loaded cart, a single boot |
| The supper table | Story | Inside the Watch-house, a table still set for a meal nobody finished |
| The family markers | Story | Stones along the road into Wick, each carved with the name of a family that left. A lantern appears on a stone when that family returns. One reads Fairlow |
| Wren's practice ground | Reward | A forest clearing with rotting archery targets and initials carved in a tree. Wren's old bow is hidden nearby: the hero's first real upgrade. Site of the first trial |
| The cave behind the waterfall | Reward | A bandit stash |
| The wild orchard | Reward | Overgrown fruit trees and old beehives. Fruit and honey for cooking at campfires |
| The firefly grove | A place to be | A hidden spring where the fireflies gather thickest at night. Nothing to collect |
| The fisher on the lake | A place to be | One stubborn old soul who never left and never paid the Captain. Sells fish and has a fragment of the story |

Wildlife:

Real animals only. There are no monsters; the only enemies who think are people. Use CC0 animated animal models (Quaternius first). If a species has no suitable model, log it in `docs/status.md` and leave it out rather than use a placeholder.

- **Alive:** songbirds, rabbits, and deer that scatter as the hero approaches; owls and crickets at night; bees at the wild orchard; fish in the lake.
- **Stealth:**
  - *Startled birds.* Sprinting through a flock sends it into the air and makes nearby enemies suspicious. Crouching past does not. Birds lifting in the distance mean someone is moving there.
  - *Crows* circle every enemy-held place, visible from far off. They leave when the place is freed.
  - *The Mill's geese.* The bandits keep them because they are loud. Running near them sets them honking, which alerts the Mill. They can be crept past.
  - *The fox* appears near secrets. Followed quietly, it leads toward one; if the hero sprints, it is gone.
- **Dangerous:**
  - *Boar* in the deep forest charge when the hero gets close. The charge is telegraphed and can be dodged.
  - *Wolves* roam the far corners of the valley at night in packs of three. They fear fire and will not come near a lit lantern or campfire. Every lantern the hero lights pushes them back, so the valley becomes safer as it is freed.
- **Recovery:** sheep, chickens, and a cat return to Wick as it recovers. The cat sits in lit windows.
- **The wren.** A wren nests in the eaves of the Fairlow house. It sings when the hero lights the window in the finale.
- **The white stag.** Seen rarely, at dawn, far off. It cannot be approached and is never explained.
- **Hunting.** Deer and rabbits can be hunted for food, which trains Archery. The geese, the fox, the wren, the cat, and the stag cannot be harmed.

Finding your way:

- **Compass strip** at the top of the screen showing the direction of nearby discovered places and of the nearest undiscovered one as an unlabelled mark.
- **Map** (`M`): a simple drawn map of the region that fills in as places are discovered. It shows the hero, discovered places, and which are captured. No marker for anything the player has not found.
- A place is discovered when the hero comes within sight of it. Discovery shows its name briefly on screen.
- **Fast travel** between owned towns from the map. Not available in the first valley; it arrives with the second region.

Campfires:

- Fire rings are scattered through the wild as discoverable places, shown on the map once found. Each sits somewhere with a view.
- At a campfire the hero can rest, cook (turn foraged ingredients into food that heals more than raw food), and wait until dusk or dawn.
- While resting, the companions present say a line or two to each other or to the hero. These short exchanges are where the game's humour and warmth live.
- A campfire cannot be used while enemies are aware of the hero.

Layout of the first valley:

- The valley is Tallowmere, with a lake at its centre. The village is Wick, beside the lake.
- The hero starts at the valley's edge at dusk, with Hesper's single lit window visible in the distance, and walks to Wick.
- Paths lead out from Wick to the Mill, the Forge, and the Watch-house (section 9).
- The ridge stands between the patrol hut and the castle; the signal hill is the highest point and sees over it.
- Hills, a forest area, open fields, and water, so different parts feel different.
- A natural boundary (cliffs, dense forest, water) at the edge. No invisible walls in open ground and no coloured barrier.

Sound:

- Ambient nature per area and time of day: birdsong, wind, water, crickets at night.
- Sound effects for blade swing and hit, knife throw, bow draw, bow release, arrow impact, footsteps by surface, dodge, taking damage, death, the alarm bell, geese, birds taking off, chest opening, item pickup, breaking objects, lighting a lantern, levelling up, and earning a perk.
- Music that responds: calm while exploring, building when enemies are aware of the hero, and the lantern melody when a place is freed (section 9). Use CC0 music and audio (Kenney audio packs first). All music is original or CC0; never imitate a known melody.
- Master, music, and effects volume in the settings panel. Audio starts on the first click, as browsers require.

## 5. Combat

Controls:

- `W` `A` `S` `D`: move, relative to the camera
- Mouse: look and aim (pointer lock during play; `Esc` releases it)
- `Shift`: sprint
- `Space`: dodge roll in the movement direction, with a short cooldown
- `1` / `2`: switch between short blade and bow
- `C`: crouch (toggle), for moving quietly and staying low
- `V`: switch between third-person and first-person view
- `Tab`: lock on to the nearest enemy in view, or release. While locked, moving the mouse sharply switches target
- `R`: throw a knife
- Mouse wheel: change arrow type
- Left mouse: attack
  - **Short blade:** a three-hit combo. Each press within a short window continues it; the third hit is slower and hits harder. The scout's backup weapon
  - **Bow:** hold to draw, release to fire along the crosshair. The arrow follows a gravity arc. Longer draw means more speed and damage. Releasing at the peak of the draw is a perfect draw (see The bow)
- Right mouse (bow only): zoom the camera in for aiming. Holding the zoom on an enemy for a moment marks them
- `E`: interact (open chest, talk, use a town service)
- `F`: eat food to heal
- `Q`: squad order, toggling between "follow me" and "hold here"
- `M`: map
- `I`: inventory
- `K`: skills and perks
- `Esc`: pause menu (also releases the mouse)
- Backtick: tuning panel

Views:

- **Third-person** is the default: over the shoulder, showing the hero, the cloak, and the surroundings.
- **First-person** puts the camera at the hero's eye height. The hero's own model is hidden but still casts a shadow. The equipped weapon is shown at the edge of the view: the bow, which visibly draws, or the short blade, which visibly swings. No arms are shown.
- In first-person the dodge roll becomes a quick sidestep in the movement direction, with the same cooldown and the same brief invulnerability, so the camera never tumbles.
- Crouching lowers the camera in both views. The bow zoom works in both.
- Every rule of the game is identical in both views; only the camera and the dodge animation differ.
- The chosen view is remembered between sessions. Field of view for each is a setting.

Rules:

- Every fighter has an HP bar above their head, shown when in combat or damaged. Hits apply knockback, flash the target, and show a damage number.
- **Enemy attacks are telegraphed.** Every enemy melee attack has a visible wind-up before damage lands, long enough to dodge or step away. Enemy archers visibly draw before firing.
- **Home ground.** Enemies idle or patrol at their place until they notice something (see Stealth and scouting). Once alert they pursue, and they give up and return home if led too far away.
- **Stealth and scouting.** The intended way to take a place is to watch it first, then strike from hiding.
  - Each enemy is unaware, suspicious, or alert, shown by a small marker above their head. Suspicious enemies turn and investigate; alert enemies attack and alert others nearby.
  - How easily the hero is noticed depends on distance, whether the enemy is facing them, movement (still, crouched, walking, sprinting), cover (tall grass, scenery between them), and light (night hides the hero; standing near a lit fire or lantern does not).
  - The scout's cloak: a hero who is crouched and not moving is very hard to notice, even in the open.
  - **Marking.** Holding the bow zoom on an enemy for a moment marks them. Marked enemies stay outlined through scenery for a while, so the player can plan from a ridge before going in.
  - **The first arrow.** An arrow that hits an unaware enemy deals heavily increased damage. A short-blade strike on an unaware enemy from behind does too.
  - **The alarm bell.** Every enemy-held place has one. An alert enemy may break off and run to ring it, which calls reinforcements from outside the place. The runner can be stopped. If nobody ever becomes alert, the bell is never rung.
  - A fight that goes loud is still winnable; stealth is rewarded, never required.
- Squad members follow the hero when out of combat and target the nearest enemy when a fight starts. They stay back and out of sight while the hero is crouched.
- **Squad orders.** "Follow me" is the default. "Hold here" keeps the squad where they stand: they defend themselves but do not advance, so the hero can scout or open a fight alone. The current order is shown on the HUD.
- Fighters collide with the opposing team and with scenery. Teammates do not block each other. A fighter that comes between the camera and the hero fades out.
- Arrows are blocked by terrain and scenery.

The bow:

The bow is the scout's main weapon and the deepest system in combat.

- **Weak points.** A hit to the head deals heavily increased damage. Helmets on some enemies reduce the bonus; the brute's helmet removes it from the front.
- **A limited quiver.** The hero carries a fixed number of arrows. Arrows that miss stick in the ground or scenery and can be picked up; arrows that hit can be recovered from fallen enemies, with a chance each one broke. Standard arrows are also sold in Wick and found in the world. Until crafting exists for the player, blunt, fire, and whistling arrows come from chests, strongboxes, enemy archers, and Hesper, who hands over a few of each when she first explains them. Running dry is a real risk that the short blade and knives cover.
- **Arrow types**, chosen with the mouse wheel and shown on the HUD:
  - *Standard.* The default.
  - *Fire.* Lights braziers, campfires, and dry grass, which spreads briefly and panics enemies caught in it. Reveals the hero's position when loosed at night. Scarce.
  - *Blunt.* A padded head. Lower damage, not lethal: it knocks out instead of killing. Made by the smith or by hand at a campfire from standard arrows.
  - *Whistling.* Does no damage. Where it lands, enemies within earshot become suspicious and go to look. The scout's tool for moving a guard. Scarce.
- **Perfect draw.** There is a brief moment at full draw, marked by a subtle cue, when releasing gives bonus damage and a flatter flight. Holding past it loses the bonus and starts to tire the aim.

Close combat:

Close combat is about not being where the blow lands. The hero cannot block.

- **Perfect dodge.** Dodging in the last moment before an enemy strike would land slows time for an instant and leaves that enemy open: the next hit on them is a critical strike. In first-person the sidestep does the same.
- **Lock-on** keeps the camera and the hero's facing on one enemy, so circling and dodging around them is easy. It works in both views and is never required.
- **Throwing knives.** A quick, silent, short-range throw that needs no draw. Low damage, but it interrupts a wind-up and counts as a strike on an unaware enemy. The hero carries a small number and recovers them like arrows.
- **Stagger.** Light enemies are interrupted by any hit during their wind-up. Heavy enemies are not, except by a critical strike.

How enemies fight:

- **They take turns.** At most two enemies attack the hero at once. The others circle, reposition, or go for a companion. A group fight stays readable.
- **Morale.** Enemies are people and want to live. Each place has a named leader, a tougher version of one of its unit types, and a morale level that falls when defenders are beaten, when the leader is beaten, when they are surprised, or when fire spreads, and rises when the bell brings reinforcements. Below a threshold, individual enemies break: some drop their weapons and run, and some throw them down and surrender. Either way they are out of the fight. A whole place can be won by breaking its nerve.
- **Kill or knock out.** Every bandit can be dealt with either way, and the choice is the player's each time.
  - *Killing:* standard and fire arrows, the short blade, and throwing knives are lethal. An enemy whose health reaches zero dies: they fall and stay down, with no blood and no gore.
  - *Knocking out:* blunt arrows (see The bow) and Bram's shield strike are not lethal. An enemy whose health reaches zero from one of these is knocked out. A stealth strike from behind offers both: `E` to knock out, attack to kill.
  - Knocking out is the harder path. Blunt arrows do less damage and gain nothing from weak points except against an unaware enemy, whom a blunt arrow to the head knocks out at once. A knocked-out enemy can be found and woken by an ally while the place is still held.
- **Surrender.** An enemy whose nerve breaks may throw down their weapons and kneel. They can be left alone, which counts as sparing them, or attacked, which is never rewarded.
- **Winning them back.** When a place is freed, every bandit knocked out or spared there is taken to Wick. The next morning each one decides. The chance they stay rises with the valley recovery level (there is more to come home to), with how many of their fellows at that place were spared rather than killed, and with their own nature, set in data: each bandit has a name, a loyalty to Stane, and the trade they had before.
  - *They stay.* They become a villager, take up their old trade, and say a line about it. Each one adds to the valley recovery level, so another window is lit. A few are recruitable into the squad.
  - *They leave.* They walk out of the valley and are not seen again.
  - *They go back.* The most loyal return to Stane and are among the defenders at the Watch-house.
  - Hesper tells the hero the outcome in a line. The player cannot see the odds, only learn from results what moves them.
- **What killing costs.** Nothing directly: it is always easier. But the dead cannot come home, a place taken by killing leaves its survivors less willing to stay, and the valley recovers more slowly.
- **Stane is the exception.** At low health he yields instead of dying, because the story needs what he has to say.

Unit types:

| Unit | Weight | Behavior | How to beat them |
| --- | --- | --- | --- |
| Soldier | Light | Runs to the nearest enemy, winds up, strikes | Anything |
| Archer | Light | Keeps distance, draws, fires arced arrows | Close the distance or out-shoot them |
| Shield-bearer | Light | Advances behind a shield that stops arrows and knives from the front | Flank them, or let Bram break their guard |
| Brute | Heavy | Slow, with long, heavy telegraphed swings that hit a wide area. Not staggered by ordinary hits | Dodge, then punish; a perfect dodge opens them |
| Runner | Light | When the alarm goes up, breaks off and sprints for the bell | Stop them with an arrow, a knife, or Bram |

Each unit type is a data entry with its model, weight, attacks, and morale. Stane, the boar, and the wolves are defined the same way.

Fighting alongside Bram:

- **Marked targets are Bram's priority.** Whoever the hero marks, Bram goes for first, so the player directs the fight by where they look.
- **Bram breaks guards.** His heavy strike staggers a shield-bearer and drops their shield for a moment, opening the shot.
- **Bram holds attention.** Enemies near him prefer him as a target, which is what lets the hero stay at range.
- Later recruits each bring one such trait of their own.
- **Squad size.** The hero starts with Bram alone. In Tallowmere the squad can grow to three companions, as Leadership rises and people become available.

Impact:

- A very brief freeze on every solid hit, longer on a critical strike.
- A small camera shake on heavy hits given and taken.
- A short slow-motion moment when the last defender of a place is beaten.
- Distinct sounds for a normal hit, a weak-point hit, a critical strike, a blocked arrow, and a broken guard.
- All of these are tunable and can be turned down in settings.

## 6. Progression

Three aims govern this section. The player should never feel they missed a perk. The player should never run out of things growing. And growth should track the story, so that finishing the game and mastering the character happen together.

### Skills

Skills level by use. There are no classes and no overall character level; the hero's standing is their rank (see Apprenticeship).

| Skill | Levels from | Each level gives |
| --- | --- | --- |
| Archery | Arrow hits, more for range, weak points, and perfect draws | Bow damage, draw speed |
| Melee | Short-blade and knife hits, more for criticals after a perfect dodge | Blade damage, swing speed |
| Toughness | Perfect dodges, fights survived, places freed | Max HP, damage reduction |
| Stealth | Passing an enemy unnoticed, marks, strikes on unaware enemies, knockouts | Harder to notice, stronger first strike, longer marks |
| Leadership | Places freed with a squad, bandits won back, companions kept standing | Squad size, recruit quality |
| Gathering | Foraging, hunting, cutting wood, mining ore, fishing | Better yield, rarer finds, faster gathering |
| Fletching | Making arrows | More arrows per batch, better quality |
| Cooking | Cooking at campfires | Food that heals more and adds short bonuses |
| Smithing | Crafting and upgrading gear at the Forge | Higher gear tiers, better craft quality |

Rules:

- **Levels run 1 to 50 across the whole game.** Early levels come quickly and later ones slowly.
- **Each region has a cap.** In Tallowmere no skill passes 20. The castle region raises the cap, and so on, with 50 reachable only in the last region. Nothing can be maxed early.
- **Experience comes from accomplishments, never from time passing or from taking harm.** No skill levels from standing near enemies, from being hit, or from waiting.
- **Harder feats teach more.** A long shot to a weak point is worth far more than a close body shot.
- **Repetition pays less.** Doing the same trivial thing to the same target earns less each time, down to nothing.
- **Catch-up.** A skill well below the hero's highest levels faster, so changing playstyle late is not a slog.
- **Overflow is never wasted.** Experience earned in a skill that is at the region cap goes into mastery of that skill's perks (see Perks).
- **Reaching the region cap in a skill** earns a keepsake from someone in the valley: the smith's old hammer for Smithing, a fletcher's knife for Fletching. Keepsakes go on display in the house.

### Apprenticeship

The hero's rank is Apprentice, then Scout, then Warden of the valley. Rank is earned by passing trials Hesper sets, not by experience points. Trials are optional: the valley can be finished as an Apprentice, but each trial teaches a perk and each rank gives more perk slots. Each trial teaches one part of the scout's craft and ends with a single dry line from Hesper, on failure as well as success.

| Trial | For rank | What the hero does | What it teaches |
| --- | --- | --- | --- |
| The Long Shot | Scout | At Wren's practice ground, hit the far target three times from the marked stone | The arc of the bow at range |
| The Trail | Scout | Hesper walks into the forest and says to find her. Follow the signs on the ground to the firefly grove, where she is waiting | Reading the ground |
| The Count | Scout | From the signal hill, mark every defender of an enemy-held place without being seen, then report. If one is missed, she says which | Looking before moving |
| The Quiet Lantern | Warden | Free a place without its alarm bell being rung | Controlling a fight |
| The Night Road | Warden | Cross the valley from the lake to Wick at night, past patrols, without being noticed once | Moving unseen |
| Hesper's Shoulder | Warden | Sneak up on Hesper and touch her shoulder. She has the sharpest senses of anyone in the game | Everything |

Hesper's Shoulder is meant to be failed many times, each with a different line ("I heard you at the gate."). On success she does not turn around. She says "Hm. That'll do," which is the highest praise she gives anywhere in the game, and the hero is a Warden.

Rank shows on the hero's cloak: plain grey for an Apprentice, forest green for a Scout, deep blue for a Warden. The Warden's cloak is Hesper's own, handed over.
### Gear and squad

- **Gear tiers** come from materials: bronze, iron, steel, then higher tiers. Gear is crafted or looted, and equipped gear is visible on the character model where the asset pack allows.
- **Squad:** recruits have their own level, perks, and gear slots (see Companions). Recruiting and developing them is the collecting layer.

### Perks

- **Every perk changes how the hero plays.** A perk gives a new action or changes a rule. Plain number increases belong to skill levels and are never perks.
- **Perks are earned from the story more than from levels.**
  - *Levels:* a few basic perks at fixed levels in each skill.
  - *Trials:* each of Hesper's trials teaches a perk tied to what it tested.
  - *People:* those who come home teach theirs, including the smith, the fisher, and some bandits won back.
  - *Story moments:* lighting the first lantern, surviving the turn, beating Stane.
  - *Secrets:* a few are in notes found off the path.
- **Nothing is missable.** Every perk has a fallback source. If the person who would have taught it is dead or gone, Hesper or a found note teaches it later at a higher cost. No choice the player makes can remove a perk from the game.
- **Once earned, a perk is kept for good.** There are no either-or choices between perks.
- **Slots.** Only equipped perks are active. An Apprentice has 3 slots, a Scout 5, a Warden 7. Perks are changed at a campfire, at Hesper's, or at home, never in the field.
- **Saved sets.** Up to three named sets of perks can be saved and switched between in one action.
- **Perk mastery.** Each perk has three ranks, earned by using it while equipped and by overflow experience from its skill. Each rank strengthens the perk or extends what it does. A perk the player has lived with is much stronger than one just slotted, so commitment is rewarded without anything being locked away.
- **The perk ledger** lists every perk that exists in the current region. Earned perks show in full. Unearned ones show a name and a hint about where to look ("Someone by the lake knows more about patience"). The player always knows what is out there.
- **About 24 perks in Tallowmere**, spread across the skills. Fewer and better is the rule. Capstone perks, the strongest in each skill, sit at level 50 and so arrive in the last region.
- Examples of the kind of perk wanted:
  - *Archery:* arrows pin a fleeing runner in place; at rank 3 a perfect-draw arrow passes through to a second enemy.
  - *Stealth:* sprinting through tall grass makes no noise; standing still at night hides the hero beyond a few paces.
  - *Fletching:* recovered arrows never break; a second quiver for one special arrow type.
  - *Leadership:* Bram can be sent to a marked spot; a whistle calls the squad to the hero at once.

### Pacing

Growth must track the story. These targets are enforced by a test, not left to tuning by feel.

| Story beat | The two skills the player uses most | Perks earned | Slots |
| --- | --- | --- | --- |
| First lantern lit (the Mill) | 4 to 7 | 3 to 5 | 3 |
| The Forge freed | 8 to 12 | 7 to 10 | 3 to 5 |
| After the turn, the Mill retaken | 13 to 16 | 11 to 15 | 5 |
| Facing Stane | 18 to 20 | 16 to 20 | 5 to 7 |
| Valley finished with every secret found | 20 | 24 | 7 |

A player who rushes arrives at Stane under-levelled but able to win with skill; a player who explores arrives at the cap with mastery still growing. Neither should reach the cap in their main skills before the turn.

### Seeing it

- **Skills screen** on `K`, with three tabs: Skills (a bar per skill, the current level, what the next level gives, and the region cap), Perks (slots, saved sets, each perk's mastery rank, and the perk ledger), and Recipes.
- **Levelling up** plays a quiet chime and shows one line on screen. Nothing interrupts play. A new perk gets a slightly longer moment and its own sound.

### Companions

Bram and later recruits level by fighting alongside the hero, under the same region cap. Each has three perks of their own, earned at fixed levels and always active, with no slots to manage.

### Loot

What the player finds, and where:

- **Enemies carry what you see.** Whatever a bandit visibly wears or holds can be taken from them once they are down: the brute's helmet, the shield-bearer's shield, an archer's quiver. A place's loot can be sized up from a ridge before going in. Knocked-out and spared bandits keep their personal things; only their weapons are taken.
- **Each enemy-held place has a strongbox** holding the share Stane took from the valley: gold, materials, and stolen goods. It opens only once the place is freed.
- **Stolen goods** belonged to someone: a family's candlesticks, the miller's tools, a wedding ring, a child's carved horse. Each is marked with whose it was. Returned to its owner, or to the family's house if they have not come home yet, it gives a reward, a line of thanks, and a rise in the valley recovery level; some families return only once their thing is back. It can instead be sold for gold. This is the link between looting and the story.
- **Unique items** are placed by hand, each with a name, one special property, and a line of history. Wren's bow is the first. There are few of them, and none are random.
- **Chests, breakables, and cut grass** give small things: coins, arrows, food, common materials.
- **Quality:** common, fine, or masterwork, on top of the material tier. Quality is a small set of fixed bonuses, not random number rolls.
- **Picking up:** coins, arrows, and gathered materials are collected by walking over them. Bodies, containers, and stolen goods need `E`.

### Gathering

- **Foraging:** herbs, mushrooms, fruit from the wild orchard, honey from its hives.
- **Hunting:** meat, hides, and feathers from deer and rabbits; fish from the lake.
- **Wood:** certain trees give staves for bows and shafts for arrows.
- **Ore:** veins in the hills and by the waterfall give copper and tin for bronze, then iron.
- Gathering spots regrow or refill after a few in-game days. Each is visible in the world as what it is; there are no glowing markers.
- Everything gathered trains the Gathering skill.

### Crafting

- **Fletching** at any campfire: shafts, feathers, and heads become arrows. Standard arrows from wood, feathers, and bronze or iron heads; blunt arrows by padding a standard one; fire and whistling arrows from rarer materials. A scout who fletches rarely runs dry.
- **Cooking** at any campfire: raw food and foraged ingredients become meals that heal more and give a short bonus.
- **Smithing** at the Forge once the smith returns: blades, arrowheads, armour pieces, and upgrades from material to material and from common toward masterwork.
- Recipes are learned by doing, by finding notes, and from the people who return. Known recipes are listed on the skills screen.

### Carrying and keeping

- **A carry limit**, counted in weight. Over the limit the hero cannot sprint. Arrows, food, and materials all weigh something; gold does not.
- **Inventory** on `I`, laid out as in section 10.
- **Storage:** a chest at Hesper's house from the start, unlimited.
- **Home.** After the valley finale the Fairlow house is the hero's. It has the storage chest, a bed to rest in, and racks, shelves, and a mantel where weapons, unique items, and trophies can be placed and seen. The house fills up as the collection grows.

### Trade

- Traders are among the people who return: a general trader early, then others tied to places and trades.
- Prices improve and stock widens as the valley recovery level rises.
- Gold comes from strongboxes, selling, and the income from freed places.

Exact XP curves, perk lists, recipes, weights, prices, and tier stats are tuning, not design. Keep them in data.

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
- **Input rules for the browser.** The game runs in a tab, and several keys belong to the browser first.
  - `Esc` is consumed by the browser to release the mouse, and the game may never see it. Treat losing pointer lock as the pause signal, and resume by clicking.
  - Suppress the browser default for `Tab`, right mouse, the mouse wheel, and the backtick while the game has focus.
  - Never bind anything to `Ctrl`, `Alt`, or `Cmd` combinations: with `W` held, `Ctrl` closes the tab.
  - Losing window focus pauses the game and releases all held keys.
- **Errors are captured, not lost.** Uncaught errors and unhandled promise rejections are recorded with a timestamp and shown as a small notice, not a blank screen. A rolling in-memory log keeps the last few hundred events: errors, warnings, places entered, fights started and ended, captures, and frame-rate drops. A "Copy debug report" button in the pause menu and the tuning panel copies that log, the build commit, the browser, the save version, and current settings to the clipboard.
- **The live page is tested.** The deploy workflow ends with a headless-browser smoke test that loads the built page, starts a game, runs for several seconds, and fails on any console error or failed request.
- **Pure logic is testable.** Damage, hit detection, AI decisions, awareness, pathfinding, height, XP, loot, and income are pure functions with unit tests. Keep headless bot tests that clear a camp.

## 8. Milestones

Each milestone ends deployed to Pages and playable. Do not start the next one until the current one is approved, unless a build message says otherwise.

1. **Combat prototype.** Done: a third-person hero with blade and bow, telegraphed enemies, dodge, waves, the tuning panel, and the camera fade.
2. **Foundations.** The engine upgrade, the hooded scout as the hero, sound effects, showcase mode, error capture and the debug report, the smoke test, the input rules, and the game's name on the page. Task 002.
3. **The world.** Tallowmere, about 800 m across: seeded terrain with `heightAt`, chunked scenery, sky and day-night cycle, wind, water, the boundary, horizon landmarks, ambient wildlife, ambient sound, Wick in its abandoned state with Hesper's lit window, the first-person toggle, the pause menu and settings, and tour mode. No enemies. This milestone must clear the first-look bar in its task. Task 003.
4. **Places and fights.** The Mill, the Forge, and the Watch-house; stealth, scouting, alarm bells, and the stealth animals; Bram, squad orders, and pathfinding; the lantern ritual and restoration; the ten places off the path; boar and wolves; campfires, healing, the compass, and the map. Items are simple counts at this stage. The prototype arena and waves are removed. Task 004.
5. **Combat depth.** Everything in section 5 under The bow, Close combat, How enemies fight, Unit types, Fighting alongside Bram, and Impact. Task 005.
6. **Progression, loot, and crafting.** Everything in section 6, including smithing and trade. Task 006.
7. **First five minutes and the valley finale.** The title screen, onboarding prompts, saves, the turn, the Stane fight, and the finale at the Fairlow house (section 9). Built last so that it is tuned once, against the finished systems. Task 007.
8. **Home and holdings.** The Fairlow house as the hero's home with its displays, income from freed places, more recruits, wounded companions, and places that restock.
9. **Cloud saves.** Supabase auth and save sync.
10. **More world.** A second region, the horse (section 9), fast travel between owned towns, more unit types, more secrets, more music.

## 9. Story

Keep every name in data, never in code.

### Names

| Name | Who or what | Why |
| --- | --- | --- |
| Tallowmere | The valley | Tallow is what candles were made from; a mere is a lake |
| Wick | The village | An old word for a small settlement, and the part of a candle that burns |
| The Crown | The old kingdom | Never named; people only say "the Crown" |
| Hesper | The Lamplighter. An old woman (she) | The old name for the evening star, the first light at dusk |
| Captain Edric Stane | The Captain (he) | "Stane" is an old word for stone: the one who did not move |
| Bram | The friend (he) | Short and sturdy, like him |
| Wren | The hero's parent | A small bird that returns to the same nest. Never state whether Wren is the hero's mother or father; avoid pronouns for Wren entirely |
| Fairlow | The hero's family name | On the marker stone and the house |
| The hero | Unnamed and silent | Others call the hero "the apprentice" or "Wren's child" |

### Premise

- A generation ago the Crown fell apart. One night its soldiers left Tallowmere without a word. The roads went unguarded, bandits moved in, and most families fled.
- The hero was carried out of the valley as a small child and grew up elsewhere on stories of it. Now grown, the hero has come home with a friend to a village that is half empty.
- The Fairlow house still stands in Wick, dark and boarded up.
- The hero takes the valley back one place at a time. Each place freed brings people home.

Tone: warm and hopeful, with a quiet sadness for what was lost. People can die in fights, but there is no gore and no cruelty, and the game never celebrates a death. It does quietly reward bringing someone home. The enemies are people, not monsters.

### The people

- **Hesper, the Lamplighter.** The hero's mentor. Once a scout of the Crown's guard, one of the wardens who watched the valleys. Every night for a generation she has kept one window lit so that anyone coming home could find the way. That light is visible across the valley at night and is the first thing the hero walks toward. She takes the hero on as an apprentice and teaches the scout's craft: the bow, patience, and not being seen. She also teaches the lantern ritual.
  - Voice: dry, short, never wastes a word. She expects a great deal and praises rarely. "You were loud. Do it again." Her highest praise is "Hm. That'll do."
- **Captain Edric Stane.** A former officer of the Crown's guard who stayed when the army left and decided the valley was his to hold. He rules from the Watch-house and takes a share of everything, and in his own eyes he is the only reason anyone here survived. He is not entirely wrong. His banners fly over every place the hero has not freed. He and Hesper served together, and each thinks the other chose wrongly. He is defeated, not killed.
  - Voice: tired, certain, formal. "I kept them fed for twenty winters. What did your beacon ever do for them?"
- **Bram, the friend.** A childhood friend from the town where the hero grew up, who would not let the hero go alone. A sword-and-shield fighter: loyal, blunt, and quick with a joke, who holds the line while the hero shoots. He is the first squad member, present from the start, and the hero's opposite in every way that makes them a good pair. His lines at campfires carry most of the game's humour.
  - Voice: cheerful and plain. "You sneak about. I'll stand here and get hit. It's a good system."
- **The hero** is silent and unnamed, so the player can be them. They arrive as nobody in particular and become Hesper's apprentice.
- **The horse.** Arrives with the second region: small, shaggy, sturdy, and opinionated, with a name and a personality shown through how it behaves. It is for travel, not for fighting.

### The question, and what the first valley reveals

The question the player carries: why did the soldiers leave overnight, and what became of Wren?

By the end of the first valley the player can have learned, in fragments and never in one speech:

- The Crown had a beacon on the castle. When it was lit, every soldier in every valley was sworn to march to the castle at once.
- It was lit that night. The valley's guard saw it and were gone by morning.
- Hesper was on patrol beyond the ridge, where the beacon cannot be seen, and came home to an empty garrison. She has believed ever since that Stane deserted.
- Stane saw the beacon and chose not to go, because someone had to stay with the people. He broke his oath to keep faith with the valley.
- Wren was a soldier of that guard and Hesper's apprentice before the hero. Wren answered the beacon and never came back. Hesper says the window is lit for anyone coming home. It has been lit for one person.

Sources of these fragments: the patrol hut, the signal hill, the soldiers' road, the supper table, the family markers, Wren's practice ground, the fisher, Hesper's lines as trust grows, and Stane's account when he yields.

### The answer (never reveal in the first valley)

This is for writers only, so every fragment points the same way. No character in the first valley knows it, and nothing the player finds may state it.

- The Crown was bankrupt. The beacon was lit on the king's order to gather the whole army at the castle, not to fight, but to be marched away and handed to a foreign power as payment of the Crown's debt.
- The soldiers were not killed. They were sold. Some may still be alive, far away. Wren may be among them.
- The castle, in the second region, is where the player learns this. What lies beyond it is where the story can go next.

### Places with a past

Every enemy-held place used to be something, and freeing it brings that thing and its person back. Story and progression are the same act.

| Place | Held as | What it was | Who returns | What the player gains |
| --- | --- | --- | --- | --- |
| The Mill | Bandit camp, with geese | The valley's mill | The miller | Food: sold in Wick and found in the mill |
| The Forge | Bandit camp | The valley's forge | The smith | Crafting and gear upgrades |
| The Watch-house | Stane's outpost | The Crown guard's post | Nobody at first | The road toward the castle |

Each place looks like what it was, under what the bandits have done to it: a mill with a stopped wheel, a cold forge. Once freed, the wheel turns and the forge is lit. More places follow the same pattern in later regions. Every place is defined in data with its past, its person, and its reward.

### The lantern ritual

A place is not freed when the last defender falls. It is freed when the hero lights its lantern.

- Each place has an unlit lantern. After the defenders are cleared, the hero interacts with it (`E`) to light it. Stane's banner comes down, the crows leave, and the place is captured.
- A short melody plays. It is the same melody every time, with one more instrument for each place freed, so it grows fuller across the game.
- A lit lantern can be seen from a distance at night, and wolves will not come near it. As the valley is freed, the night fills with lights and becomes safer.
- Hesper lights the hero's first lantern alongside them, to teach it.

### The turn

The valley does not only get better.

- After the hero frees the second place, Stane strikes back. That night the first place the hero freed is retaken: its lantern goes dark, its person flees to Wick, and what it gave the player is lost until it is freed again.
- The retaken place is held by stronger defenders than before.
- Hesper's line the next morning is the low point of the story.
- Retaking it relights the lantern and opens the way to the Watch-house.

### The world tells the story

There is no quest log and no long dialogue. The story is carried by:

- **Restoration.** Wick starts with boarded windows, empty fields, few people, no animals, and one lit window. With each lantern lit, and with each bandit won back, more villagers return, buildings are repaired, fields are worked, stalls open, animals come back, lanterns appear on the family markers, and more windows glow after dark. The village music gains an instrument with each one.
- **Stane's banners and the crows**, which leave place by place.
- **Villagers** who say one or two short lines that change as the valley recovers.
- **The ten places off the path** (section 4), each a fragment. Text is three sentences at most.
- **Recruits.** Each squad member after Bram is a named person with a home in the valley and a two-sentence reason for joining. Some become available only after a specific place is freed.
- **Landmarks** on the horizon that the fragments refer to, above all the dark beacon on the castle.

Restoration is tracked as a single valley recovery level in the game state. It rises with each lantern lit and falls when a place is retaken. Scenery, villager count, animals, lights, banners, and music read from it.

### The valley finale

1. The hero takes the Watch-house and faces Stane, who is the hardest fight in the valley. Beaten, he yields and tells the hero what he saw that night: the beacon, and his choice. It deepens the question; it does not answer it.
2. The hero lights the Watch-house lantern. Every place in Tallowmere is free.
3. That night Wick holds a festival: lanterns, the full melody, every returned villager gathered.
4. Hesper leads the hero to the Fairlow house. The hero lights its window. It is the last dark window in the village, and the image the game is named for. The wren in the eaves sings.
5. In the morning the road toward the castle is open and marked on the map. The Fairlow house is now the hero's home (section 6).

## 10. Interface

- **Title screen:** the game's name over a slow view of the valley, with Continue (when a save exists) and New Game. New Game asks for confirmation before replacing a save.
- **Pause menu** (`Esc`): Resume, Settings, Controls, Quit to title. The simulation stops while it is open.
- **Settings:** mouse sensitivity, invert vertical look, field of view for each camera view, camera shake and hit-freeze strength, master, music, and effects volume, and graphics quality (low, medium, high: shadow quality, scenery density, view distance). Settings are saved in the browser separately from the game save.
- **Onboarding without a tutorial level.** A short prompt appears the first time each control is needed (move, look, sprint, crouch, mark, attack, switch weapon, change arrow, dodge, lock on, throw a knife, change view, eat, squad order, map, inventory, skills) and never again once used. Hesper points the hero toward the nearest camp.
- **HUD:** hero health, equipped weapon, arrow count and type, knife count, food count, squad order, lock-on marker, compass strip. Keep it small; hide what is not needed outside combat.
- **Inventory screen** (`I`). The world pauses and the mouse is freed while it is open.
  - *Left:* the scout as they currently look, with equipment slots for bow, blade, knives, cloak, and armour pieces. Clicking a slot shows what can go in it.
  - *Top:* tabs, one per kind of thing: Weapons, Arrows, Armour, Food, Materials, Stolen Goods, Keepsakes (unique items).
  - *Middle:* a grid of items, each an icon with a count. Icons are simple and generated from each item's model or a small drawn set; no item may appear without one.
  - *Right:* a detail panel for the selected item: name, what it does, weight, value, quality, and a comparison with what is equipped. Stolen goods show whose they were.
  - *Bottom:* a weight bar showing the current load against the carry limit.
  - Sort by type, weight, or value. A dot marks anything picked up since the inventory was last opened.
  - One food can be marked as the favourite; `F` eats that one.
  - Keepsakes cannot be sold, and dropping one asks for confirmation.
- **Loot window** (`E` on a body or container). A small list of what is inside, with each item's weight. Tap `E` to take the selected item; hold `E` to take everything. An item that would put the hero over the carry limit is shown in red before it is taken. The world does not pause, so looting during a fight is a risk.
- **Storage screen** (the chest at Hesper's, and later the Fairlow house). Two panels side by side: carried and stored. Clicking an item moves it across. A "store all materials" button.
- **Display in the house.** Racks, shelves, and the mantel are slots: interacting with one opens a list of items that fit it, and the chosen item appears there in the world.
- The tuning panel (backtick) stays as a developer tool and is not part of the player-facing menus.

## 11. Deferred ideas

Not in scope until the core game works. Do not build these unprompted.

- Magic as a third combat style
- Blocking and parrying with a shield
- Mounted combat
- Swimming and climbing
- Quests, a quest log, branching dialogue, and cutscenes
- Weather
