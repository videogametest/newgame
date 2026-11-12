# Hesper

The Lamplighter. The hero's mentor. Use these lines exactly as written.

## How she speaks

- Short. Rarely more than two sentences, and often one.
- Dry. She notices everything and remarks on little of it.
- She expects a great deal and says so by saying "again."
- Her highest praise anywhere in the game is "Hm. That'll do." It is spoken exactly twice: when the hero touches her shoulder, and at the Fairlow window. Do not use it anywhere else.
- She never explains her feelings. They show in what she does: the lamp, the count of windows, the cloak.
- She never uses a pronoun for Wren.
- Where a line has `{name}` or `{trade}`, fill it from data.

Lines in a group are spoken in order unless the group says "one of".

## Arrival

The hero and Bram reach her door at dusk, having walked toward her window.

`hesper.arrival`

1. "You walk like someone who wants to be heard. Come in before the wolves agree."
2. "Fairlow. You have Wren's way of standing. Don't let it go to your head. Wren stood badly."
3. "Twenty years I've kept that lamp. I was expecting someone taller."

`hesper.arrival.bram` (to Bram)

1. "And you're the loud one. Good. Somebody should be."

## Taking an apprentice

The next morning.

`hesper.apprentice`

1. "You came to take the valley back. With what? You hold that bow like a broom."
2. "I can teach you. You won't enjoy it."
3. "Rule one. Look first. Rule two. Look again."

## The Mill

She sends the hero to watch before attacking.

`hesper.mill.send`

1. "The Mill. Go and watch it. Touch nothing. Come back and tell me what you saw."
2. "The geese are the best guards Stane has. Mind them."

`hesper.mill.return.unwatched` (the hero came back without marking anyone)

1. "You saw a mill. I asked what you saw."

`hesper.mill.return.watched`

1. "Good. Now you know more than they do. That's the whole craft."

## The first lantern

She lights it alongside the hero.

`hesper.lantern.first`

1. "Here. Like this. Not too fast. A flame doesn't like to be hurried."
2. (She hums the first phrase of the melody.)
3. "There. Now someone can find their way."
4. "That's one. Don't count them. I'll count them."

## As the windows come back

One of these when the hero next speaks to her after a household returns. `{count}` is the number of lit windows.

`hesper.windows` (one of, chosen by what happened)

- The Marrins: "The Marrins are back. I could smell the bread from here."
- The Aldrics: "Aldric's at his anvil. I'd forgotten how much noise a living village makes."
- The Sedges: "Sheep on the east road. I never thought I'd be glad of sheep."
- The Pikes: "The Pikes are home. All of them. Don't look pleased with yourself."
- The Wains: "Strangers, moving in. On purpose. Nobody's done that in my lifetime."
- Any other household: "{name} is home. I knew that window by its curtains."
- At four windows: "Four. I used to walk the whole lane in the dark and not notice."
- At eight windows: "Eight. Half. I'd stopped thinking in halves."
- At twelve windows: "Twelve. I'll need more oil."
- At sixteen windows: "Sixteen. There's one left. You know which."

## The night before the turn

The evening the second lantern is lit. So the player has been told.

`hesper.turn.warning`

1. "Two lanterns. He can count as well as I can."
2. "He won't sit still for a third. Sleep light."

## The morning after the turn

The Mill has been retaken in the night. This is the low point of the story. She is looking toward it, not at the hero.

`hesper.turn`

1. "The Mill's dark."
2. "I've watched that happen to every window in this valley. I thought I was done watching."
3. "Don't say anything. You never do. Go and light it again."

`hesper.turn.relit` (after the Mill is freed again)

1. "It's lit. I looked twice."

## The trials

Each trial has lines to set it, lines for failing (one of, never the same twice running), and a line for passing.

### The Long Shot

`hesper.trial.longshot.set`

1. "Three arrows. That target. From this stone, not from where you'd like to stand."

`hesper.trial.longshot.fail` (one of)

- "The tree thanks you for the gift."
- "Closer. To the next valley, I mean."
- "Wren missed that one too. Once."
- "Again."

`hesper.trial.longshot.pass`

1. "Three. The target noticed, at least."

### The Trail

`hesper.trial.trail.set`

1. "I'm going for a walk. Find me."
2. "The ground tells everyone where people went. Nobody listens."

`hesper.trial.trail.fail` (one of)

- "I had my supper while you were looking."
- "You walked past me twice. I waved."
- "That was a deer. I am not a deer."
- "Again. Start from the mud this time."

`hesper.trial.trail.pass`

1. "You read that well enough."
2. "The fireflies come here because nobody else does. Keep it that way."

### The Count

`hesper.trial.count.set`

1. "Up on the signal hill. Count them. All of them. They mustn't count you."

`hesper.trial.count.fail.missed` (one of; `{place}` is where the missed defender was)

- "You missed one. Asleep {place}. He'd have woken up."
- "Close. Close gets you an arrow in the back. Again."

`hesper.trial.count.fail.seen` (one of)

- "They saw you. I saw them see you. From here."
- "A scout who's been counted hasn't counted anything."

`hesper.trial.count.pass`

1. "All of them. Yes."
2. "Now you know more than they do. That's the whole craft."

### The Quiet Lantern

`hesper.trial.quiet.set`

1. "Take a place and never let the bell ring. If it rings, I'll hear it. So will everyone."

`hesper.trial.quiet.fail` (one of)

- "I heard the bell. So did my teacup."
- "Lovely tone, that bell. I'd rather not have heard it."
- "Again. Quieter. That isn't advice, it's the whole instruction."

`hesper.trial.quiet.pass`

1. "Quiet. I had to go and look to believe it."

### The Night Road

`hesper.trial.night.set`

1. "From the lake to my door, tonight. Nobody sees you. Not the patrol, not the cart, not the cat."

`hesper.trial.night.fail` (one of)

- "A man with a torch described you to me quite well."
- "You were seen at the bridge. The bridge, of all places."
- "The cat saw you. I'm counting the cat."

`hesper.trial.night.pass`

1. "I didn't hear you come in. I heard the door. Work on the door."

### Hesper's Shoulder

`hesper.trial.shoulder.set`

1. "One more. Come up behind me and put your hand on my shoulder."
2. "Take your time. You'll need it."

`hesper.trial.shoulder.fail` (one of, each used once before any repeats; she does not turn round)

- "I heard you at the gate."
- "The third board. It's creaked since before you were born."
- "You breathe like a bellows."
- "Your cloak brushed the fence."
- "I can smell the lake on you."
- "Bram looked at the door. He didn't mean to. He told me anyway."
- "Closer than last time. I'm still not deaf."
- "Wren got as far as the hearth."

`hesper.trial.shoulder.pass` (she does not turn round)

1. "Hm. That'll do."
2. "The cloak's on the peg. It's yours. It was getting heavy."

## Rank

`hesper.rank.scout`

1. "You're no apprentice now. Don't thank me."
2. "Green suits you. You won't show against the trees."

`hesper.rank.warden` is the pass lines of Hesper's Shoulder. There is nothing further.

## Bandits won back

The morning after a place is freed, one line per bandit taken to Wick.

`hesper.bandit.stays` (one of)

- "{name} is staying. Took up the {trade} again. Says the hands remember."
- "{name} is staying. Asked me where the old house was. I showed them."
- "{name} is staying. Cried a bit. I pretended to see to the lamp."

`hesper.bandit.stays.tobin`

1. "The Pike boy's staying. He's mending his mother's fence. Badly."

`hesper.bandit.leaves` (one of)

- "{name} walked out at first light. Took nothing. That's something."
- "{name} is gone. Not back to him. Just gone. I can't blame them."

`hesper.bandit.returns` (one of)

- "{name} went back to Stane. Some people need someone to salute."
- "{name} went back up the hill. You'll see them again. Sorry."

`hesper.mercy.many` (three or more won back at one place)

1. "You brought {count} of them home. I didn't think you'd bring one."

`hesper.bandit.friend` (someone spared would not stay because a person they were close to was killed there; `{friend}` is that person)

- "{name} wouldn't stay. {friend} was at that fire with them nine years. I didn't argue."
- "{name} asked me where {friend} was buried. Then they went. I'd have gone too."

She says nothing about a place where nobody was spared. The valley shows it: no new window that night.

## Show

What she says when the hero shows her something. If nothing here matches, use the last entry.

`hesper.show`

- A helmet from the soldiers' road: "Guard issue. You don't leave your helmet behind unless someone's shouting."
- The letter from the soldiers' road: "Dav Marrin's hand. He always wrote like he was late."
- The duty roster from the Watch-house: "My own name, on patrol, east ridge. Yes. That's where I was."
- The patrol log: "I wrote that. All quiet, I said. It was quiet. That was the trouble."
- Anything from the signal hill: "You can see the castle from up there. I was on the wrong side of the ridge that night. I've been on the wrong side of it since."
- Wren's bow: "Where did you find that? No. I know where. Wren hid everything worth having and then forgot where."
- Wren's bow, a second time: "I strung that bow the first time. Wren strung it every time after. Look after it."
- A stolen thing belonging to a household: "That's {name}'s. Take it to them. Don't make a speech."
- Stane's order from the cave: "A tenth, not a half. Yes. That sounds like him. He always could count."
- One of Stane's banners: "He always liked a flag."
- The smith's hammer: "Aldric's. He'd sooner have lost the arm."
- Anything else: "I don't know what that is. I'm old, not all-knowing."

## About Stane

Before the finale, when the hero talks to her after seeing his banners or his men. One per conversation, in order.

`hesper.stane`

1. "Edric Stane was a good officer. Then the Crown left and he kept the uniform. That's all I'll say."
2. "He wasn't at his post that morning. Nobody was. A week later he turned up with men and a list of what we owed him."
3. "We served together. I'd have trusted him with my back. That's the part I can't forgive."

## About Wren

One per conversation, in order. The second needs the first trial passed; the third needs the turn to have happened; the fourth needs the roster or Stane's account.

`hesper.wren`

1. "I knew Wren. Everybody knew Wren. You could hear Wren coming."
2. "Wren was my apprentice. Before you. Better than you, at your age. Worse at listening."
3. "Wren went with the others that night. I wasn't here to say don't."
4. "I tell people the lamp's for anyone coming home. It isn't."

## The finale

### At the Watch-house

She arrives after Stane yields. The scene is short. His lines are in `stane.md`; the exchange is given here in full.

`finale.reunion`

1. Hesper: "Edric."
2. Stane: "Hesper. You kept the lamp."
3. Hesper: "You kept the valley. I thought you'd run."
4. Stane: "I thought you had."
5. Hesper: "I was past the ridge. I never saw it lit."
6. Stane: "I saw it. I stayed."
7. Hesper: "Then we've both been fools for twenty years. I'd hoped it was only you."

### At the Fairlow house

`hesper.finale.window`

1. "This one's yours to light. I've walked past it dark every night. I'm tired of it."

After the window is lit and the wren has sung:

2. "Seventeen." (Only if all sixteen households are home. Otherwise use the other line of `hesper.finale.count` in `households.md`.)
3. "Hm. That'll do."

## Teaching a perk in someone's place

When she teaches a perk whose teacher is gone.

`hesper.fallback`

1. "{name} would have shown you this. I'll do it worse and charge you for it."

## After a fight

One of, the next time the hero speaks to her after freeing a place.

`hesper.afterfight.loud` (the bell rang)

- "You were loud. Do it again, somewhere else, quietly."
- "I could follow that fight from my chair."

`hesper.afterfight.quiet` (nobody was ever alert)

- "I didn't hear a thing. Good."

## Everyday

One of, when the hero speaks to her with nothing new to say.

`hesper.idle.day`

- "You again."
- "Did you look first?"
- "Sit. Eat. You're no use to me thin."
- "Whatever it is, the answer is practise."

`hesper.idle.night`

- "Go to bed. The lamp's my job."
- "Wolves on the east road tonight. Stay near a light."
- "I don't sleep much. Someone has to see who's coming."
