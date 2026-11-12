# 004: Places and people (milestone 4)

Status: open

## Goal

Put people, danger, and purpose into Tallowmere: the three enemy-held places, the scout's way of taking them, and the lantern that frees them. Scoped in `GAME_DESIGN.md` section 8, milestone 4. Start only after task 003 has passed its review.

## Build in five steps

Open a PR, merge, and deploy after each step, and log each in `docs/status.md`.

### Step 1: The simulation moves into the world

- The world simulation replaces the arena: fighters stand on `heightAt`, only those near the hero are simulated, and arrows are blocked by terrain and scenery.
- Grid-based A* pathfinding in `src/core`, with a test for a blocked straight line.
- Bram as the one starting companion: follows the hero, stays back while the hero is crouched, fights, and obeys the `Q` orders (follow, hold).
- Remove the prototype arena, its waves, and its URL flag.

### Step 2: Places and stealth

- The Mill, the Forge, and the Watch-house in data, each with its past, its person, its reward, and its leader and defenders exactly as named in `docs/writing/bandits.md` (with their loyalty, former trade, habits, and overheard lines), an alarm bell, an unlit lantern, and Stane's banners. Each looks like what it used to be.
- A day at an enemy-held place, from section 5: the schedule by time of day, patrol routes, meals, guard changes, sleeping and night watch with torches, two or three habits per place, the reactions (bodies found, missing guards, extra watch after a place falls), and the tax cart on the road. Schedules, routes, and habits are data, and the schedule logic is pure and tested.
- Stealth and scouting from section 5: the unaware, suspicious, and alert states with markers, the noticing rules as pure tested functions, marking through the bow zoom, the bonus for striking an unaware enemy, and the alarm bell with reinforcements.
- The stealth animals from section 4: crows over held places, startled birds, the Mill's geese, and the fox.

### Step 3: Speech and the households

- How people speak, from section 10: lines above heads, conversations with the bottom box, Show, character tones from the melody, and text settings. Overheard lines at enemy places use the lines-above-heads form and appear only while the hero is unnoticed.
- The sixteen households of Wick, as data, exactly as written in `docs/writing/households.md`: each household's trigger, house, trade, daily routine, lines, and what it gives, and the stolen things with their owners.
- Daily life: villagers who are home wake, work, gather at the well at dusk, and go home at night, when their window lights.
- The window count, shown on entering Wick at night and on the map.
- Hesper and Old Maren present from the start, with conversations. Every named character's lines are in `docs/writing/`; use them as written. Draft only what `docs/writing/README.md` says is left to you.

### Step 4: The lantern and restoration

- The lantern ritual from section 9: `E` to light it once the defenders are cleared, the banner comes down, the crows leave, the melody plays with one more instrument per place freed, and the lantern is visible from a distance at night.
- The lantern melody from `docs/writing/melody.md`, gaining a layer with each place freed, and Wick's theme gaining layers with lit windows.
- Restoration: each place restored (the mill wheel turns, the forge is lit), households coming home when their trigger is met, and Wick changing with them (repairs, worked fields, lit windows, animals, lanterns on the family markers). The valley recovery level is derived as section 9 describes. Triggers that depend on later tasks (stolen goods, bandits won back, projects) are wired but will only fire once those systems exist.
- Hesper lights the first lantern alongside the hero.
- In this task the Watch-house is captured like the other places. Stane, the turn, and the finale are task 007.

### Step 5: The valley's corners

- The ten places off the path from section 4, each with its content and its fragment of the story as listed in section 9.
- Boar in the deep forest, and wolves at night that will not approach a lit lantern or campfire.
- Campfires: at least three, with resting and waiting until dusk or dawn. Cooking arrives in task 006.
- Healing by food and by resting, hunting with the protected animals unharmable, chests, breakables, and cuttable grass.
- The compass strip, the map on `M` with discovery, and the responsive music from section 4 (the pulse when enemies are suspicious or alert).
- Extend tour mode to the three places and the ten secrets.

## Items at this stage

The full inventory, gear, and crafting are task 006. Until then keep items as simple counts with no screen: food, arrows, gold. Wren's bow is a flat upgrade to the hero's bow. The miller's food appears as a supply in Wick once the Mill is freed. Build these so task 006 can replace them without rework.

**Inside** (section 4; `docs/writing/interiors.md`). The six layouts as reusable rooms, dressed from data. The Mill's ground floor and the Forge, as held and as freed. A household's house loses its boards and opens when the household comes home, with its people inside after dusk. Returned and sold stolen things shown or missing in their place. Enemies found inside come out to fight.

## Rules

- Nothing in the game may state or imply the answer in section 9 ("The answer"). Fragments reveal only what that section says the first valley reveals.
- Never use a pronoun for Wren, and never state whether Wren is the hero's mother or father.
- Use only original or CC0 audio and art.
- Meet the performance budgets in section 7 and report the measured numbers after each step.
- Attach tour-mode screenshots to every PR, at noon, dusk, and night.

## Balance

- The skilled bot frees the Mill in 60 to 150 s with 30 to 70% HP left.
- A blade-only bot that never dodges loses at the Watch-house.
- A stealth bot that marks, then strikes unaware enemies, frees the Mill taking less damage than the loud bot.
- A bot that lets the bell ring faces reinforcements and takes longer.
- A bot that attacks the Mill at night meets fewer waking defenders than one that attacks at midday.

## Done when

- All five steps are merged and deployed and the balance tests pass.
- A test proves each household comes home when, and only when, its trigger is met (for triggers available in this task), including the Pikes' return when Tobin was killed.
- Then continue to task 005.
