# Words on screen

Everything the game itself says: menus, prompts, notices. Use these exactly as written.

## The voice of the screen

- Plain and quiet. Say what happened, in as few words as it takes.
- No exclamation marks. No "Congratulations," "Quest complete," "Level up," or "Achievement."
- Name things by what they are: "The Mill is free," not "Location captured."
- Sentence case everywhere. Key names in a small box, as on a keyboard.
- Never tell the player what to do next. A prompt says how to do a thing at the moment they are trying to do it, once.

## Title screen

- The name: **Every Lit Window**
- Continue
- New game
- Settings
- Under New game, when a save exists: "This will replace your saved game. Start again?" with **Start again** and **Keep my game**.

## Pause menu

- Resume
- Settings
- Controls
- Copy debug report
- Return to title

After Copy debug report: "Copied. Paste it wherever you're reporting the problem."

## Settings

**Difficulty**

- Lantern: "For the valley and its story. Enemies are slower to notice you and hit less hard."
- Dusk: "The game as it was made."
- Moonless: "For a hard stealth game. Enemies sense more, hit harder, and call more help. Arrows and food are scarce."
- Beneath all three: "You can change this at any time. Nothing is locked behind it."

**Aids**

- Awareness markers
- Minimal display: "Hide the compass, health bars, and damage numbers until they matter."
- Crouch: hold / toggle
- Sprint: hold / toggle
- Character tones

**Look**

- Mouse sensitivity
- Invert vertical look
- Field of view, third-person
- Field of view, first-person
- Camera shake
- Hit pause

**Sound**

- Master
- Music
- Effects

**Text**

- Size
- Speed

**Graphics**

- Low, Medium, High

## First-time prompts

Each appears once, the first time it is relevant, and never again after the player has done the thing.

| When | Prompt |
| --- | --- |
| The game begins | `W` `A` `S` `D` to walk. Move the mouse to look. |
| After a few seconds of walking | Hold `Shift` to run. |
| First approach to an enemy place | `C` to crouch. Crouched and still, you are hard to see. |
| First time an enemy is in view while the bow is out | Hold the right mouse button to look closer. Keep it on someone to mark them. |
| First time the bow is drawn | Hold to draw. Let go to loose. |
| First fight | `1` for the blade, `2` for the bow. |
| First enemy wind-up | `Space` to dodge. |
| First time behind an unaware enemy | `E` to knock out. Attack to kill. |
| First special arrow picked up | Scroll to change arrows. |
| First knife picked up | `R` to throw a knife. |
| First fight with more than one enemy close | `Tab` to keep your eyes on one of them. |
| First time Bram is in the way of a stealth approach | `Q` to tell the company to hold or follow. |
| First time a non-lethal option matters | `T` to have the company take them alive. |
| First food picked up, when hurt | `F` to eat. |
| First place discovered | `M` for the map. |
| First item picked up | `I` for what you're carrying. |
| First level gained | `K` for what you've learned. |
| First time standing in the open for a while | `V` to see through your own eyes. |
| First campfire | `E` to rest. You can cook, wait for dusk or dawn, and change your perks here. |
| First conversation with something to show | You can show people what you've found. |

## Notices

Short lines that appear and fade. `{…}` is filled from data.

**Places**

- Discovering a place: its name alone, for example "The Mill."
- Discovering a place off the path: its name alone, for example "The firefly grove."
- The defenders are beaten: "Light the lantern."
- The lantern is lit: "{place} is free."
- A place is retaken: "{place} has gone dark."
- Entering Wick at night: "{count} of 16 windows lit."
- When the Fairlow window is lit: "Every lit window." Shown once, and only if all sixteen households are home. Otherwise nothing is shown.

**People**

- A household returns: "{name} have come home." For one person: "{name} has come home."
- A bandit stays: "{name} has stayed."
- A bandit leaves or goes back to Stane: nothing is shown. Hesper tells it.
- A companion joins: "{name} is with you."
- A companion falls: "{name} is down."
- A stolen thing returned: nothing is shown. The person's line is enough.

**Growing**

- A level gained: "{skill} {level}"
- A skill reaches the cap: "{skill} {level}. That is as far as this valley can teach you."
- A perk earned: "Learned: {perk}"
- A perk gains a rank: "{perk}, deepened"
- A trial passed: nothing is shown. Hesper's line is enough.
- A rank earned: "Scout." or "Warden."

**Carrying**

- Over the limit: "You're carrying too much to run."
- An item that would put you over, in the loot window: "Too heavy with the rest."
- Arrows recovered: "{count} arrows recovered"
- An arrow broken: nothing is shown.
- The quiver is empty: "No arrows."

**Fighting**

- The alarm bell rings: nothing is shown. The bell is enough.
- An enemy surrenders: nothing is shown. They kneel.
- A place's nerve breaks: "They've had enough."

**Time**

- Waiting at a campfire: "Dusk." or "Dawn."
- Resting in Wick: "Morning."

**Saving**

- "Saved."
- If saving fails: "Couldn't save. Your progress is safe for now, but don't close the page. Copy a debug report from the pause menu."

**Errors**

- "Something went wrong. The game is still running. You can copy a debug report from the pause menu."

## When the hero falls

No "You died." The screen dims and one line appears, then the hero wakes at the nearest owned place.

- Ordinarily: "You wake at Hesper's door. Some of your crowns are gone."
- At a freed place other than Wick: "You wake at {place}. Some of your crowns are gone."
- In the Stane fight: "You get up."
- To wolves: "You wake at Hesper's door. She doesn't ask."

## Screens

**Inventory tabs:** Weapons, Arrows, Armour, Food, Materials, Stolen goods, Keepsakes.

**Skills screen tabs:** Skills, Perks, Recipes, Notes.

- An unearned perk in the ledger shows its name and its hint, nothing else.
- Empty perk slot: "Empty"
- Changing perks away from a rest site: "You can change these at a campfire, at Hesper's, or at home."
- Saved sets: "Save as…", "Use"
- Notes headings: "Found" and "Told."

**Loot window:** "Take" and "Take all." For a spared or knocked-out bandit: "You leave them what's theirs."

**Storage:** "Carrying" and "Stored." The button: "Store all materials."

**The company screen:** "With you" and "In Wick."

**Trade:** "Buy" and "Sell." A stolen thing in the sell list shows whose it is: "This is {name}'s."

**Rebuilding Wick:** each project shows its name, its cost, and one line.

| Project | Line |
| --- | --- |
| Lanterns on the east road | "Wolves won't cross a lit road." |
| Lanterns on the mill road | "So the Marrins can get home after dark." |
| The well | "It has had a dead tree across it for nine years." |
| The bridge to the Forge | "Two planks left. Aldric uses the ford and complains." |
| The market stalls | "Somewhere for people to stand and argue about prices." |
| The inn | "Bess Hollin will tell you what it needs. At length." |
| The village bell | "Amos Rudd has kept the rope." |

## The map

- Places not yet discovered are not shown.
- A freed place shows a small lit lantern; a held place shows Stane's banner.
- In Wick, the window count is shown as sixteen small squares, lit or dark, and a seventeenth set apart.
