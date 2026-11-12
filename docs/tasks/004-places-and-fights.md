# 004: Places and fights (milestone 4)

Status: open

## Goal

Put people, danger, and purpose into Tallowmere: the three enemy-held places, the scout's way of taking them, and the lantern that frees them. Scoped in `GAME_DESIGN.md` section 8, milestone 4. Start only after task 003 has passed its review.

## Build in four steps

Open a PR, merge, and deploy after each step, and log each in `docs/status.md`.

### Step 1: The simulation moves into the world

- The world simulation replaces the arena: fighters stand on `heightAt`, only those near the hero are simulated, and arrows are blocked by terrain and scenery.
- Grid-based A* pathfinding in `src/core`, with a test for a blocked straight line.
- Bram as the one starting companion: follows the hero, stays back while the hero is crouched, fights, and obeys the `Q` orders (follow, hold).
- Remove the prototype arena, its waves, and its URL flag.

### Step 2: Places and stealth

- The Mill, the Forge, and the Watch-house in data, each with its past, its person, its reward, a named leader, defenders, patrol routes, an alarm bell, an unlit lantern, and Stane's banners. Each looks like what it used to be.
- Stealth and scouting from section 5: the unaware, suspicious, and alert states with markers, the noticing rules as pure tested functions, marking through the bow zoom, the bonus for striking an unaware enemy, and the alarm bell with reinforcements.
- The stealth animals from section 4: crows over held places, startled birds, the Mill's geese, and the fox.
- A few villagers in Wick with one or two short lines each, and Hesper with a first set of lines.

### Step 3: The lantern and restoration

- The lantern ritual from section 9: `E` to light it once the defenders are cleared, the banner comes down, the crows leave, the melody plays with one more instrument per place freed, and the lantern is visible from a distance at night.
- The valley recovery level, and what reads from it: each place restored (the mill wheel turns, the forge is lit), and Wick recovering (villagers, repairs, worked fields, lit windows, animals, lanterns on the family markers).
- Hesper lights the first lantern alongside the hero.
- In this task the Watch-house is captured like the other places. Stane, the turn, and the finale are task 007.

### Step 4: The valley's corners

- The ten places off the path from section 4, each with its content and its fragment of the story as listed in section 9.
- Boar in the deep forest, and wolves at night that will not approach a lit lantern or campfire.
- Campfires: at least three, with resting and waiting until dusk or dawn. Cooking arrives in task 006.
- Healing by food and by resting, hunting with the protected animals unharmable, chests, breakables, and cuttable grass.
- The compass strip, the map on `M` with discovery, and responsive music.
- Extend tour mode to the three places and the ten secrets.

## Items at this stage

The full inventory, gear, and crafting are task 006. Until then keep items as simple counts with no screen: food, arrows, gold. Wren's bow is a flat upgrade to the hero's bow. The miller's food appears as a supply in Wick once the Mill is freed. Build these so task 006 can replace them without rework.

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

## Done when

- All four steps are merged and deployed and the balance tests pass.
- Then continue to task 005.
