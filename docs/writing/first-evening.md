# The first evening

Hesper's lines for the tutorial (`GAME_DESIGN.md` v37; task 010). Her voice is set in `hesper.md`: short, dry,
"again" for a miss, and never "Hm. That'll do." here.

## How this fits what is already written

- Step 2 uses `hesper.arrival` and `hesper.arrival.bram` as written. Bram comes in with the hero and watches the
  lesson from the fence. He does not help.
- `hesper.apprentice` moves from "the next morning" to this evening: it opens the yard (step 3). `hesper.md` is
  changed to say so.
- Step 6 uses `hesper.lantern.first` as written. The lantern is the small one at her gate.
- `hesper.mill.send` follows the lantern, as before.

Prompts are not hers and are not here: they come from the bindings (`interface.md`, `fillPrompt`).

## Step 1: the road in

No one speaks. One line on the screen as the game opens, then nothing until her door:

`evening.open`

1. "One window is lit. Walk to it."

## Step 2: her door

`hesper.arrival`, then `hesper.arrival.bram`. Then the choice:

`evening.choice` (the hero's two answers)

- "Show me."
- "I've held a bow before."

`evening.skip` (after "I've held a bow before")

1. "Have you. Then I'll save my breath. Take it. The lantern, and then we'll see what you've held."

## Step 3: the yard

`hesper.apprentice`, then:

`evening.targets`

1. "Three straw men. They won't move and they won't shoot back. You'll not get it easier."

`evening.targets.miss` (one of)

- "Again."
- "The straw is over there."
- "Again. Slower."

`evening.targets.done`

1. "Three. From ten paces. Don't write home."

`evening.far`

1. "Now the one by the wall. Draw and hold. Wait for your hands to stop arguing."

`evening.far.miss` (one of)

- "You let go because you were tired of holding. Again."
- "Again. Hold longer than you want to."

`evening.far.done`

1. "There. The bow did that. You only stopped getting in its way."

`evening.arrows`

1. "Blunt heads, in the second quiver. Change to them. A man you knock down can still tell you things."

`evening.arrows.done`

1. "Good. Know what's on the string before you draw it."

## Step 4: the fence

`evening.fence`

1. "Now cross the yard to the scarecrow. I'll be looking the other way. Mostly."
2. "Low and slow. If I hear you, you start again."

`evening.fence.seen` (one of)

- "I heard that from here. So would they. Again."
- "You're a shape against the fence. Lower. Again."
- "Again. The grass will tell on you if you rush it."

`evening.fence.mark` (at the scarecrow)

1. "Before you touch anyone, mark them. Him. Now you know where he is when he isn't where you left him."

`evening.fence.done`

1. "I didn't hear you. I'll not say it twice."

## Step 5: the post

`evening.post`

1. "For when it goes wrong. It will. Blade out. Hit the post."

`evening.post.dodge`

1. "Now I throw things at you. Don't be there."

`evening.post.hit` (the hero is struck by a thrown turnip; one of)

- "That was a turnip. The next one won't be. Again."
- "Again. Move before it leaves my hand, not after."

`evening.post.lock`

1. "Keep your eyes on the one that matters. The rest will wait their turn. They never do, but look anyway."

`evening.post.done`

1. "Enough. You'll fight like that for a month and then you'll fight better. Put it away."

## Step 6: the lantern

`evening.lantern`

1. "One more thing, and it's the only one that counts."

Then `hesper.lantern.first`, and after it:

`evening.map`

1. "Here's the valley as it was. The Mill is nearest. Tomorrow."

## Walking away and coming back

`evening.left` (the hero leaves the yard mid-lesson; she calls once)

1. "Off you go, then. The yard will be here."

`evening.back` (the hero returns; one of)

- "Seen enough? Where were we."
- "The straw men asked after you."

## Bram, from the fence

One line at most per step, and only on a success. He never comments on a miss.

`bram.evening` (one of, per step)

- "That one felt it."
- "I lost you in the grass. Me! I was looking right at you."
- "She threw a turnip at me once. I caught it. I was not supposed to catch it."
