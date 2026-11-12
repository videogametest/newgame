# Decisions

Why the game is the way it is. `GAME_DESIGN.md` says what was decided; this says why, and what was turned down. Claude maintains it. Newest decisions are added at the end of their group.

Read this before proposing to reverse something. Most of these were argued over once already.

## What kind of game

| Decision | Why | What was turned down |
| --- | --- | --- |
| A browser game, in Babylon.js, on GitHub Pages | It began as "a simple online game even only I play." A static page needs no server and costs nothing to host | A native engine such as Godot or Unity, which an AI build agent drives poorly because so much lives in a visual editor |
| Single-player only | Adding multiplayer later is close to a rewrite, and Greg does not want it | Leaving the door open for co-op |
| Keyboard and mouse only | It is played on one desktop | Touch and controller support |
| Full 3D | Greg wanted better graphics and characters than a 2D side-view could give. He chose this against a recommendation for 3D visuals on a 2D lane | Polished 2D; 3D visuals with side-view gameplay |
| One continuous open world | The feeling Greg was after, from the Zelda games, comes from walking through a place and finding things. Arenas behind a menu could not give that. He chose this knowing it was the riskiest option | Battle arenas chosen from a map; a small walkable hub with separate arenas |
| The world is generated from a seed, with places set by hand | Procedural code is what a build agent does well; hand-modelling scenery is what it does badly | A hand-built world |
| A first-person toggle, with third-person as the default | Greg knows it from Skyrim. Third-person shows the cloak and the surroundings; first-person suits walking and archery | First-person only when aiming; third-person only |
| Stylized low-poly from free CC0 packs | A build agent cannot model or animate. Free rigged packs exist in this style and not in a realistic one | Realistic art; machine-generated models except as a last resort |

## Who you are

| Decision | Why | What was turned down |
| --- | --- | --- |
| An apprentice scout, not a knight | From the Ranger's Apprentice books: skill and wit over strength, the bow, moving unseen, a hard mentor. It also suits how Greg plays | The armoured knight the prototype began with |
| The hero is silent and unnamed | So the player is the one in the story | A named, speaking hero |
| The hero shows things instead of choosing replies | A silent hero cannot have dialogue choices. Showing a found thing to someone turns fragments into the way the player asks questions | A menu of replies |
| No classes; skills level by use | From RuneScape and Skyrim | Fixed classes |
| Rank comes from Hesper's trials, not from experience | It makes the mentor matter, and gives progress that is earned by doing something specific | An overall character level |

## The story

| Decision | Why | What was turned down |
| --- | --- | --- |
| Restoration: the hero comes home and frees the valley place by place | It turns the core mechanic into the story. Capturing a place already changes how it looks, so the world tells the tale without a quest system | A spreading supernatural threat; rival noble houses |
| The enemies are people, led by a captain who is partly right | A game about bringing a valley home sits badly on faceless villains. Stane stayed when the army left, and kept people fed | Monsters; a plainly evil warlord |
| A beacon called the soldiers away | It mirrors the game's central image. A light took everyone from home; a light brings them back. Hesper's window answers the beacon | No stated cause; a battle |
| The answer: the Crown sold its army to pay its debts | It leaves the door open. Wren may be alive, which gives the game somewhere to go after the castle | The soldiers arrived to an empty castle and scattered in shame; they died saving the capital |
| The first valley never gives the answer | The question should pull the player toward the castle and the next region | Resolving it in the finale |
| Wren's sex is never stated | So the player decides whether Wren was a mother or a father | Choosing one |
| Hesper is an old woman | The mentor we borrowed the feeling from is a gruff old man. This keeps her her own | A male mentor |
| "Hm. That'll do" is said exactly twice | Praise only carries weight if it is rare. It is saved for the shoulder and the window | Using it as her everyday approval |
| Stane yields and walks to the castle | He becomes an uneasy ally in the next region, not a beaten villain. He goes to see what he refused to go and see | Killing him; leaving him in the valley |
| Sixteen named households, one window each | The game is named for those windows. Each should be somebody's, brought home by something specific | Recovery as a number that fills a bar |
| No quest log | The player should learn what people want by listening, and what to do by looking | A list of tasks |

## Fighting

| Decision | Why | What was turned down |
| --- | --- | --- |
| Stealth is rewarded, never required | A loud fight must still be winnable, or one mistake ends an approach | Forced stealth; failing on detection |
| The hero cannot block | A scout's defence is not being there. Evasion and the perfect dodge carry it | A shield or parry |
| Kill or knock out, the player's choice each time | Claude first proposed that nobody dies on screen. Greg disagreed: killing should be possible, and mercy should be a deliberate act with a payoff | Nobody ever dies; everybody simply dies |
| Bandits spared or knocked out may come home, leave, or return to Stane | It gives mercy a risk and a reward, and makes the Stane fight reflect how the player fought the whole valley | Automatic conversion; no consequence |
| Enemies run on daily schedules | A scouting system needs something to scout. When to strike should be a real decision | Enemies who stand at posts until disturbed |
| Difficulty never changes experience, loot, or story | So the pacing holds on every setting and nothing is locked behind a preset | More experience on hard; content gated by difficulty |

## Growing

| Decision | Why | What was turned down |
| --- | --- | --- |
| Every perk can be earned; only some are equipped | Greg's main worry was feeling he had missed out on perks. Slots give a build without locking anything away | A choice between perks at each tier |
| Perks have their own mastery | Free swapping would make perks feel weightless. A perk lived with is stronger than one just slotted | Perks that are simply on or off |
| A skill cap per region | Greg gets bored in Skyrim once his main skills are maxed. The cap rises with the story, so mastery and the ending arrive together | One cap for the whole game; a cap of 99, as in RuneScape |
| Most perks come from the story, not from levels | So the way to grow is to play: free places, pass trials, bring people home | A perk every few levels |
| Nothing is missable | Story-granted perks would otherwise bring back the fear of missing out. Every perk whose teacher can be lost has a fallback | Accepting that choices close doors |
| Experience only from accomplishments | "Levels from damage taken" means standing in a fire to level up | Experience from time spent or harm taken |
| Pacing is enforced by a test | "Aligned with the story" is only a hope unless a bot plays the valley and the levels are checked | Tuning by feel |
| No random stat rolls on gear | Loot should be collected, not gambled on | Randomised bonuses |
| Crowns are spent on rebuilding Wick | To avoid gold piling up with nothing worth buying, the village itself is the thing to spend on | Ever-pricier gear as the only sink |
| People cannot be bought | Bringing someone home should be something the player did, not paid for | Paying to recruit or to restore households |

## How it is built

| Decision | Why | What was turned down |
| --- | --- | --- |
| Rules live in pure, tested code apart from the graphics | It let the game survive a change from 2D to 3D, lets a bot play it, and lets logic be built before the world exists | Logic inside the scenes |
| The design, tasks, and status live in the repo | Greg was relaying files by hand between Claude and Viktor | Chat as the record |
| Claude looks at every visual change before Greg does | Greg would rather cut a rich world back than be shown a bare one and asked to imagine it | Showing each step as it lands |
| The world is built before any enemies, and reviewed against a first-look bar | The first impression decides whether the project is worth continuing | Building all systems thinly at once |
| Progression is built before the finale | Otherwise the valley and the Stane fight would be balanced, then rebalanced once skills and gear existed | The finale as soon as the world could be walked |
| An asset survey before the world | Several things in the design may have no free model. Better to find the gaps before building around them | Discovering gaps as they come up |
| Claude writes the main characters and designs the perks | Dialogue and the feel of a perk are where a build agent is weakest and where the game is won or lost | Leaving all content to the build agent |
| The melody is written as notes and performed by the game | It has to gain an instrument with every lantern, which a finished recording cannot do | Free music tracks |
| Sub-agents build pure logic in parallel; rendering stays in order | Logic does not depend on the world existing; visuals and integration do | Everything in strict sequence; everything in parallel |
