# The company

The five companions besides Bram, and what all six want. Bram's lines are in `bram.md`. Use everything here exactly as written. `GAME_DESIGN.md` section 6 (Companions) has the rules.

## Rules for all of them

- Each has three perks of their own, always active. The first comes with joining, the second at the second stage of bond, the third at the third.
- Each has a **wish**: one thing they want. It is never listed anywhere. The player learns it only from what the companion says, and fulfilling it is what reaches the third stage of bond.
- Bond grows by travelling together, fighting together, and resting at campfires together. The second stage should come after a few hours in the company; the third needs the wish.
- At a campfire, a companion says one line or short piece per rest, in order, as their bond allows.
- Lines in the field and in fights are one of. Each line of a group is said once before any is said again, and a group that has run out stays quiet for a full day instead of repeating. One companion speaks at most once every couple of game hours outside a fight, and nobody talks over anybody (`src/core/speech`).
- Lines under "What they notice" answer something that has just happened. They are what makes the company feel awake, so they take priority over the plain field lines.
- Nobody uses a pronoun for Wren.

## Bram

His lines are in `bram.md`.

- **Perks:** *Shieldwall* (joining): enemies beside him prefer him as a target. *Breaker* (bond 2): his heavy strike drops a shield-bearer's guard. *Stubborn* (bond 3): the first time he would fall in a fight, he stays up.
- **Wish:** A hot meal at a table with a roof over it. He mentions soup on the walk into the valley and never quite stops. It is fulfilled by eating at the inn once it is rebuilt, with Bram in the company.

`bram.wish.fulfilled` (at the inn)

1. "Soup. At a table. Under a roof. I'm not crying. It's the steam."

---

## Tamsin Sedge

The shepherds' daughter. A poacher, and good at it. Returns with the Sedges.

- **Voice:** Quick, sharp, unbothered. She has been getting away with things for six years and sees no reason to stop.
- **In a fight:** A second bow. She shoots whoever the hero has marked, from wherever she can see them.
- **Perks:** *Second Bow* (joining): she shoots the hero's marked target. *Covering Shot* (bond 2): she looses at any enemy who starts a wind-up against the hero. *Her Father's Eye* (bond 3): her first arrow in a fight always finds a weak point.
- **Wish:** Her father's bow, which hangs on the wall of the Watch-house. Fulfilled when it is brought back to Hale. See `sedges.bow.returned` in `households.md`.

`tamsin.join`

1. "I've watched you work. You're not bad. You stand up too soon after a shot. I'll come along and stop you getting killed."

`tamsin.field` (one of)

- "Two on the wall. You take the one who's awake."
- "Don't mark the fat one. I've a personal matter with the fat one."
- "That's my rabbit run you're standing in."

`tamsin.fight` (one of)

- "Mine."
- "He's marked. He's down."
- "You're welcome."

`tamsin.wounded`

- "Ow. No, leave it. Go and hit somebody."

`tamsin.camp.1` (bond 1)

1. "Poaching's only poaching if you agree it's his land. I never agreed."

`tamsin.camp.2` (bond 1; this is the wish)

1. "My father had a bow. Best in the valley. Stane took it off him and hung it on a wall, like a head."
2. "He's never said he minds. He's never picked up another, either."

`tamsin.camp.3` (bond 2)

1. "You don't talk. I like that. Everyone I know talks."
2. "That wasn't an invitation to start."

`tamsin.camp.4` (bond 3)

1. "He strung it. He couldn't draw it, but he strung it, and he held it a while."
2. "I owe you one. I don't say that. Remember I said it."

---

## Tobin Pike

A bandit won back. Nineteen years old. Joined Stane at fifteen because Stane's men ate.

- **Voice:** Quiet, careful, braced for a blow that doesn't come. He answers questions exactly and offers little. He gets a little easier as bond grows.
- **In a fight:** A soldier. He knows how Stane's men are drilled.
- **Perks:** *He Knows the Drill* (joining): once a place has been watched, its patrol routes are shown. *A Face They Know* (bond 2): his former comrades lose their nerve faster when he is in the fight. *Come Home* (bond 3): an enemy he beats is always knocked out, never killed, and is likelier to stay in Wick.
- **Wish:** To face his parents. The Pikes come home when he is won back, but he will not go to their door. Fulfilled by walking to the Pikes' house with Tobin in the company. See `pikes.settled` in `households.md`.

`tobin.join`

1. "I can show you how they stand their watches. I stood them. If you'll have me along."

`tobin.field` (one of)

- "That's Marlowe. Same circuit every time. Count forty and he's round the corner."
- "The Captain taught us to watch the road. Nobody watches the hill."
- "I'll go first, if you want. They'd shoot me last."

`tobin.fight` (one of)

- "Put it down, Jory. Just put it down."
- "I'm not here to kill anyone."
- "Left side. He's slow on the left."

`tobin.wounded`

- "I'm all right. I've had worse from them for less."

`tobin.camp.1` (bond 1)

1. "The first winter up there, I ate every day. I'd never done that. That's all it was. That's the whole reason."

`tobin.camp.2` (bond 1; this is the wish)

1. "They've come home. My mother and father. I've seen the smoke."
2. "I haven't been to the door. I go as far as the fence."

`tobin.camp.3` (bond 2)

1. "The Captain never hit anyone. People think he must have. He'd just look at you and say your name."
2. "It was worse."

`tobin.camp.4` (bond 3)

1. "My father shook my hand. Like I was somebody who'd come about the fence."
2. "Then he didn't let go of it. So."

`tobin.wish.fulfilled` (at the Pikes' door)

1. Tobin: "It's me."
2. Orla: "I know it's you. I've known your knock since you could reach the latch. Come in. Wipe your feet."

---

## Oona

The herbwife. Returns at six lit windows. She does not fight and has never pretended she would.

- **Voice:** Brisk and unimpressed. She has seen every kind of foolishness arrive on a stretcher.
- **In a fight:** She stays back. When a companion falls, she goes to them and gets them up.
- **Perks:** *On Your Feet* (joining): once in a fight, she gets a fallen companion back up. *Proper Food* (bond 2): anything the hero eats heals more while she is in the company. *I've Seen Worse* (bond 3): she can get the hero back up too, once between rests.
- **Wish:** A cutting of the white comfrey that grows only at the spring in the firefly grove. Her mother's garden was grown from it and the garden is gone. Fulfilled by bringing her to the grove.

`oona.join`

1. "I'm coming with you. Not to fight. To be there when you've finished being clever."

`oona.field` (one of)

- "That's yarrow. Pick it. No, by the stem. Were you raised in a barn?"
- "If you're going to crouch in wet grass all night, at least sit on your cloak."
- "I'll wait here. Shout when someone's bleeding."

`oona.fight` (one of)

- "Up. Up. You're not dead, you're embarrassed."
- "Hold still. I said hold still."
- "Somebody stop that one hitting people."

`oona.camp.1` (bond 1)

1. "Eat that. All of it. I don't care that it's green."

`oona.camp.2` (bond 1; this is the wish)

1. "My mother's garden had a white comfrey. Mends a bone in half the time. It's gone to nettles now."
2. "She had the cutting from a spring somewhere in the forest. She never would say where. Spiteful woman. I miss her."

`oona.camp.3` (bond 2)

1. "Hesper and I have known each other fifty years and exchanged perhaps a hundred words. It's the best friendship I have."

`oona.camp.4` (bond 3)

1. "It's taken. Three shoots already. My mother would say I've planted it too deep."
2. "She'd be wrong. She was usually wrong. Thank you."

`oona.wish.fulfilled` (at the firefly grove)

1. "Oh, you sly old woman. All those years. It was here."
2. "Nobody else is to know about this place. I mean it. I'll put something in your tea."

---

## Garrick Aldric

The smith's apprentice. Returns with Bertram. Big, patient, and tired of being told he is not ready.

- **Voice:** Slow and even. He thinks before he speaks and says less than he thought.
- **In a fight:** A two-handed hammer. Slow, and nothing ignores it.
- **Perks:** *Heavy Hand* (joining): his blows stagger heavy enemies. *Field Repair* (bond 2): at a campfire, he restores the edge on the hero's blade and the hero's arrows break less often until the next rest. *Unmade* (bond 3): his blows break shields and helmets for the rest of the fight.
- **Wish:** To make one thing Bertram will call good. Bertram has never said it. Fulfilled by bringing the makings of any one forged piece to the Forge with Garrick in the company and letting him make it. It is his work, not the hero's, so it asks no Smithing of the hero; it comes out masterwork, and the hero keeps it.

`garrick.join`

1. "He says I'm not ready to work alone. He's said it for nine years. I'd like to go and hit something that isn't an anvil."

`garrick.field` (one of)

- "That gate's hung badly. I could have it off in one swing."
- "There's ore in that rock. See the green in it? That's copper."
- "I'll go where you point. I'm not quick. I'll get there."

`garrick.fight` (one of)

- "Stand still."
- "That's a helmet. Was a helmet."
- "The big one's mine."

`garrick.wounded`

- "I'm down. I'll be a minute."

`garrick.camp.1` (bond 1)

1. "Give me your blade. It's got an edge like a butter knife. Who's been sharpening this? You have."

`garrick.camp.2` (bond 1; this is the wish)

1. "Nine years, and the best he's ever said about my work is 'it'll hold.'"
2. "I don't need him to say it's good. I'd like to hear it once. Then I wouldn't need it."

`garrick.camp.3` (bond 2)

1. "He took me in when I was six. Gave me a broom. I thought that was the trade. Sweeping."

`garrick.camp.4` (bond 3)

1. "He turned it over three times. Looked down the edge. Put it on the bench."
2. "He said, 'Whose is this?' I said mine. He said, 'Hm. I'd have been pleased with that.'"

`garrick.wish.fulfilled` (at the Forge; Bertram speaks)

1. Bertram: "Whose is this?"
2. Garrick: "Mine."
3. Bertram: "Hm. I'd have been pleased with that."

---

## Bracken

The Sedges' sheepdog. Returns with them. He has no lines.

- **In the company:** He takes one of the three places. He cannot be harmed: enemies ignore him, and if a fight comes too close he gets out of the way.
- **Perks:** *Nose* (joining): he growls, low, when an enemy the hero has not noticed is near, and looks toward it. *Finder* (bond 2): near a place off the path or a hidden cache, he trots ahead and waits. *Herder* (bond 3): he runs down a fleeing enemy and holds them until the hero arrives; an enemy held this way surrenders.
- **Wish:** His flock. He is a sheepdog with no sheep to mind. Fulfilled when the Sedges are home and the hero rests at a campfire within sight of the sheep with Bracken in the company. There is nothing to read; he lies down facing them and, for the first time, sleeps.

What he does, in place of lines:

- **On the road:** ranges ahead and comes back. Counts the company by circling it.
- **Near enemies:** stops, lowers his head, growls. Does not bark.
- **Near a secret:** trots toward it, stops, looks back.
- **At a campfire, bond 1:** lies at the edge of the light, facing outward.
- **At a campfire, bond 2:** lies beside the hero, still facing outward.
- **At a campfire, bond 3:** lies with his head on the hero's boot.
- **With Bram:** growls at him, takes his food, and growls again. See `pair.bram.bracken` in `bram.md`.
- **With Tamsin:** obeys her without being asked.
- **When the hero is hurt:** stays close and will not range.

---

## Pairs

Exchanges at campfires between companions who are both present. One per rest. Bram's pairs are in `bram.md`.

`pair.tamsin.tobin`

1. Tamsin: "You stood guard on the east fence. I walked past you a hundred times with a deer on my shoulders."
2. Tobin: "I know. I saw you every time."
3. Tamsin: "You never said."
4. Tobin: "No."

`pair.tamsin.oona`

1. Oona: "You've a cough."
2. Tamsin: "I've had it since I was nine."
3. Oona: "Then you've had ten years to come and see me about it."

`pair.tamsin.garrick`

1. Tamsin: "Do you ever say more than six words?"
2. Garrick: "When I've got more than six."

`pair.tobin.oona`

1. Tobin: "You set my arm when I was eight. I fell out of the Sedges' apple tree."
2. Oona: "I remember. You didn't cry. I thought, that one's either brave or simple."
3. Tobin: "Which was it?"
4. Oona: "I'm still watching."

`pair.tobin.garrick`

1. Garrick: "Dunmore used my master's hammer."
2. Tobin: "I know. I'm sorry. I held the tongs for him once."
3. Garrick: "Did he hold it right?"
4. Tobin: "No."
5. Garrick: "Good."

`pair.oona.garrick`

1. Oona: "You've burned that hand again."
2. Garrick: "It's a forge. It's hot."
3. Oona: "Forty years I've been hearing that from Aldrics."

## What they notice

Said above their heads in answer to what the hero has just done or where the company has just come. One of, under the rules at the top. Bram's are in `bram.md`.

`tamsin.sees.shot` (the hero lands a long shot or a perfect draw)

- "All right. That one I'd have been pleased with."
- "You held it. You never hold it."

`tamsin.sees.spared` (the hero knocks someone out or takes a yield)

- "He'll have a head like a dropped egg tomorrow. Better than the other thing."
- "That's Wyll Carrow. He used to buy my ducks. Leave him his boots."

`tamsin.sees.secret` (a place off the path is found)

- "I've walked past this a hundred times. Don't tell my father."

`tamsin.at.night`

- "Step where I step. The dry leaves are on the left."

`tamsin.at.watch_house` (first sight of it)

- "There's a bow on the wall in there. Yew. Horn tips. It isn't theirs."

`tobin.sees.shot`

- "They'll talk about that at the fire. The ones who are left to talk."

`tobin.sees.spared`

- "He'll wake up and not know why he's alive. I can tell him. I remember."
- "Thank you. You don't know him. I do."

`tobin.sees.secret`

- "We were told not to come up here. Nobody said why. Nobody asked."

`tobin.at.night`

- "The night watch looks at the fire. Then they can't see anything else. I never could."

`tobin.at.forge` (first sight of it, in the company)

- "I stood at that fence every evening. You can see our chimney from it. That's why."

`oona.sees.shot`

- "Well. I'd not want to be a rabbit round you."

`oona.sees.spared`

- "Lay him on his side. No, his other side. I'll look at him when it's quiet."
- "That's one fewer I have to be sorry about."

`oona.sees.secret`

- "There's yarrow here. And comfrey. Somebody planted these. Somebody who knew."

`oona.at.night`

- "I've walked this valley in the dark for forty years. Nothing in it ever hurt me that wasn't a person."

`oona.at.orchard` (the wild orchard)

- "The Hollins' trees. They've gone to wood, but they're bearing. Stubborn family."

`garrick.sees.shot`

- "Good arrowhead, that. Whose is it?"

`garrick.sees.spared`

- "Flat of the blade. Good. Edges are for things that don't get up."

`garrick.sees.secret`

- "Somebody dressed this stone. Look at the corners. That's a day's work, each."

`garrick.at.night`

- "I can't see my feet. I can hear them. So can everyone."

`garrick.at.forge` (first sight of it, in the company)

- "He's let the roof go. He never lets the roof go."

## On the road

Short exchanges between two companions who are both travelling, said above their heads while walking and never near an enemy. One per day at most, each said once. Players love the company talking to each other more than to the hero, so these come before anyone's plain field line.

`road.bram.tamsin`

1. Bram: "Is that a rabbit run or a path?"
2. Tamsin: "It's a path if you're a rabbit."

`road.bram.tobin`

1. Bram: "What did you eat, up there?"
2. Tobin: "Whatever the cart brought back. Your village's bread, mostly."
3. Bram: "Was it good?"
4. Tobin: "I couldn't taste it."

`road.bram.oona`

1. Oona: "You're favouring the left knee."
2. Bram: "I'm favouring both of them. I just can't do it at the same time."

`road.bram.garrick`

1. Bram: "That hammer weighs more than I do."
2. Garrick: "No."
3. Bram: "That's the nicest thing anyone's said to me this week."

`road.tamsin.tobin`

1. Tamsin: "East fence has a loose rail. Third from the gate. Did you know?"
2. Tobin: "I loosened it."

`road.tamsin.oona`

1. Tamsin: "What's that one? The yellow."
2. Oona: "Ragwort. Don't feed it to anything you like."

`road.tamsin.garrick`

1. Tamsin: "You walk like a cart."
2. Garrick: "I get there like one too."

`road.tobin.oona`

1. Tobin: "Did people ask after me? Before."
2. Oona: "Your mother did. Every week. I told her you'd looked well, last I saw."
3. Tobin: "Had you seen me?"
4. Oona: "No."

`road.tobin.garrick`

1. Tobin: "I can carry something."
2. Garrick: "You are. I can see it from here."

`road.oona.garrick`

1. Oona: "When did you last eat a green thing?"
2. Garrick: "There was an onion."
3. Oona: "When?"
4. Garrick: "Harvest."

## Pairs that act together in a fight

No lines; these are behaviours.

- **Bram and Tamsin:** when Bram breaks a guard, Tamsin's next arrow goes to that enemy.
- **Garrick and Tamsin:** when Garrick breaks a helmet, Tamsin aims for the head.
- **Tobin and Bracken:** an enemy Bracken is holding surrenders at once if Tobin reaches them first.
- **Oona and Bram:** if Bram falls, Oona goes to him before anyone else.
