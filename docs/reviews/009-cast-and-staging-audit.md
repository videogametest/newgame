# Review 009: can we show what we wrote?

An audit of the writing and the design against the models and animations actually in the repo. Prompted by review 008: a miss that still frames could not show. Nothing here is a fault in merged work. It is a list of things nobody had checked.

## What we have

- **People:** six KayKit adventurers on one shared rig: Barbarian, Knight, Mage, Ranger, Rogue, Rogue (hooded). Each is built from separate parts: head, body, arms, legs, and a hat, helmet, cape, mask, or quiver that can be hidden.
- **Animations:** 81 clips in five sets: idle, walk, run, sneak, crouch, crawl, dodge, jump, melee attacks and block, bow, throw, interact, pick up, use item, hit, and death.
- **Not in the repo:** any sitting, lying down, sleeping, cheering, or dancing clip; any tool-use clip (hammering, digging, fishing); any animal that has been seen beside the people.

## 1. The cast

About 60 named people from six models.

| Need | Have it? | Way through |
| --- | --- | --- |
| Soldier, archer, brute, shield-bearer, runner | Yes | Rogue, Ranger, Barbarian, Knight, hooded Rogue. As the prototype already does |
| Ordinary villagers | Yes | Shown in the style test: hide hat, mask, cape |
| **Sixty people who do not share six faces** | **No** | Mix parts across models (any head on any body: 36 combinations) and add six to eight recoloured textures for hair, skin, and clothes. One data row per named person: head, body, palette, extras. Test: no two named people in the same place look the same |
| **Old people:** Hesper, Maren, Bertram, Hale, Amos, Edda, Old Tam, the fisher | **No** | Grey or white hair by texture, a slight forward stoop set on the spine bone in code, a slower walk, and for some a stick or shawl (a recoloured cape). Hesper: the hooded Rogue's body, hood up, mask off, grey. A hooded old scout is the right silhouette |
| **Children:** the Dunns' four, Pell Loomis | **No** | A villager at 0.6 scale. The style's large heads already read as young. Pim, the youngest bandit, at 0.85 |
| Stane | Yes | Knight, no helmet, cape on. He takes off the captain's cloak at the end: hide the cape |
| Rank shown on the hero's cloak | Yes | Recolour the cape: grey, green, blue |

**Style-test these before task 004:** one frame with Hesper, Maren, a child, and three mixed-part villagers beside the hero.

## 2. Things people are written doing

| Written | Clip | Verdict |
| --- | --- | --- |
| Lighting a lantern, ringing a bell, dusting a table, opening a chest | Interact, Use_Item | Fine |
| Feeding geese | Throw | Fine |
| Knocked out, asleep, dead | Death poses | Fine. One pose for all three; a knocked-out body should also breathe (a slow scale on the chest in code) |
| Surrender: "they kneel" | Crouching | Acceptable |
| Hammering at the anvil (Rafe, Bertram, Peg) | Melee chop, with a hammer in hand | Acceptable |
| Thatching a roof (Hew) | Crouch and Interact, placed on the roof | Acceptable |
| Carrying a lamp (Hesper to Maren's window) | Walk, with a prop in hand | Fine |
| **Sitting:** every campfire scene, Maren ("Sit down"), bandits eating at the fire, riding the cart | **None** | **Gap.** See below |
| **Fishing** (Wyll Carrow at dusk, the fisher) | **None** | **Gap** |
| **Dancing and the festival** | **None** | **Gap** |
| Dressing millstones (Dob) | None | Happens indoors, out of sight. Fine if the Mill is not entered; see section 3 |

**The gap is one download.** KayKit's free animation pack is believed to include further sets for the same rig, with sitting, lying, cheering, and tool use (hammering, digging, fishing). Only five of its sets are in the repo. Viktor: check the pack, confirm the licence, list the clips, and add what covers the three gaps. If they are not there, the fallback is a seated pose made in code from the crouch, and the festival as people standing and swaying. Report which.

## 3. Interiors: never decided

The design has never said whether buildings can be entered. The writing assumes some can:

- the supper table "inside the Watch-house", a main source of the story;
- the storage chest and bed at Hesper's;
- the Fairlow house as a home with racks, shelves, and a mantel that fill up;
- the Mill's loft, where a keepsake lies (my own story, written this morning);
- the Forge's strongroom, with Hob Tarn asleep across its door and a coal hatch round the back.

The building kit is exterior walls. Every interior is extra work: floor, furniture, lighting, and a camera that behaves in a small room.

**Recommended, needs Greg:** four interiors and no more. The Watch-house hall, Hesper's cottage, the Fairlow house, and the Mill's ground floor. Each is one room, furnished from a free matching furniture set. Indoors the game switches to the first-person view by itself, which avoids the camera problem. Every other building stays closed: a lit window, a door that opens only for the people who live there. The Forge's strongroom becomes a locked lean-to store against the outside wall, which keeps the coal hatch.

If the answer is no interiors at all, the supper table moves to an open-sided hall in the Watch-house yard, and the Fairlow house's display moves to its porch. That is cheaper and loses the best quiet moment in the game: walking into a room where supper was left twenty years ago.

## 4. Animals: never seen beside the people

Sheep, geese, wolves, deer, a boar, a dog, rabbits, fish, and birds are all in the design. None has been rendered next to a character.

- The dog, boar, rabbits, and fish on the asset list are a blocky cube style. Beside rounded people they may look like a different game. Bracken is a companion and is on screen for hours.
- Wolves and deer were never downloaded (quota). Geese have a rig and no clips.

**Do:** an animal style test, as the people had: each animal beside the hero, noon and dusk. Before task 003 places any of them.

## 5. The tax cart has no horse

"We stop at the ford to water the horse" is the cart's weak point and the thatcher's story happens there. The asset list defers the horse to the second region.

**Recommended:** an ox, or a pony, pulling the cart, as soon as one passes the animal style test. If none does: a handcart pulled by two of the three, who stop at the ford to rest, with the line changed. I will change the line only if it comes to that.

## 6. Large heads and the weak point

On these models the head is more than a third of the body. The design makes the head the weak point and the placeholder multiplier is three. Every arrow that hits anywhere high is a head shot.

**Settled in `GAME_DESIGN.md` version 26:** the weak point is the whole head as drawn, so what the player sees is what they hit. It is worth one and a half times, not three (tuning). A kill in one arrow comes from catching someone unaware, from a perfect draw, or from range, not from the head alone. Viktor: `COMBAT_DEPTH_TUNING.weakPoints.head` to 1.5 and `helmetHead` to 1.

## 7. Checks that measure, so nobody has to judge by eye

Review 007's lighting items were marked done when the frames showed otherwise. Added to task 003's evidence. The capture script must measure and fail on:

- at dusk, the ground's average brightness is at least a quarter of the sky's;
- in every pool of window light, red is at least a fifth stronger than blue;
- at 18:00 only Hesper's window is lit; at 19:15 every home household's is;
- no door opening is lower than the tallest character (from review 008).

## What needs Greg

1. Interiors: four rooms, or none.
2. The people's look, still open from review 007.
