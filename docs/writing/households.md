# The households of Wick

Sixteen households, one window each. Use the names, triggers, and lines exactly as written. `GAME_DESIGN.md` section 9 has the rules.

## How to read this

- **Trigger** is the one thing that brings the household home. It is checked whenever something in the valley changes.
- **Gives** is what the valley gains.
- **Lines** are spoken above heads or in a short conversation. Each household has lines for the day they return, for ordinary days after, and for the festival. Use one per meeting, in order within each group, then repeat the last.
- Villagers call the hero "Wren's child," "the apprentice," or, once the hero is a Warden, "Warden." Nobody uses a pronoun for Wren.
- A household that is not home has a dark, boarded house and a bare marker stone.

## The count

At the start, one window of sixteen is lit: Hesper's. The Fairlow window is the seventeenth and is lit only in the finale.

A natural order, if the player does everything: Hesper, Old Maren, the Marrins, the Kettles, the Brands, the Sedges, Oona, the Aldrics, the Hollins, the Tolleys, the Ashbys, the Loomises, the Dunns, the Pikes, the Rudds, the Wains.

Not every player will bring all sixteen home before the finale. That is allowed. Lines that state the count are written for both cases.

## Stolen things and whose they are

| Thing | Belongs to | Where it is |
| --- | --- | --- |
| The smith's hammer | The Aldrics | The Forge, in use on the anvil |
| A wedding ring | Ansa Marrin | The Mill's strongbox |
| A bowyer's tools, in a leather roll | The Tolleys | The cave behind the waterfall |
| A loom shuttle, carved with initials | The Loomises | The Watch-house strongbox |
| A pair of brass candlesticks | The Hollins | The tax cart |
| A child's carved horse | The Dunns | The Forge's strongbox |
| Hale Sedge's bow | The Sedges | On the wall in the Watch-house |

Each can be returned to its owner if they are home, or left at their door if they are not. Each can be sold instead; the household then says its sold line once, and nothing more.

---

## 1. Hesper

The Lamplighter. Her window is lit from the start and all night, every night. Her lines are in `hesper.md`.

## 2. Old Maren

- **Who:** A very old woman who never left. She lives two doors from Hesper and has sat in the dark for years to save oil.
- **Trigger:** The first lantern is lit. That evening Hesper carries a lamp to her window.
- **Gives:** She tells the hero who lived in each house and what they lost, which is how the player learns what will bring each family home. One fragment.
- **Lines:** in `fragments.md`.

`maren.window` (the evening her window is first lit)

1. "Is that for me? Hesper, you old fool. I've managed in the dark this long."
2. "Well. Leave it. It's nice to see my own hands."

## 3. The Marrins

- **Who:** Ansa Marrin, who ran the mill with her husband Dav until the night he marched with the guard; and her grown son Corin, who was a baby then.
- **Why they left:** Stane's men took the Mill in the second winter.
- **Trigger:** The Mill is freed.
- **Gives:** Bread and flour, and food for sale. Ansa teaches the Night Stew perk.

`marrins.return`

1. Ansa: "The wheel's turning. I could hear it from the lane. I'd forgotten I knew that sound."
2. Corin: "I've never seen it work. I've only ever heard about it."

`marrins.settled`

1. Ansa: "Take a loaf. No, take two. You look like Wren, and Wren never ate enough either."
2. Corin: "The stones want dressing and I've no idea how. Mother shouts instructions. We're managing."

`marrins.ring.returned`

1. Ansa: "Where did... no. Don't tell me where it's been."
2. Ansa: "Dav said he'd be back before the bread was cold. I kept the oven warm for a year."

`marrins.ring.sold`

1. Ansa: "Someone told me my ring went through your hands. I hope you got a fair price."

`marrins.letter` (shown the unsent letter)

1. Ansa: "That's his hand. Twenty years late. He was late to our wedding, too."
2. Ansa: "Thank you. I'll read it properly when you've gone."

`marrins.retaken` (in Wick, the morning after the Mill is retaken)

1. Ansa: "We ran with what we could carry. Again. I'm too old to keep doing that."

`marrins.festival`

1. Ansa: "I made enough for everyone. Then I made it again, because everyone is more than it used to be."

## 4. The Aldrics

- **Who:** Bertram Aldric, the old smith, stubborn as his anvil; and Garrick, his apprentice, an orphan he took in.
- **Why they left:** Stane's men wanted weapons. Bertram wouldn't make them. They took the Forge, and his hammer with it.
- **Trigger:** The smith's hammer is returned to him. Freeing the Forge is not enough: he comes to look, sees someone else's hammer on his anvil, and goes away again.
- **Gives:** Smithing at the Forge. Garrick as a companion. Bertram teaches Maker's Mark; Garrick teaches Second Quiver.

`aldrics.forge.freed` (Bertram, at the Forge, before the hammer is returned)

1. "The fire's lit. Good. That's not my hammer. I'll be at my sister's."

`aldrics.return` (the hammer returned)

1. Bertram: "Give it here. Forty years that's fitted my hand. They've been hitting nails with it."
2. Garrick: "He's been unbearable without it. He'll be unbearable with it, but busier."

`aldrics.settled`

1. Bertram: "I don't make blades for people who take a tenth. I'll make one for you."
2. Garrick: "He says you've a good eye. He said it to the anvil, not to you. That's how you know he means it."

`aldrics.hammer.sold`

1. Bertram: "You sold it. Then find a smith who'll work with a stranger's hammer. I won't."

Bertram does not return if the hammer was sold. Hesper then teaches Maker's Mark in his place, and smithing is offered by Garrick alone, who returns at ten lit windows.

`aldrics.festival`

1. Bertram: "I forged the lantern hooks. Every one in the square. Nobody asked me to."

## 5. The Sedges

- **Who:** Hale Sedge, a shepherd who was the best shot in the valley before his hands went; his daughter Tamsin, who poaches and does not apologise for it; and Bracken, a sheepdog.
- **Why they left:** Wolves on the east road took half the flock in one winter, and Stane's men took Hale's bow.
- **Trigger:** The east road is safe at night: the Forge is freed, or lanterns are built along the east road.
- **Gives:** Sheep and wool. Tamsin and Bracken as companions.

`sedges.return`

1. Hale: "Not a wolf from the ford to the gate. I walked it twice to be sure."
2. Tamsin: "He counted the sheep the whole way. I counted the wolves. I had the easier job."

`sedges.settled`

1. Hale: "That orchard was my father's. Pick what you like. Mind the hives. They know who you are."
2. Tamsin: "I've shot deer on Stane's land for six years. He never caught me. You nearly did."

`sedges.bow.returned` (Tamsin's wish)

1. Tamsin: "That's his. You got it off the wall. From the Watch-house."
2. Hale: "I can't draw it any more. Give it to the girl. No. Give it to me a minute first."

`sedges.festival`

1. Hale: "First time I've heard that tune with all its parts since I was a boy."

## 6. The Pikes

- **Who:** Ned and Orla Pike, farmers. Their son Tobin ran off at fifteen to join Stane, because Stane's men ate.
- **Why they left:** They could not stay and watch him collect the tenth from their neighbours.
- **Trigger:** Tobin is won back.
- **Gives:** Tobin as a companion. Ned has a fragment.

`pikes.return`

1. Orla: "He's thinner. He's taller. He's mending the fence and doing it wrong."
2. Ned: "We didn't leave because of the bandits. We left because one of them was ours."

`pikes.settled`

1. Orla: "He won't say what he did up there. I haven't asked. I'm his mother, not his judge."
2. Ned: "You could have killed him. I know what he was carrying. Thank you."

`fragment.pikes` — *What Ned saw* (told once the Pikes have been home three days)

1. "I was up with a calving cow, the night they went. I saw the hill take light."
2. "And I saw Stane, in the Watch-house gate, with his sword still on its peg behind him."
3. "He never drew it and he never followed them. I've wondered since which of those was the brave part."

**If Tobin was killed.** The Pikes come home anyway, once fourteen windows are lit. They ask no questions.

`pikes.return.grieving`

1. Orla: "We heard. We've come to bury him here. That's all we want."
2. Ned: "Don't say you're sorry. You didn't make him go up that hill. Neither did we. I tell myself that."

`pikes.festival`

1. Orla: "I'm dancing. Don't look at me. I'm allowed."

`pikes.festival.grieving`

1. Ned: "We'll watch from the door. It's a good thing you've done. We can see that from the door."

## 7. The Wains

- **Who:** Joss and Merry Wain, carters, young and newly married. They were never from Tallowmere.
- **Trigger:** The inn is rebuilt.
- **Gives:** A carter's trade: goods the valley cannot make, at fair prices. Proof that word has spread.

`wains.return`

1. Joss: "We heard there was a valley where the roads were kept again. I didn't believe it. She did."
2. Merry: "Which house is empty? We'd like one with a window that faces the lake."

`wains.settled`

1. Merry: "People keep telling us who used to live in our house. I think that means we're allowed to stay."
2. Joss: "Three days out, they're calling you the Lamplighter's apprentice. As if there'd only ever been the one."

`wains.festival`

1. Merry: "We don't know the tune. Everyone else does. We're learning it."

---

## The other nine

Lighter households. Each has a trigger, something it gives, and three lines: on return, settled, and at the festival.

## 8. The Kettles

- **Who:** Wat Kettle, a peddler, and his sister Nan. They left with a full cart and came back with an emptier one.
- **Trigger:** Three windows are lit.
- **Gives:** The first general trader in Wick.

1. Return: "Three lights. Three's a village. Two's just neighbours."
2. Settled: "I'll buy anything. I'll sell most things. Don't ask where the kettles came from."
3. Festival: "I've sold every lantern I had and I'm not sorry."

## 9. The Brands

- **Who:** Old Tam Brand and his two sons, charcoal burners from the forest edge.
- **Trigger:** The Forge is freed.
- **Gives:** Wood, charcoal, and arrow shafts for sale.

1. Return: "A forge wants charcoal. No forge, no reason for us. Simple as that."
2. Settled: "Mind the boar past the second clearing. He's older than I am and worse tempered."
3. Festival: "We brought the wood for the big fire. Stand back from it. I know how it burns."

## 10. Oona

- **Who:** The herbwife. Lives alone at the edge of the village with a garden gone wild.
- **Trigger:** Six windows are lit. She comes when there are enough people to get hurt.
- **Gives:** Healing in Wick. Oona as a companion. She teaches Roll With It.

1. Return: "Six households and not one of you knows what comfrey looks like. I'm back."
2. Settled: "Sit. Show me. That's not a scratch. Who told you that was a scratch?"
3. Festival: "I'll dance when everyone's stopped falling over. So, never."

## 11. The Hollins

- **Who:** Bess Hollin, innkeeper, widowed, formidable.
- **Trigger:** Eight windows are lit.
- **Gives:** Rumours that point toward secrets. She wants the inn rebuilt, and says so daily until it is.

1. Return: "Half the village home and nowhere to sit of an evening. That's not a village. That's a row of houses."
2. Settled: "That inn has stood since my grandmother. It wants a roof. I want a roof on it. Do you see where this is going?"
3. Festival: "First round's free. Second round, I've a roof to pay for."

`hollins.candlesticks.returned`

1. "My mother's. They stood on the bar forty years. They'll stand there again when there's a bar."

## 12. The Tolleys

- **Who:** Giles Tolley, bowyer, and his wife Ada, who does the fletching and says she does the hard part.
- **Trigger:** The bowyer's tools are returned.
- **Gives:** Bows, strings, and arrows for sale, and better bows as the valley recovers.

1. Return: "My draw-knife. My spokeshave. You can't make a bow with your teeth, whatever Ada says."
2. Settled: "That's Wren's old bow. I made that. Let me see the string. Who's been looking after this? Somebody has."
3. Festival: "Ada's fletched a hundred shafts with ribbon for the children. They're not for shooting. Tell the children that."

## 13. The Ashbys

- **Who:** Marta Ashby, beekeeper, and her brother Col.
- **Trigger:** Ten windows are lit.
- **Gives:** Honey and wax. Candles for sale, which is why the windows burn brighter after they return.

1. Return: "Bees won't stay where there's no people. I'm the same."
2. Settled: "Every candle in this village is mine. When you see a window lit, you may think of me."
3. Festival: "Sixty candles in the square. I counted them out. I'll count them back in."

## 14. The Loomises

- **Who:** Edda Loomis, weaver, and her granddaughter Pell. The loom was Edda's grandmother's.
- **Trigger:** The loom shuttle is returned.
- **Gives:** Cloth and cloaks. A finer cloak for each rank the hero has earned.

1. Return: "A loom's only wood without its shuttle. A village is only houses without its people. I've had a long time to think of that."
2. Settled: "Hesper's cloak. I wove that. If she ever gives it to you, you'll know what you've been given."
3. Festival: "I wove the banners. Not his sort. Ours."

## 15. The Dunns

- **Who:** Rob and Sal Dunn, farmers, with four children and no patience.
- **Trigger:** Twelve windows are lit.
- **Gives:** Children in the square, which changes how Wick sounds. Farm produce.

1. Return: "We waited till we were sure. With four of them, you have to be sure."
2. Settled: "The little one thinks you're a story. Don't correct her."
3. Festival: "Bed was an hour ago. I've given up. Look at them."

`dunns.horse.returned` (the youngest child)

1. "That's Dobbin! He's got a new scratch. Did he fight the bandits? He did, didn't he."

## 16. The Rudds

- **Who:** Amos Rudd, who rang the village bell at dusk every day of his life until there was nobody to ring it for.
- **Trigger:** The village bell is rehung.
- **Gives:** The bell at dusk, heard across the valley. One fragment.

1. Return: "You hung it a hand too low. Never mind. It'll ring."
2. Settled: "Dusk. Every dusk. So anyone out in the fields knows it's time to come in."
3. Festival: "I rang it eighteen times tonight. Seventeen for the windows, and one because I felt like it."

`fragment.rudds` — *What Amos rang* (told once the bell has rung three dusks)

1. "The morning after they marched, I rang the alarm. It's what you do."
2. "Nobody came. There was nobody left whose job it was to come."
3. "I've thought about that every time I've rung it since."

---

## Lines that depend on the count

Use the first when all sixteen households are home at the finale, and the second when they are not.

`hesper.finale.count` (replaces line 2 of `hesper.finale.window` in `hesper.md`)

- All sixteen home: "Seventeen."
- Otherwise: "That's yours lit. The rest we'll see to."

`bram.finale.count` (replaces `bram.finale.after` in `bram.md`)

- All sixteen home: "Seventeen. I counted too."
- Otherwise: "It's a start. A good one. I counted."

`rudds.festival.count` (replaces Amos's festival line when not all are home)

- Otherwise: "I rang it once for every window that's lit. I'll ring the rest when they are."
